#!/usr/bin/env node
// Cuts a take into the README's media: the heading GIF, captions burned in, and the WebP clips.
// Usage: node cut.mjs <cuts.json> [--out <dir>]
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { renderCaptions } from './lib/captions.mjs';
import { checkCuts, length, readCuts, takeOf } from './lib/cuts.mjs';
import { probeVideo, run } from './lib/run.mjs';

// Whole centiseconds per GIF frame and whole milliseconds per WebP frame, so no frame's delay is rounded.
const GIF_FPS = 10;
const CLIP_FPS = 20;

const { positionals, values } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' } } });
if (positionals.length !== 1) {
  console.error('Usage: node cut.mjs <cuts.json> [--out <dir>]');
  process.exit(2);
}

try {
  const cutsFile = resolve(positionals[0]);
  const out = resolve(values.out ?? join(import.meta.dirname, '../../media', basename(cutsFile, '.json')));
  const cuts = await readCuts(cutsFile);
  const probed = await Promise.all(cuts.takes.map((take) => probeVideo(take.path)));
  checkCuts(cuts, Object.fromEntries(cuts.takes.map((take, i) => [take.name, probed[i].duration])));
  // Every take is the recorder's composition, so all share one frame size; the first gives it.
  const take = probed[0];
  await mkdir(out, { recursive: true });

  await cutGif(cuts, take, cuts.gif, join(out, cuts.gif.file));
  console.log(`${cuts.gif.file}: ${length(cuts.gif.moments)} s`);
  for (const clip of cuts.clips) {
    await cutClip(cuts, take, clip, join(out, clip.file));
    console.log(`${clip.file}: ${length(clip.moments)} s`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

/** The take is the terminal (left half) beside the page (right half); a view keeps one or both. */
function crop(view) {
  return { both: '', terminal: 'crop=iw/2:ih:0:0,', page: 'crop=iw/2:ih:iw/2:0,' }[view ?? 'both'];
}

function frameSize(take, view, width) {
  const sourceWidth = (view ?? 'both') === 'both' ? take.width : take.width / 2;
  return { width, height: Math.round((take.height * width) / sourceWidth / 2) * 2 };
}

/**
 * One filter chain per moment, labelled m0, m1, … Each take is an input in the order listed,
 * split into one copy per moment cut from it.
 */
function momentChains(cuts, moments, view, size, fps) {
  const input = (moment) => cuts.takes.findIndex((take) => take.name === takeOf(cuts, moment));
  const splits = cuts.takes.flatMap((_, t) => {
    const copies = moments.map((m, i) => (input(m) === t ? `[s${i}]` : '')).join('');
    return copies ? [`[${t}:v]split=${copies.split('][').length}${copies}`] : [];
  });
  const chains = moments.map((m, i) =>
    `[s${i}]trim=start=${m.start}:end=${m.end},setpts=PTS-STARTPTS,${crop(view)}scale=${size.width}:${size.height},fps=${fps}[m${i}]`);
  return [...splits, ...chains];
}

function takeInputs(cuts) {
  return cuts.takes.flatMap((take) => ['-i', take.path]);
}

async function cutGif(cuts, take, gif, file) {
  const size = frameSize(take, gif.view, gif.width);
  const work = await mkdtemp(join(tmpdir(), 'btw-cut-'));
  try {
    const captions = await renderCaptions(gif.moments.map((m) => m.caption), { ...size, dir: work });
    const overlays = gif.moments.map((_, i) => `[m${i}][${cuts.takes.length + i}:v]overlay=0:0[o${i}]`);
    const joined = gif.moments.map((_, i) => `[o${i}]`).join('');
    const graph = [
      ...momentChains(cuts, gif.moments, gif.view, size, GIF_FPS),
      ...overlays,
      `${joined}concat=n=${gif.moments.length}:v=1:a=0[cat]`,
      // One palette for the whole GIF, from every pixel of every frame: weighting it to what moves
      // would leave a still scene, such as a page between two clicks, out of the palette.
      '[cat]split[a][b]', '[a]palettegen=stats_mode=full[p]', '[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle[out]',
    ].join(';');
    await run('ffmpeg', [
      '-v', 'error', ...takeInputs(cuts), ...captions.flatMap((c) => ['-i', c]),
      '-filter_complex', graph, '-map', '[out]', '-loop', '0', '-y', file,
    ]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/** Homebrew's ffmpeg has no WebP encoder: ffmpeg writes the frames, img2webp animates them. */
async function cutClip(cuts, take, clip, file) {
  const size = frameSize(take, clip.view, clip.width);
  const work = await mkdtemp(join(tmpdir(), 'btw-clip-'));
  try {
    const joined = clip.moments.map((_, i) => `[m${i}]`).join('');
    const graph = [
      ...momentChains(cuts, clip.moments, clip.view, size, CLIP_FPS),
      `${joined}concat=n=${clip.moments.length}:v=1:a=0[out]`,
    ].join(';');
    await run('ffmpeg', ['-v', 'error', ...takeInputs(cuts), '-filter_complex', graph, '-map', '[out]', join(work, '%05d.png')]);
    const frames = (await readdir(work)).filter((f) => f.endsWith('.png')).sort().map((f) => join(work, f));
    await run('img2webp', ['-loop', '0', '-lossy', '-q', '70', '-m', '4', '-d', String(1000 / CLIP_FPS), ...frames, '-o', file]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
