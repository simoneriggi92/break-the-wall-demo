// The cut: which seconds of the screen recording the video plays, in order, and where the camera
// looks. Times and camera rectangles are the recording's own (seconds, and pixels of the
// 4096×2498 screen), the same coordinates as cuts/screen.json, so a moment found for the README's
// media can be dropped in here unchanged. Every frame is a real event: a shot only speeds up or
// skips waits, it never stages anything.

/** The recording's size in pixels. The proxy is scaled down; the camera still speaks in these. */
export const SCREEN = { width: 4096, height: 2498 };

export type Window = "terminal" | "page" | "both";

/** Where the camera looks: the centre of the view, and how many recording pixels it spans across. */
export type Camera = { cx: number; cy: number; w: number };

/** A camera position held from `t` seconds into the shot (shot time, after speed-up). */
export type CameraKey = Camera & { t: number };

export type Stage = "open" | "grill" | "answer" | "ask" | "spec" | "approve";

export type Shot = {
  /** Shown above the window: what the viewer should notice. */
  title: string;
  /** The small label above the title. */
  tag: string;
  stage: Stage;
  /** Frames the window's title bar names; changes the bar's colour too. */
  window: Window;
  /** Seconds of the recording. */
  from: number;
  to: number;
  /** Speed-up; 1 plays as recorded. */
  rate: number;
  /** At least one key. Between keys the camera eases; after the last it holds. */
  camera: CameraKey[];
  /** The outputs the shot plays in. Absent: only the full video. */
  in?: Output[];
};

/** The full video (LinkedIn and the README's GIF), or one of the README's three short clips. */
export type Output = "video" | "answer" | "ask" | "check";

export const STAGES: { id: Stage; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "grill", label: "Grill" },
  { id: "answer", label: "Answer" },
  { id: "ask", label: "Ask" },
  { id: "spec", label: "Spec" },
  { id: "approve", label: "Approve" },
];

// Camera positions that recur. The terminal is the right-hand column of the screen, from x 2768;
// the page is the left-hand column, 2610 wide; its content starts at the top.
const TERMINAL_PROMPT: Camera = { cx: 3432, cy: 1990, w: 1360 };
const TERMINAL_TOP: Camera = { cx: 3432, cy: 760, w: 1360 };
const TERMINAL_BOTTOM: Camera = { cx: 3432, cy: 1880, w: 1360 };
const BOTH: Camera = { cx: 2048, cy: 1249, w: 4096 };
const QUESTION_CARD: Camera = { cx: 1210, cy: 1490, w: 1560 };
const QUESTION_TOP: Camera = { cx: 1210, cy: 1330, w: 1560 };
const RIGHT_COLUMN: Camera = { cx: 1910, cy: 1000, w: 1400 };
const SEND_BUTTON: Camera = { cx: 1910, cy: 700, w: 1400 };
const SPEC_STRUCTURE: Camera = { cx: 1580, cy: 740, w: 2020 };
const SPEC_LAYERS: Camera = { cx: 1139, cy: 800, w: 1600 };
const BACKING: Camera = { cx: 1910, cy: 600, w: 1400 };
const AGENT_REPLY: Camera = { cx: 1210, cy: 735, w: 1760 };
const REMARKS: Camera = { cx: 1946, cy: 450, w: 1330 };

export const CUT: Shot[] = [
  {
    tag: "01 · Open",
    title: "Type /break-the-wall in Claude Code",
    stage: "open",
    window: "terminal",
    from: 0.8,
    to: 3.1,
    rate: 1.4,
    camera: [{ t: 0, ...TERMINAL_PROMPT }],
  },
  {
    tag: "01 · Open",
    title: "The page opens beside the session",
    stage: "open",
    window: "both",
    from: 3.0,
    to: 5.8,
    rate: 1,
    camera: [
      { t: 0, ...TERMINAL_PROMPT },
      { t: 0.25, ...TERMINAL_PROMPT },
      { t: 1.2, ...BOTH },
    ],
  },
  {
    tag: "02 · Grill · Matt Pocock's skills",
    title: "Start the grilling with /grill-with-docs",
    stage: "grill",
    window: "terminal",
    from: 5.8,
    to: 13.4,
    rate: 2.6,
    camera: [{ t: 0, ...TERMINAL_PROMPT }],
  },
  {
    tag: "03 · Answer",
    title: "The agent writes its questions",
    stage: "answer",
    window: "terminal",
    from: 70.0,
    to: 74.0,
    rate: 1.8,
    camera: [
      { t: 0, ...TERMINAL_TOP },
      { t: 2.2, ...TERMINAL_BOTTOM },
    ],
  },
  // 74.0 to 75.3 is skipped: the terminal redraws while it scrolls, and the page's address, with
  // its session token, shows outside the mask. scripts/check-token.mjs finds such seconds.
  {
    tag: "03 · Answer",
    title: "The agent writes its questions",
    stage: "answer",
    window: "terminal",
    from: 75.3,
    to: 77.4,
    rate: 1.8,
    camera: [{ t: 0, ...TERMINAL_BOTTOM }],
  },
  {
    tag: "03 · Answer",
    title: "They arrive in the page, one at a time",
    stage: "answer",
    window: "both",
    from: 77.4,
    to: 81.0,
    rate: 1.1,
    camera: [
      { t: 0, ...TERMINAL_BOTTOM },
      { t: 0.45, ...TERMINAL_BOTTOM },
      { t: 1.3, ...BOTH },
      { t: 2.0, ...BOTH },
      { t: 2.9, ...QUESTION_CARD },
    ],
    in: ["video", "answer"],
  },
  {
    tag: "04 · Ask",
    title: "Select a passage, ask beside the question",
    stage: "ask",
    window: "page",
    from: 111.4,
    to: 114.4,
    rate: 1.25,
    camera: [
      { t: 0, ...QUESTION_TOP },
      { t: 1.25, ...QUESTION_TOP },
      { t: 1.85, ...RIGHT_COLUMN },
    ],
    in: ["video", "ask"],
  },
  {
    tag: "04 · Ask",
    title: "A side chat opens beside the question",
    stage: "ask",
    window: "page",
    from: 132.6,
    to: 134.6,
    rate: 1,
    camera: [{ t: 0, ...RIGHT_COLUMN }],
    in: ["ask"],
  },
  {
    tag: "04 · Ask",
    title: "A read-only copy of the session answers",
    stage: "ask",
    window: "page",
    from: 143.2,
    to: 145.4,
    rate: 1.1,
    camera: [{ t: 0, cx: 1910, cy: 1240, w: 1400 }],
    in: ["video", "ask"],
  },
  {
    tag: "04 · Send",
    title: "Accept, then send the round",
    stage: "ask",
    window: "page",
    from: 149.0,
    to: 151.8,
    rate: 1.2,
    camera: [
      { t: 0, ...QUESTION_CARD },
      { t: 0.75, ...QUESTION_CARD },
      { t: 1.15, ...SEND_BUTTON },
    ],
    in: ["video", "answer"],
  },
  {
    tag: "04 · Send",
    title: "Only your answers go back to the session",
    stage: "ask",
    window: "terminal",
    from: 152.4,
    to: 154.4,
    rate: 1.1,
    camera: [{ t: 0, ...TERMINAL_PROMPT }],
    in: ["video", "answer"],
  },
  {
    tag: "05 · Spec",
    title: "/to-spec writes the spec",
    stage: "spec",
    window: "terminal",
    from: 422.8,
    to: 425.8,
    rate: 1.5,
    camera: [{ t: 0, ...TERMINAL_PROMPT }],
  },
  {
    tag: "05 · Explore",
    title: "It opens as a structure, beside its source",
    stage: "spec",
    window: "page",
    from: 563.4,
    to: 565.4,
    rate: 1,
    camera: [{ t: 0, ...SPEC_STRUCTURE }],
  },
  {
    tag: "05 · Explore",
    title: "Open a part, down to its roles",
    stage: "spec",
    window: "page",
    from: 573.4,
    to: 575.6,
    rate: 1.1,
    camera: [{ t: 0, ...SPEC_LAYERS }],
  },
  {
    tag: "05 · Check",
    title: "Every statement without backing, listed",
    stage: "spec",
    window: "page",
    from: 656.5,
    to: 658.5,
    rate: 1,
    camera: [{ t: 0, ...BACKING }],
  },
  {
    tag: "05 · Check",
    title: "Remark on one: “Never said that”",
    stage: "spec",
    window: "page",
    from: 662.5,
    to: 664.8,
    rate: 1.1,
    camera: [{ t: 0, ...BACKING }],
    in: ["video", "check"],
  },
  {
    tag: "05 · Check",
    title: "Claude asks instead of guessing",
    stage: "spec",
    window: "page",
    from: 678.4,
    to: 681.0,
    rate: 1.2,
    camera: [{ t: 0, ...AGENT_REPLY }],
    in: ["video", "check"],
  },
  {
    tag: "06 · Approve",
    title: "Approve the revised spec: it goes to the agent",
    stage: "approve",
    window: "page",
    from: 724.6,
    to: 727.6,
    rate: 1.1,
    camera: [{ t: 0, ...REMARKS }],
    in: ["video", "check"],
  },
];
