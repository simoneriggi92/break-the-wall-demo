import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

// Break the Wall's drafting sheet: the paper, the ink and the rust of its README and social card.
export const COLORS = {
  paper: "#f4f0e6",
  grid: "rgba(29, 39, 51, 0.07)",
  ink: "#1d2733",
  muted: "#5b6675",
  faint: "#a39b8b",
  line: "#cdc4b1",
  rust: "#b4532f",
  accent: "#d96b4b",
  navy: "#102b46",
  steel: "#91a9be",
  terminal: "#0f131b",
};

export const SANS = loadInter("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;
export const MONO = loadMono("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
}).fontFamily;

/** The window's title bar, as each window looks in the recording. */
export const BARS = {
  terminal: {
    bg: "#1c2029",
    fg: "#9aa3b2",
    line: "#2a303b",
    fill: "#0f131b",
    title: "Claude Code",
  },
  page: {
    bg: "#e8e4dc",
    fg: "#4a4f57",
    line: "#d3cec4",
    fill: "#f1ede4",
    title: "Break the Wall",
  },
  both: {
    bg: "#1c2029",
    fg: "#9aa3b2",
    line: "#2a303b",
    fill: "#0f131b",
    title: "Claude Code · Break the Wall",
  },
} as const;
