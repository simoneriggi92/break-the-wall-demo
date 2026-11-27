import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Mark } from "./Mark";
import { COLORS, MONO, SANS } from "./theme";

/** The closing card: the name, the promise, and the two commands that install it. */
export const Outro = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 80px",
        gap: 44,
        opacity: interpolate(frame, [0, 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          translate: interpolate(frame, [0, 14], ["0px 30px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Mark height={104} />
        <Interactive.Div
          name="Outro name"
          style={{
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 100,
            letterSpacing: "-0.035em",
            color: COLORS.ink,
          }}
        >
          Break the Wall
        </Interactive.Div>
      </div>
      <Interactive.Div
        name="Outro promise"
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 54,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          color: COLORS.ink,
          opacity: interpolate(frame, [6, 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Answer your agent's questions one at a time. Check the spec they lead
        to, line by line.
      </Interactive.Div>
      <div
        style={{
          backgroundColor: COLORS.terminal,
          borderRadius: 18,
          padding: "30px 34px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          fontFamily: MONO,
          fontWeight: 500,
          fontSize: 24,
          color: "#e6e9ef",
          boxShadow: "0 24px 60px rgba(29, 39, 51, 0.25)",
          opacity: interpolate(frame, [14, 26], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [14, 30], ["0px 24px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Interactive.Div name="Install command 1" style={{ color: "#e6e9ef" }}>
          <span style={{ color: COLORS.accent }}>$ </span>claude plugin
          marketplace add simoneriggi92/BreakTheWall
        </Interactive.Div>
        <Interactive.Div name="Install command 2" style={{ color: "#e6e9ef" }}>
          <span style={{ color: COLORS.accent }}>$ </span>claude plugin install
          break-the-wall@break-the-wall
        </Interactive.Div>
      </div>
      <Interactive.Div
        name="Outro footer"
        style={{
          fontFamily: MONO,
          fontWeight: 600,
          fontSize: 26,
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
          textTransform: "uppercase",
          color: COLORS.muted,
          opacity: interpolate(frame, [22, 34], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Open source · Apache-2.0 · English & Italian
      </Interactive.Div>
    </div>
  );
};
