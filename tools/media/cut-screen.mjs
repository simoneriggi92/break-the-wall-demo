#!/usr/bin/env node
// Cuts a screen recording of a session, Claude Code and Break the Wall's page side by side on one
// screen, into the README's media: the heading GIF and the WebP clips, each moment framed as a
// window with a tagged caption, in the style of Break the Wall's own README.
// Usage: node cut-screen.mjs <cuts.json> <recording> [--out <dir>]
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { CANVAS, CONTENT, renderFrames } from './lib/frame.mjs';
import { probeVideo, run } from './lib/run.mjs';

const CLIP_SECONDS = [5, 8];
const WINDOWS = ['page', 'terminal', 'both'];

const { positionals, values } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' } } });
if (positionals.length !== 2) {
  console.error('Usage: node cut-screen.mjs <cuts.json> <recording> [--out <dir>]');
  process.exit(2);
}

try {
  const cutsFile = resolve(positionals[0]);
  const recording = resolve(positionals[1]);
  const out = resolve(values.out ?? join(import.meta.dirname, '../../media', basename(cutsFile, '.json')));
  const cuts = JSON.parse(await readFile(cutsFile, 'utf8'));
  const screen = await probeVideo(recording);
  checkCuts(cuts, screen);
  await mkdir(out, { recursive: true });

  await cutGif(cuts, recording, join(out, cuts.gif.file));
  console.log(`${cuts.gif.file}: ${length(cuts.gif.moments)} s`);
  for (const clip of cuts.clips) {
    await cutClip(cuts, recording, clip, join(out, clip.file));
    console.log(`${clip.file}: ${length(clip.moments)} s`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function length(moments) {
  return Number(moments.reduce((sum, m) => sum + (m.end - m.start), 0).toFixed(2));
}

/** A crop keeps the content's 16:10, unless it names its height: the whole screen is a hair wider. */
function cropHeight(crop) {
  return crop.h ?? Math.round((crop.w * CONTENT.height) / CONTENT.width);
}

/** Throws the first rule the cuts break, in words the person can act on. */
function checkCuts(cuts, screen) {
  if (!cuts.gif || !Array.isArray(cuts.clips)) {
    throw new Error('A cuts file holds a "gif" and a list of "clips".');
  }
  for (const medium of [cuts.gif, ...cuts.clips]) {
    if (typeof medium.file !== 'string' || !Number.isInteger(medium.fps) || !Array.isArray(medium.moments) || medium.moments.length === 0) {
      throw new Error(`${medium.file ?? 'A medium'}: each medium has a "file", a whole "fps" and at least one moment.`);
    }
    medium.moments.forEach((m, index) => {
      const at = `${medium.file}, moment ${index + 1}`;
      if (m.end <= m.start) throw new Error(`${at}: it ends at ${m.end} s, before its start at ${m.start} s.`);
      const previous = medium.moments[index - 1];
      if (previous && m.start < previous.end) {
        throw new Error(`${at}: it starts at ${m.start} s, before moment ${index} ends at ${previous.end} s. Moments follow the recording in order.`);
      }
      if (m.end > screen.duration) {
        throw new Error(`${at}: it ends at ${m.end} s, past the end of the recording at ${Number(screen.duration.toFixed(2))} s.`);
      }
      if (!WINDOWS.includes(m.window)) throw new Error(`${at}: window must be "page", "terminal" or "both".`);
      if (typeof m.tag !== 'string' || !m.tag.trim() || typeof m.caption !== 'string' || !m.caption.trim()) {
        throw new Error(`${at}: a moment needs a tag and a caption.`);
      }
      const { x, y, w } = m.crop ?? {};
      const bottom = Math.max(y, m.crop?.scrollTo ?? y) + cropHeight(m.crop ?? {});
      if (![x, y, w].every((n) => Number.isFinite(n) && n >= 0) || x + w > screen.width || bottom > screen.height) {
        throw new Error(`${at}: the crop must lie inside the ${screen.width}×${screen.height} recording.`);
      }
    });
  }
  for (const clip of cuts.clips) {
    const seconds = length(clip.moments);
    if (seconds < CLIP_SECONDS[0] || seconds > CLIP_SECONDS[1]) {
      throw new Error(`${clip.file} lasts ${seconds} s: a clip must last ${CLIP_SECONDS[0]} to ${CLIP_SECONDS[1]} s.`);
    }
  }
}

/**
 * A crop can scroll down while its moment plays, as a reader would, so a button below the fold
 * comes into view without zooming in: from its y to "scrollTo", starting at "scrollAt" seconds,
 * at "scrollSpeed" pixels of the recording a second.
 */
function cropY({ y, scrollTo, scrollAt = 0, scrollSpeed = 300 }) {
  return scrollTo === undefined ? y : `'min(${scrollTo}\\,max(${y}\\,${y}+(t-${scrollAt})*${scrollSpeed}))'`;
}

/**
 * Each moment is an input of its own, sought to its start, so a long recording is never decoded
 * whole. Masks hide what must not be published (the page's address carries a session token)
 * on the recording's own pixels, before any crop, wherever their time meets the moment.
 */
async function framedMoments(cuts, recording, medium, work) {
  const frames = await renderFrames(medium.moments, work);
  const n = medium.moments.length;
  const count = (m) => Math.round((m.end - m.start) * medium.fps);
  const inputs = medium.moments.flatMap((m) => ['-ss', String(m.start), '-t', String(m.end - m.start + 0.5), '-i', recording]);
  const chains = medium.moments.map((m, i) => {
    const masks = (cuts.masks ?? [])
      .filter((k) => k.from < m.end && k.to > m.start)
      .map((k) => `drawbox=x=${k.x}:y=${k.y}:w=${k.w}:h=${k.h}:color=${k.color}:t=fill,`)
      .join('');
    return [
      `[${i}:v]setpts=PTS-STARTPTS,${masks}crop=${m.crop.w}:${cropHeight(m.crop)}:${m.crop.x}:${cropY(m.crop)},scale=${CONTENT.width}:${CONTENT.height}:flags=lanczos,fps=${medium.fps},trim=end_frame=${count(m)},setpts=PTS-STARTPTS[v${i}]`,
      `color=c=black:s=${CANVAS.width}x${CANVAS.height}:r=${medium.fps}[k${i}]`,
      `[k${i}][v${i}]overlay=${CONTENT.x}:${CONTENT.y}:shortest=1[c${i}]`,
      `[c${i}][${n + i}:v]overlay=0:0[o${i}]`,
    ].join(';');
  });
  return {
    inputs: [...inputs, ...frames.flatMap((f) => ['-i', f])],
    graph: [...chains, `${medium.moments.map((_, i) => `[o${i}]`).join('')}concat=n=${n}:v=1:a=0[cat]`],
  };
}

async function cutGif(cuts, recording, file) {
  const work = await mkdtemp(join(tmpdir(), 'btw-screen-'));
  try {
    const { inputs, graph } = await framedMoments(cuts, recording, cuts.gif, work);
    const palette = [
      // One palette for the whole GIF, from every pixel of every frame.
      '[cat]split[a][b]', '[a]palettegen=stats_mode=full[p]',
      '[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle[out]',
    ];
    await run('ffmpeg', ['-nostdin', '-v', 'error', ...inputs, '-filter_complex', [...graph, ...palette].join(';'),
      '-map', '[out]', '-loop', '0', '-y', file]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/** Homebrew's ffmpeg has no WebP encoder: ffmpeg writes the frames, img2webp animates them. */
async function cutClip(cuts, recording, clip, file) {
  const work = await mkdtemp(join(tmpdir(), 'btw-screen-clip-'));
  try {
    const { inputs, graph } = await framedMoments(cuts, recording, clip, work);
    await run('ffmpeg', ['-nostdin', '-v', 'error', ...inputs, '-filter_complex', graph.join(';'),
      '-map', '[cat]', join(work, '%05d.png')]);
    const frames = (await readdir(work)).filter((f) => /^\d+\.png$/.test(f)).sort().map((f) => join(work, f));
    await run('img2webp', ['-loop', '0', '-lossy', '-q', '75', '-m', '4', '-d', String(1000 / clip.fps), ...frames, '-o', file]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
