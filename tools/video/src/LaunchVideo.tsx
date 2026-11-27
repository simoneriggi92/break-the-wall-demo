import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Header, type HeaderLayout } from "./Header";
import { LoopStrip } from "./LoopStrip";
import { Mark } from "./Mark";
import { Outro } from "./Outro";
import { ShotWindow, type Box } from "./ShotWindow";
import { COLORS, MONO, SANS } from "./theme";
import type { Output } from "./cut";
import { OUTRO_SECONDS, placeShots, shotsFrames } from "./timeline";

export type LaunchVideoProps = {
  /** feed: 4:5 for LinkedIn, with a title above and the loop below. readme: 16:9, for the README's media. */
  layout: "feed" | "readme";
  /** Which shots play: the full video, or one of the README's short clips. */
  output: Output;
  outro: boolean;
};

type Layout = {
  header: HeaderLayout;
  box: Box;
  strip: { y: number; size: number } | null;
  brand: boolean;
  grid: number;
};

const LAYOUTS: Record<LaunchVideoProps["layout"], Layout> = {
  feed: {
    header: { x: 80, y: 176, width: 920, tagSize: 28, titleSize: 70, gap: 18 },
    box: { x: 40, y: 468, width: 1000, height: 726, bar: 46, radius: 18 },
    strip: { y: 1238, size: 24 },
    brand: true,
    grid: 36,
  },
  readme: {
    header: { x: 192, y: 22, width: 896, tagSize: 15, titleSize: 36, gap: 6 },
    box: { x: 192, y: 108, width: 896, height: 590, bar: 30, radius: 12 },
    strip: null,
    brand: false,
    grid: 24,
  },
};

export const LaunchVideo = ({ layout, output, outro }: LaunchVideoProps) => {
  const { fps, width } = useVideoConfig();
  const shots = placeShots(fps, output);
  const end = shotsFrames(shots);
  const l = LAYOUTS[layout];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.paper,
        backgroundImage: `linear-gradient(${COLORS.grid} 1.5px, transparent 1.5px), linear-gradient(90deg, ${COLORS.grid} 1.5px, transparent 1.5px)`,
        backgroundSize: `${l.grid}px ${l.grid}px`,
      }}
    >
      <Sequence name="Shots" durationInFrames={end} layout="none">
        {l.brand ? (
          <div
            style={{
              position: "absolute",
              left: 80,
              top: 72,
              right: 80,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Mark height={46} />
            <span
              style={{
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: 36,
                letterSpacing: "-0.02em",
                color: COLORS.ink,
              }}
            >
              Break the Wall
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: MONO,
                fontWeight: 600,
                fontSize: 20,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: COLORS.muted,
                border: `1.5px solid ${COLORS.line}`,
                borderRadius: 8,
                padding: "8px 14px",
              }}
            >
              Claude Code plugin
            </span>
          </div>
        ) : null}
        {shots.map((shot) => (
          <Sequence
            key={`${shot.from}-${shot.to}`}
            name={shot.title}
            from={shot.start}
            durationInFrames={shot.frames}
            premountFor={fps}
          >
            <ShotWindow shot={shot} box={l.box} />
          </Sequence>
        ))}
        <Header shots={shots} layout={l.header} />
        {l.strip ? (
          <LoopStrip
            shots={shots}
            y={l.strip.y}
            size={l.strip.size}
            width={width}
          />
        ) : null}
      </Sequence>
      {outro ? (
        <Sequence
          name="Outro"
          from={end}
          durationInFrames={OUTRO_SECONDS * fps}
        >
          <Outro />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
