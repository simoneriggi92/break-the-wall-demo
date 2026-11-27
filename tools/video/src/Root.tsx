import { Composition, Folder, type CalculateMetadataFunction } from "remotion";
import { LaunchVideo, type LaunchVideoProps } from "./LaunchVideo";
import { OUTRO_SECONDS, placeShots, shotsFrames } from "./timeline";

// The length follows the cut: change src/cut.ts and every composition follows.
const calculateMetadata: CalculateMetadataFunction<LaunchVideoProps> = ({
  props,
}) => {
  const fps = 30;
  const shots = shotsFrames(placeShots(fps, props.output));
  return { durationInFrames: shots + (props.outro ? OUTRO_SECONDS * fps : 0) };
};

export const RemotionRoot = () => {
  return (
    <>
      <Folder name="BreakTheWall">
        <Composition
          id="LinkedIn"
          component={LaunchVideo}
          durationInFrames={900}
          fps={30}
          width={1080}
          height={1350}
          calculateMetadata={calculateMetadata}
          defaultProps={{ layout: "feed", output: "video", outro: true }}
        />
      </Folder>
      {/* The README's media, 16:9 like the ones they replace; scripts/readme-media.mjs encodes them. */}
      <Folder name="Readme">
        <Composition
          id="Readme"
          component={LaunchVideo}
          durationInFrames={900}
          fps={30}
          width={1280}
          height={720}
          calculateMetadata={calculateMetadata}
          defaultProps={{ layout: "readme", output: "video", outro: false }}
        />
        <Composition
          id="ReadmeAnswer"
          component={LaunchVideo}
          durationInFrames={210}
          fps={30}
          width={1280}
          height={720}
          calculateMetadata={calculateMetadata}
          defaultProps={{ layout: "readme", output: "answer", outro: false }}
        />
        <Composition
          id="ReadmeAsk"
          component={LaunchVideo}
          durationInFrames={210}
          fps={30}
          width={1280}
          height={720}
          calculateMetadata={calculateMetadata}
          defaultProps={{ layout: "readme", output: "ask", outro: false }}
        />
        <Composition
          id="ReadmeCheck"
          component={LaunchVideo}
          durationInFrames={210}
          fps={30}
          width={1280}
          height={720}
          calculateMetadata={calculateMetadata}
          defaultProps={{ layout: "readme", output: "check", outro: false }}
        />
      </Folder>
    </>
  );
};
