import { Fragment } from "react";
import { useCurrentFrame } from "remotion";
import { STAGES } from "./cut";
import { COLORS, MONO } from "./theme";
import type { PlacedShot } from "./timeline";

/** The loop's six stages along the bottom, the one playing marked: where we are in the workflow. */
export const LoopStrip = ({
  shots,
  y,
  size,
  width,
}: {
  readonly shots: PlacedShot[];
  readonly y: number;
  readonly size: number;
  readonly width: number;
}) => {
  const frame = useCurrentFrame();
  const playing =
    [...shots].reverse().find((s) => frame >= s.start) ?? shots[0];
  const index = STAGES.findIndex((s) => s.id === playing.stage);

  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 0,
        width,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: size * 0.55,
        fontFamily: MONO,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {STAGES.map((stage, i) => (
        <Fragment key={stage.id}>
          {i > 0 ? (
            <span style={{ color: i <= index ? COLORS.rust : COLORS.line }}>
              →
            </span>
          ) : null}
          <span
            style={{
              padding: `${size * 0.22}px ${size * 0.42}px`,
              borderRadius: size * 0.2,
              color:
                i === index
                  ? COLORS.paper
                  : i < index
                    ? COLORS.ink
                    : COLORS.faint,
              backgroundColor: i === index ? COLORS.rust : "transparent",
            }}
          >
            {stage.label}
          </span>
        </Fragment>
      ))}
    </div>
  );
};
