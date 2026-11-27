#!/usr/bin/env node
// Turns the macOS screen recording into the proxy the video plays: public/recording.mp4.
// The masks of cuts/screen.json are burnt in before anything else, so the page's address,
// which carries a session token, never reaches a file of this project.
// Scaled to 3072 px wide so Chrome can decode it (4096×2498 is past H.264 level 5.2), at 30 fps
// with a keyframe every second so Studio and the renderer seek quickly. Times stay the
// recording's own: a moment of cuts/screen.json plays at the same second here.
// Usage: node scripts/proxy.mjs <recording.mov>
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const recording = process.argv[2];
if (!recording) {
  console.error('Usage: node scripts/proxy.mjs <recording.mov>');
  process.exit(2);
}

const root = resolve(import.meta.dirname, '..');
const cuts = JSON.parse(readFileSync(join(root, '../../cuts/screen.json'), 'utf8'));
const masks = cuts.masks.map(
  (m) => `drawbox=x=${m.x}:y=${m.y}:w=${m.w}:h=${m.h}:color=${m.color}:t=fill:enable='between(t,${m.from},${m.to})'`,
);
const filter = [...masks, 'fps=30', 'scale=3072:-2:flags=lanczos'].join(',');

const out = join(root, 'public/recording.mp4');
const result = spawnSync(
  'ffmpeg',
  ['-v', 'error', '-stats', '-y', '-i', resolve(recording), '-vf', filter, '-an',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-g', '30', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', out],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
