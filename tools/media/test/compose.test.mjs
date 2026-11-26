import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { probe, script, tempDir, writeJson } from './helpers.mjs';

const run = promisify(execFile);

/** A recording as Playwright writes one (VP8 in WebM, 1280×800), red until `redFor`, then blue. */
async function recording(file, { redFor, seconds }) {
  await run('ffmpeg', [
    '-v', 'error', '-filter_complex',
    `color=red:s=1280x800:r=25:d=${redFor}[a];color=blue:s=1280x800:r=25:d=${seconds - redFor}[b];[a][b]concat=n=2:v=1[out]`,
    '-map', '[out]', '-c:v', 'libvpx', '-b:v', '200k', '-y', file,
  ]);
}

/** The colour at the centre of the left and right halves of a frame, as [red, green, blue]. */
async function halves(file, at) {
  const { stdout } = await run('ffmpeg', [
    '-v', 'error', '-ss', String(at), '-i', file, '-frames:v', '1',
    '-vf', 'scale=2:1:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
  ], { encoding: 'buffer' });
  return { left: [...stdout.subarray(0, 3)], right: [...stdout.subarray(3, 6)] };
}

const isRed = ([r, , b]) => r > 200 && b < 60;
const isBlue = ([r, , b]) => b > 200 && r < 60;

test('the terminal and the page are composed side by side on one timeline, with the marks on it', async () => {
  const dir = await tempDir();
  // The page's recording started 2 s after the terminal's. Both turn blue at the same instant,
  // 6 s on the clock: 5 s into the terminal's recording, 3 s into the page's.
  await recording(join(dir, 'terminal.webm'), { redFor: 5, seconds: 10 });
  await recording(join(dir, 'page.webm'), { redFor: 3, seconds: 10 });
  await writeJson(join(dir, 'timeline.json'), {
    terminal: { video: 'terminal.webm', startedAt: 1_000 },
    page: { video: 'page.webm', startedAt: 3_000 },
    marks: [{ at: 4_500, label: 'answers sent' }, { at: 9_000, label: 'spec opens' }],
  });

  const result = await script('compose.mjs', [dir]);

  assert.equal(result.code, 0, result.stderr);
  const take = join(dir, 'take.mp4');
  const info = await probe(take);
  assert.deepEqual([info.width, info.height], [2560, 800]);
  // The composed take starts when both recordings run, 3 s in, and ends with the first to stop, at 11 s.
  assert.ok(Math.abs(info.duration - 8) < 0.15, `take lasts ${info.duration} s`);
  // Blue arrives at 6 s on the clock, 3 s into the take, on both halves at once.
  const before = await halves(take, 2.6);
  const after = await halves(take, 3.4);
  assert.ok(isRed(before.left) && isRed(before.right), `before: ${JSON.stringify(before)}`);
  assert.ok(isBlue(after.left) && isBlue(after.right), `after: ${JSON.stringify(after)}`);

  const marks = JSON.parse(await readFile(join(dir, 'marks.json'), 'utf8'));
  assert.deepEqual(marks, [{ at: 1.5, label: 'answers sent' }, { at: 6, label: 'spec opens' }]);
});
