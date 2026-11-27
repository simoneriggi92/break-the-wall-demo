import { Video } from "@remotion/media";
import {
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SCREEN, type Camera, type CameraKey } from "./cut";
import { BARS, SANS } from "./theme";
import type { PlacedShot } from "./timeline";

export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
  bar: number;
  radius: number;
};

const ease = Easing.bezier(0.65, 0, 0.35, 1);

/** The camera at `t` seconds into the shot. The zoom eases in log space, so it feels even. */
function cameraAt(keys: CameraKey[], t: number): Camera {
  const next = keys.findIndex((k) => k.t > t);
  if (next === -1) return keys[keys.length - 1];
  if (next === 0) return keys[0];
  const a = keys[next - 1];
  const b = keys[next];
  const p = ease((t - a.t) / (b.t - a.t));
  return {
    cx: a.cx + (b.cx - a.cx) * p,
    cy: a.cy + (b.cy - a.cy) * p,
    w: Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * p),
  };
}

/** Keeps the view inside the recording; centres it on an axis the view is wider than. */
function clamp(camera: Camera, aspect: number): Camera {
  const h = camera.w / aspect;
  const axis = (c: number, span: number, size: number) =>
    span >= size ? size / 2 : Math.min(Math.max(c, span / 2), size - span / 2);
  return {
    w: camera.w,
    cx: axis(camera.cx, camera.w, SCREEN.width),
    cy: axis(camera.cy, h, SCREEN.height),
  };
}

/** One shot: a window on the drafting sheet, its content a moving camera on the recording. */
export const ShotWindow = ({
  shot,
  box,
}: {
  readonly shot: PlacedShot;
  readonly box: Box;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bar = BARS[shot.window];
  const content = { width: box.width, height: box.height - box.bar };
  const camera = clamp(
    cameraAt(shot.camera, frame / fps),
    content.width / content.height,
  );
  const scale = content.width / camera.w;

  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        borderRadius: box.radius,
        overflow: "hidden",
        backgroundColor: bar.fill,
        boxShadow:
          "0 30px 70px rgba(29, 39, 51, 0.28), 0 0 0 1.5px rgba(29, 39, 51, 0.18)",
        opacity: shot.fadeIn
          ? interpolate(frame, [0, shot.fadeIn], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : 1,
      }}
    >
      <div
        style={{
          height: box.bar,
          backgroundColor: bar.bg,
          borderBottom: `1px solid ${bar.line}`,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: box.bar * 0.42,
          color: bar.fg,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: box.bar * 0.5,
            display: "flex",
            gap: box.bar * 0.26,
          }}
        >
          {["#ee6a5f", "#f5bd4f", "#61c454"].map((c) => (
            <div
              key={c}
              style={{
                width: box.bar * 0.32,
                height: box.bar * 0.32,
                borderRadius: "50%",
                backgroundColor: c,
              }}
            />
          ))}
        </div>
        {bar.title}
      </div>
      <div
        style={{
          position: "relative",
          width: content.width,
          height: content.height,
          overflow: "hidden",
        }}
      >
        <Video
          name={shot.title}
          src={staticFile("recording.mp4")}
          trimBefore={Math.round(shot.from * fps)}
          playbackRate={shot.rate}
          muted
          objectFit="fill"
          style={{
            position: "absolute",
            left: content.width / 2 - camera.cx * scale,
            top: content.height / 2 - camera.cy * scale,
            width: SCREEN.width * scale,
            height: SCREEN.height * scale,
          }}
        />
      </div>
    </div>
  );
};
