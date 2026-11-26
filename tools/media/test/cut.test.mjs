import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { before, test } from 'node:test';
import { cornerColor, probe, script, syntheticVideo, tempDir, webpInfo, writeJson } from './helpers.mjs';

let dir;

before(async () => {
  dir = await tempDir();
  // A take as the recorder composes it: the terminal and the page side by side, 1280×800 each.
  await syntheticVideo(join(dir, 'take.mp4'), { seconds: 60, width: 2560, height: 800 });
  // A second take, recorded later in the same session: the spec's review redone on its own.
  await syntheticVideo(join(dir, 'spec.mp4'), { seconds: 20, width: 2560, height: 800, color: 'magenta' });
});

/** A cuts file that keeps 30 s of the takes for the GIF and 6 s for each clip. */
const goodCuts = () => ({
  takes: { full: 'take.mp4', spec: 'spec.mp4' },
  gif: {
    file: 'loop.gif',
    width: 960,
    moments: [
      { start: 1, end: 9, caption: 'Type /break-the-wall' },
      { start: 12, end: 22, caption: 'Answer one question at a time' },
      { take: 'spec', start: 2, end: 14, caption: 'Check the spec, then approve' },
    ],
  },
  clips: [
    { file: 'answer.webp', view: 'page', width: 640, moments: [{ start: 12, end: 18 }] },
    { file: 'ask.webp', view: 'page', width: 640, moments: [{ start: 20, end: 23 }, { start: 25, end: 28 }] },
    { file: 'approve.webp', view: 'both', width: 960, moments: [{ take: 'spec', start: 14, end: 20 }] },
  ],
});

test('a cuts file becomes one GIF and its WebP clips, each as long as its moments, from one take or several', async () => {
  const cuts = join(dir, 'good.json');
  const out = join(dir, 'out');
  await writeJson(cuts, goodCuts());

  const result = await script('cut.mjs', [cuts, '--out', out]);

  assert.equal(result.code, 0, result.stderr);
  const gif = await probe(join(out, 'loop.gif'));
  assert.ok(Math.abs(gif.duration - 30) < 0.2, `GIF lasts ${gif.duration} s`);
  assert.deepEqual([gif.width, gif.height], [960, 300]);
  // The GIF's last 12 s come from the second take, which is all magenta.
  const [red, green, blue] = await cornerColor(join(out, 'loop.gif'), 24);
  assert.ok(red > 200 && green < 60 && blue > 200, `frame at 24 s is ${[red, green, blue]}`);

  const answer = await webpInfo(join(out, 'answer.webp'));
  const ask = await webpInfo(join(out, 'ask.webp'));
  const approve = await webpInfo(join(out, 'approve.webp'));
  assert.ok(Math.abs(answer.duration - 6) < 0.2, `answer lasts ${answer.duration} s`);
  assert.ok(Math.abs(ask.duration - 6) < 0.2, `ask lasts ${ask.duration} s`);
  assert.ok(Math.abs(approve.duration - 6) < 0.2, `approve lasts ${approve.duration} s`);
  // "page" keeps the right half of the take: 1280×800, scaled to 640 wide.
  assert.deepEqual([answer.width, answer.height], [640, 400]);
  assert.deepEqual([approve.width, approve.height], [960, 300]);
});

const refusals = [
  ['a GIF shorter than 25 s', (c) => { c.gif.moments.pop(); }, 'The GIF lasts 18 s: it must last 25 to 35 s.'],
  ['a GIF longer than 35 s', (c) => { c.gif.moments.push({ take: 'spec', start: 14, end: 20, caption: 'More' }); }, 'The GIF lasts 36 s: it must last 25 to 35 s.'],
  ['a clip shorter than 5 s', (c) => { c.clips[0].moments[0].end = 16; }, 'answer.webp lasts 4 s: a clip must last 5 to 8 s.'],
  ['a clip longer than 8 s', (c) => { c.clips[2].moments[0] = { take: 'spec', start: 11, end: 20 }; }, 'approve.webp lasts 9 s: a clip must last 5 to 8 s.'],
  ['a moment that ends before it starts', (c) => { c.clips[0].moments[0] = { start: 18, end: 12 }; }, 'answer.webp, moment 1: it ends at 12 s, before its start at 18 s.'],
  ['moments that go back in time', (c) => { c.clips[1].moments.reverse(); }, 'ask.webp, moment 2: it starts at 20 s, before moment 1 ends at 28 s. Moments follow the take in order.'],
  ['a moment past the end of its take', (c) => { c.clips[2].moments[0] = { take: 'spec', start: 16, end: 22 }; }, 'approve.webp, moment 1: it ends at 22 s, past the end of take "spec" at 20 s.'],
  ['a moment naming no take', (c) => { c.clips[2].moments[0].take = 'specs'; }, 'approve.webp, moment 1: no take is named "specs".'],
  ['a moment that goes back to an earlier take', (c) => { c.gif.moments.push({ take: 'full', start: 50, end: 52, caption: 'Back' }); }, 'loop.gif, moment 4: it goes back to take "full" after take "spec". Takes follow in the order they are listed.'],
  ['a GIF moment without a caption', (c) => { delete c.gif.moments[1].caption; }, 'loop.gif, moment 2: a GIF moment needs a caption.'],
  ['an unknown view', (c) => { c.clips[0].view = 'left'; }, 'answer.webp: view must be "both", "terminal" or "page".'],
];

for (const [name, change, reason] of refusals) {
  test(`a cuts file with ${name} is refused with its reason, and nothing is written`, async () => {
    const cuts = goodCuts();
    change(cuts);
    const file = join(dir, `bad-${name.replaceAll(' ', '-')}.json`);
    const out = join(dir, `out-${name.replaceAll(' ', '-')}`);
    await writeJson(file, cuts);

    const result = await script('cut.mjs', [file, '--out', out]);

    assert.equal(result.code, 1);
    assert.equal(result.stderr.trim(), reason);
    await assert.rejects(access(out));
  });
}
