import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { before, test } from 'node:test';
import { probe, script, syntheticVideo, tempDir, webpInfo, writeJson } from './helpers.mjs';

let dir;

before(async () => {
  dir = await tempDir();
  // A screen recording: the page (red) on the left half, the terminal (blue) on the right.
  await syntheticVideo(join(dir, 'screen.mp4'), { seconds: 30, width: 1600, height: 1000, stripes: ['red', 'blue'] });
});

/** 8 s of GIF, a moment of each window, and one clip of 6 s; a mask over part of the page. */
const goodCuts = () => ({
  masks: [{ from: 0, to: 30, x: 100, y: 100, w: 400, h: 200, color: '0x00ff00' }],
  gif: {
    file: 'loop.gif', fps: 10,
    moments: [
      { window: 'page', start: 0, end: 4, crop: { x: 0, y: 0, w: 800 }, tag: 'ROUND', caption: 'One question at a time' },
      { window: 'terminal', start: 5, end: 9, crop: { x: 800, y: 0, w: 800 }, tag: 'CLAUDE', caption: 'The answers arrive' },
    ],
  },
  clips: [
    // The terminal's lower half, where the synthetic recording moves: a still clip would be one frame.
    { file: 'ask.webp', fps: 20, moments: [{ window: 'terminal', start: 10, end: 16, crop: { x: 800, y: 500, w: 800 }, tag: 'CLAUDE', caption: 'The answers arrive' }] },
  ],
});

/** The colour of one pixel of a frame, as [red, green, blue]. */
async function pixel(file, at, x, y) {
  const { stdout } = await promisify(execFile)('ffmpeg', [
    '-v', 'error', '-ss', String(at), '-i', file, '-frames:v', '1',
    '-vf', `crop=4:4:${x}:${y},scale=1:1:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
  ], { encoding: 'buffer' });
  return [...stdout.subarray(0, 3)];
}

const near = ([r, g, b], [er, eg, eb]) => Math.abs(r - er) < 60 && Math.abs(g - eg) < 60 && Math.abs(b - eb) < 60;

test('a screen recording becomes a framed GIF and framed WebP clips, each as long as its moments', async () => {
  const cuts = join(dir, 'good.json');
  const out = join(dir, 'out');
  await writeJson(cuts, goodCuts());

  const result = await script('cut-screen.mjs', [cuts, join(dir, 'screen.mp4'), '--out', out]);

  assert.equal(result.code, 0, result.stderr);
  const gif = await probe(join(out, 'loop.gif'));
  assert.ok(Math.abs(gif.duration - 8) < 0.2, `GIF lasts ${gif.duration} s`);
  assert.deepEqual([gif.width, gif.height], [960, 540]);
  // Inside the window, below the mask: the page's red, then the terminal's blue.
  assert.ok(near(await pixel(join(out, 'loop.gif'), 2, 480, 400), [255, 0, 0]), 'page moment shows the page');
  assert.ok(near(await pixel(join(out, 'loop.gif'), 6, 480, 400), [0, 0, 255]), 'terminal moment shows the terminal');
  // Outside the window: the colour field, not the recording.
  assert.ok(!near(await pixel(join(out, 'loop.gif'), 2, 20, 270), [255, 0, 0]), 'the field surrounds the window');

  const clip = await webpInfo(join(out, 'ask.webp'));
  assert.ok(Math.abs(clip.duration - 6) < 0.2, `clip lasts ${clip.duration} s`);
  assert.deepEqual([clip.width, clip.height], [960, 540]);
});

test('a mask hides its region of the recording wherever its time meets a moment', async () => {
  const cuts = join(dir, 'masked.json');
  const out = join(dir, 'masked');
  await writeJson(cuts, goodCuts());

  const result = await script('cut-screen.mjs', [cuts, join(dir, 'screen.mp4'), '--out', out]);

  assert.equal(result.code, 0, result.stderr);
  // The mask covers x 100–500, y 100–300 of the page; scaled by 736/800 into the window at (112, 30).
  const masked = await pixel(join(out, 'loop.gif'), 2, 300, 200);
  assert.ok(near(masked, [0, 255, 0]), `masked region shows ${masked}`);
});

const refusals = [
  ['a clip shorter than 5 s', (c) => { c.clips[0].moments[0].end = 14; }, 'ask.webp lasts 4 s: a clip must last 5 to 8 s.'],
  ['moments that go back in time', (c) => { c.gif.moments.reverse(); }, 'loop.gif, moment 2: it starts at 0 s, before moment 1 ends at 9 s. Moments follow the recording in order.'],
  ['a moment past the end of the recording', (c) => { c.clips[0].moments[0] = { ...c.clips[0].moments[0], start: 26, end: 32 }; }, 'ask.webp, moment 1: it ends at 32 s, past the end of the recording at 30 s.'],
  ['a moment without a tag', (c) => { delete c.gif.moments[1].tag; }, 'loop.gif, moment 2: a moment needs a tag and a caption.'],
  ['a crop outside the recording', (c) => { c.gif.moments[1].crop.x = 900; }, 'loop.gif, moment 2: the crop must lie inside the 1600×1000 recording.'],
  ['a crop that scrolls past the bottom', (c) => { c.gif.moments[0].crop.scrollTo = 600; }, 'loop.gif, moment 1: the crop must lie inside the 1600×1000 recording.'],
];

for (const [name, change, reason] of refusals) {
  test(`a cuts file with ${name} is refused with its reason, and nothing is written`, async () => {
    const cuts = goodCuts();
    change(cuts);
    const file = join(dir, `bad-${name.replaceAll(' ', '-')}.json`);
    const out = join(dir, `out-${name.replaceAll(' ', '-')}`);
    await writeJson(file, cuts);

    const result = await script('cut-screen.mjs', [file, join(dir, 'screen.mp4'), '--out', out]);

    assert.equal(result.code, 1);
    assert.equal(result.stderr.trim(), reason);
    await assert.rejects(access(out));
  });
}
