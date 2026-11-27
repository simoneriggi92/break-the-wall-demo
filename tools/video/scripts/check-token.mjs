#!/usr/bin/env node
// Looks for the page's address, which carries a session token, in every second the cut plays.
// It samples each shot of src/cut.ts from the proxy at 8 frames a second and reads them with
// macOS's text recognition. It exits 1 and names the seconds when the address shows, so the
// cut or the masks can be fixed before anything is rendered and shared.
// Usage: node scripts/check-token.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const proxy = join(root, 'public/recording.mp4');
const FPS = 8;

// The cut is TypeScript; its shots' times are plain literals, so read them without compiling.
const source = readFileSync(join(root, 'src/cut.ts'), 'utf8');
const ranges = [...source.matchAll(/from: ([\d.]+),\s*\n\s*to: ([\d.]+),/g)].map((m) => [Number(m[1]), Number(m[2])]);
if (ranges.length === 0) throw new Error('No shots found in src/cut.ts');

const dir = mkdtempSync(join(tmpdir(), 'btw-token-'));
try {
  for (const [index, [from, to]] of ranges.entries()) {
    const done = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(from), '-t', String(to - from), '-i', proxy,
      '-vf', `fps=${FPS}`, join(dir, `s${String(index).padStart(2, '0')}_%04d.png`)]);
    if (done.status !== 0) throw new Error(done.stderr.toString());
  }
  const found = spawnSync('swift', [join(root, 'scripts/find-token.swift'), dir], { encoding: 'utf8' });
  if (found.status !== 0) throw new Error(found.stderr);
  const hits = found.stdout.trim().split('\n').filter(Boolean).map((file) => {
    const [, shot, n] = file.match(/s(\d+)_(\d+)/);
    const [from] = ranges[Number(shot)];
    return `shot ${Number(shot) + 1}, ${(from + (Number(n) - 1) / FPS).toFixed(2)} s`;
  });
  if (hits.length) {
    console.error(`The page's address shows in:\n${hits.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(`No address in ${ranges.length} shots.`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
