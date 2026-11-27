import { CUT, type Output, type Shot } from "./cut";

/** Frames two shots overlap when the second does not continue the first: a short crossfade. */
export const CROSSFADE = 6;
export const OUTRO_SECONDS = 4;

export type PlacedShot = Shot & {
  /** First frame in the composition. */
  start: number;
  frames: number;
  /** Frames this shot fades in over the previous one; 0 for a continuous cut. */
  fadeIn: number;
  /** Whether the header changes on this shot. */
  newTitle: boolean;
};

/**
 * Places the cut's shots on the composition's frames. A shot that picks up where the previous one
 * stopped follows it directly; any other overlaps it by a crossfade.
 */
export function placeShots(
  fps: number,
  output: Output = "video",
  cut: Shot[] = CUT,
): PlacedShot[] {
  const placed: PlacedShot[] = [];
  for (const shot of cut.filter((s) => (s.in ?? ["video"]).includes(output))) {
    const previous = placed.at(-1);
    const frames = Math.round(((shot.to - shot.from) / shot.rate) * fps);
    const continuous =
      previous !== undefined && Math.abs(previous.to - shot.from) < 0.2;
    const fadeIn = previous && !continuous ? CROSSFADE : 0;
    const start = previous ? previous.start + previous.frames - fadeIn : 0;
    const newTitle =
      previous?.title !== shot.title || previous?.tag !== shot.tag;
    placed.push({ ...shot, start, frames, fadeIn, newTitle });
  }
  return placed;
}

export function shotsFrames(shots: PlacedShot[]): number {
  const last = shots.at(-1);
  return last ? last.start + last.frames : 0;
}
