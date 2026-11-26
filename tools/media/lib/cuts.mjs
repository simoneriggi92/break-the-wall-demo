import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/** The lengths the README's media are made for (#131): a heading GIF, and short clips beside text. */
const GIF_SECONDS = [25, 35];
const CLIP_SECONDS = [5, 8];
const VIEWS = ['both', 'terminal', 'page'];

/**
 * A cuts file: which moments of its takes make the heading GIF and each clip.
 * The takes are named in the order they were recorded, all from one session; a moment
 * names its take, or is from the first. Times are seconds into that take. A moment's start
 * and end bound one real event; the gaps between moments are the waits that are cut, so
 * the cut only moves forward: in time within a take, and from one take to a later one.
 */
export async function readCuts(file) {
  const cuts = JSON.parse(await readFile(file, 'utf8'));
  const named = cuts.takes && typeof cuts.takes === 'object' ? Object.entries(cuts.takes) : [];
  if (named.length === 0 || named.some(([, path]) => typeof path !== 'string') || !cuts.gif || !Array.isArray(cuts.clips)) {
    throw new Error(`${file}: a cuts file names its "takes" and holds a "gif" and a list of "clips".`);
  }
  return { ...cuts, takes: named.map(([name, path]) => ({ name, path: resolve(dirname(file), path) })) };
}

/** The take a moment is from: the one it names, or the first. */
export const takeOf = (cuts, moment) => moment.take ?? cuts.takes[0].name;

/** Throws the first rule the cuts break, in words the person can act on. `seconds` maps each take's name to its length. */
export function checkCuts(cuts, seconds) {
  const order = cuts.takes.map((take) => take.name);
  checkMedium(cuts.gif, { cuts, order, seconds, captions: true, bounds: GIF_SECONDS, name: 'The GIF', rule: 'it must last' });
  for (const clip of cuts.clips) {
    checkMedium(clip, { cuts, order, seconds, captions: false, bounds: CLIP_SECONDS, name: clip.file, rule: 'a clip must last' });
  }
}

export const length = (moments) => Number(moments.reduce((sum, m) => sum + (m.end - m.start), 0).toFixed(2));

function checkMedium(medium, { cuts, order, seconds: takeSeconds, captions, bounds, name, rule }) {
  const label = medium.file;
  if (typeof label !== 'string' || !Number.isInteger(medium.width) || medium.width < 2 || !Array.isArray(medium.moments) || medium.moments.length === 0) {
    throw new Error(`${label ?? name}: each medium has a "file", a whole "width" and at least one moment.`);
  }
  if (medium.view !== undefined && !VIEWS.includes(medium.view)) {
    throw new Error(`${label}: view must be "both", "terminal" or "page".`);
  }
  medium.moments.forEach((moment, index) => {
    const at = `${label}, moment ${index + 1}`;
    if (typeof moment.start !== 'number' || typeof moment.end !== 'number' || moment.start < 0) {
      throw new Error(`${at}: "start" and "end" are seconds into the take.`);
    }
    if (moment.end <= moment.start) {
      throw new Error(`${at}: it ends at ${moment.end} s, before its start at ${moment.start} s.`);
    }
    const take = takeOf(cuts, moment);
    if (!order.includes(take)) {
      throw new Error(`${at}: no take is named "${take}".`);
    }
    const previous = medium.moments[index - 1];
    const previousTake = previous && takeOf(cuts, previous);
    if (previous && order.indexOf(take) < order.indexOf(previousTake)) {
      throw new Error(`${at}: it goes back to take "${take}" after take "${previousTake}". Takes follow in the order they are listed.`);
    }
    if (previous && take === previousTake && moment.start < previous.end) {
      throw new Error(`${at}: it starts at ${moment.start} s, before moment ${index} ends at ${previous.end} s. Moments follow the take in order.`);
    }
    if (moment.end > takeSeconds[take]) {
      throw new Error(`${at}: it ends at ${moment.end} s, past the end of take "${take}" at ${Number(takeSeconds[take].toFixed(2))} s.`);
    }
    if (captions && (typeof moment.caption !== 'string' || moment.caption.trim() === '')) {
      throw new Error(`${at}: a GIF moment needs a caption.`);
    }
  });
  const seconds = length(medium.moments);
  if (seconds < bounds[0] || seconds > bounds[1]) {
    throw new Error(`${name} lasts ${seconds} s: ${rule} ${bounds[0]} to ${bounds[1]} s.`);
  }
}
