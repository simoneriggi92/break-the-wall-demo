import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { run } from './run.mjs';

/**
 * Composes a take from its two recordings: the terminal on the left, the page on the right,
 * on one timeline, at the recordings' own size (both are recorded alike). Each recording started on its own instant (`startedAt`, milliseconds on the
 * wall clock), so each is trimmed to begin at the later of the two: from then on, a frame on
 * the left and the frame beside it show the same moment. The marks move onto that timeline.
 */
export async function compose(takeDir) {
  const timeline = JSON.parse(await readFile(join(takeDir, 'timeline.json'), 'utf8'));
  const sides = [timeline.terminal, timeline.page];
  for (const side of sides) {
    if (typeof side?.video !== 'string' || typeof side.startedAt !== 'number') {
      throw new Error(`${takeDir}/timeline.json: "terminal" and "page" each name a video and its startedAt.`);
    }
  }
  const start = Math.max(...sides.map((side) => side.startedAt));

  // The first setpts makes each recording's clock start at zero, whatever its container says,
  // so trimming by seconds trims from the recording's first frame.
  const chain = (side, input, label) =>
    `[${input}:v]setpts=PTS-STARTPTS,trim=start=${(start - side.startedAt) / 1000},setpts=PTS-STARTPTS,fps=25[${label}]`;
  const graph = [chain(timeline.terminal, 0, 'left'), chain(timeline.page, 1, 'right'), '[left][right]hstack=inputs=2:shortest=1[out]'].join(';');
  const take = join(takeDir, 'take.mp4');
  await run('ffmpeg', [
    '-v', 'error', '-i', resolve(takeDir, timeline.terminal.video), '-i', resolve(takeDir, timeline.page.video),
    '-filter_complex', graph, '-map', '[out]', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-y', take,
  ]);

  const marks = (timeline.marks ?? []).map((mark) => ({ at: Number(((mark.at - start) / 1000).toFixed(2)), label: mark.label }));
  await writeFile(join(takeDir, 'marks.json'), `${JSON.stringify(marks, null, 2)}\n`);
  return { take, marks };
}
