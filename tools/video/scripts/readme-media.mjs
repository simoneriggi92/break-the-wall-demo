#!/usr/bin/env node
// Renders the Readme compositions and encodes them as the README's media, the same names and size
// as tools/media/cut-screen.mjs wrote (960×540), in out/readme/:
// - use-in-claude-code.gif: GIF holds 256 colours at most and stores every changed pixel; the cut's
//   camera moves and crossfades change most pixels, so 8 fps and a 128-colour palette, without
//   dithering, keep it near 8 MB.
// - use-in-claude-code.webp: the same video as an animated WebP, 12 fps, about 3 MB and sharper.
// - the three clips, as WebP at 15 fps.
// Homebrew's ffmpeg has no WebP encoder, so ffmpeg writes the frames and img2webp animates them.
// Usage: node scripts/readme-media.mjs [--to <folder>]   (--to also copies the files there)
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { to: { type: 'string' } } });
const root = resolve(import.meta.dirname, '..');
const out = join(root, 'out/readme');
mkdirSync(out, { recursive: true });

const WIDTH = 960;
const MEDIA = [
  { composition: 'Readme', files: [{ file: 'use-in-claude-code.gif', fps: 8 }, { file: 'use-in-claude-code.webp', fps: 12 }] },
  { composition: 'ReadmeAnswer', files: [{ file: 'answer-one-question.webp', fps: 15 }] },
  { composition: 'ReadmeAsk', files: [{ file: 'ask-beside-the-question.webp', fps: 15 }] },
  { composition: 'ReadmeCheck', files: [{ file: 'check-the-spec-then-approve.webp', fps: 15 }] },
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const { composition, files } of MEDIA) {
  const video = join(out, `${composition}.mp4`);
  run('npx', ['remotion', 'render', 'src/index.ts', composition, video, '--codec=h264', '--crf=14', '--log=error']);
  for (const { file, fps } of files) {
    const target = join(out, file);
    const scale = `fps=${fps},scale=${WIDTH}:-1:flags=lanczos`;
    if (file.endsWith('.gif')) {
      run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-filter_complex',
        `${scale},split[a][b];[a]palettegen=stats_mode=diff:max_colors=128[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`,
        target]);
    } else {
      const frames = mkdtempSync(join(tmpdir(), 'btw-webp-'));
      try {
        run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', scale, join(frames, '%04d.png')]);
        const pngs = readdirSync(frames).sort().map((f) => join(frames, f));
        run('img2webp', ['-loop', '0', '-lossy', '-q', '70', '-m', '6', '-d', String(Math.round(1000 / fps)), ...pngs, '-o', target]);
      } finally {
        rmSync(frames, { recursive: true, force: true });
      }
    }
    console.log(`${file}: ${Math.round(statSync(target).size / 1024)} KB`);
    if (values.to) copyFileSync(target, join(resolve(values.to), file));
  }
}
