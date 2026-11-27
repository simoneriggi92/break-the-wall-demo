import { Easing, interpolate, useCurrentFrame } from "remotion";
import { COLORS, MONO, SANS } from "./theme";
import type { PlacedShot } from "./timeline";

export type HeaderLayout = {
  x: number;
  y: number;
  width: number;
  tagSize: number;
  titleSize: number;
  gap: number;
};

const IN = 10;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * The tag and the title of the shot playing: what the viewer should notice. A new title slides in;
 * a shot that keeps the previous title leaves it still.
 */
export const Header = ({
  shots,
  layout,
}: {
  readonly shots: PlacedShot[];
  readonly layout: HeaderLayout;
}) => {
  const frame = useCurrentFrame();
  // The header follows the shot that has fully faded in, so a crossfade does not flicker it.
  const current =
    [...shots].reverse().find((s) => s.newTitle && frame >= s.start) ??
    shots[0];
  const since = frame - current.start;
  const progress = interpolate(since, [0, IN], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: layout.x,
        top: layout.y,
        width: layout.width,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: layout.tagSize,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: COLORS.rust,
          opacity: progress,
          translate: `${(1 - progress) * -24}px 0px`,
        }}
      >
        {current.tag}
      </div>
      <div
        style={{
          marginTop: layout.gap,
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: layout.titleSize,
          lineHeight: 1.06,
          letterSpacing: "-0.025em",
          color: COLORS.ink,
          opacity: progress,
          translate: `0px ${(1 - progress) * 28}px`,
          textWrap: "balance",
        }}
      >
        {current.title.split(/(\/[\w-]+)/).map((part, i) =>
          part.startsWith("/") ? (
            // A command reads as one: typed in the terminal's face, never broken at a hyphen.
            <span
              key={i}
              style={{
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: "0.86em",
                letterSpacing: "-0.03em",
                color: COLORS.rust,
                whiteSpace: "nowrap",
              }}
            >
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </div>
    </div>
  );
};
