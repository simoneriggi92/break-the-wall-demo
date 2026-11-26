import { join } from 'node:path';
import { chromium } from 'playwright';

/**
 * The frame of Break the Wall's own README media: a blurred colour field, a macOS window with
 * its title, and a pill below it, a tag beside a caption. The window's content area is left
 * transparent, so a moment's recording shows through it.
 */
export const CANVAS = { width: 960, height: 540 };
/** 16:10, the shape every crop keeps. */
export const CONTENT = { x: 112, y: 30, width: 736, height: 460 };
const TITLE_BAR = 18;
const RADIUS = 10;

export const TITLES = { page: 'Break the Wall', terminal: 'Claude Code', both: 'Claude Code · Break the Wall' };

const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The whole canvas minus the content area, its lower corners rounded as the window's. */
function holeMask() {
  const { x, y, width: w, height: h } = CONTENT;
  const r = RADIUS;
  const path = `M0 0H${CANVAS.width}V${CANVAS.height}H0Z M${x} ${y}H${x + w}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}Z`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${CANVAS.width}' height='${CANVAS.height}'><path fill='white' fill-rule='evenodd' d='${path}'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

function framePage({ window, tag, caption }) {
  const { x, y, width, height } = CONTENT;
  const bar = window === 'terminal'
    ? { bg: '#1c2029', fg: '#9aa3b2', line: '#2a303b' }
    : { bg: '#e8e4dc', fg: '#4a4f57', line: '#d3cec4' };
  return `<!doctype html><html><head><style>
  html,body{margin:0;width:${CANVAS.width}px;height:${CANVAS.height}px;background:transparent;overflow:hidden}
  .bg{position:absolute;inset:0;-webkit-mask-image:${holeMask()};mask-image:${holeMask()};overflow:hidden}
  .field{position:absolute;inset:-80px;filter:blur(40px);background:
    radial-gradient(ellipse 55% 60% at 8% 30%, #2f7f9c 0%, transparent 70%),
    radial-gradient(ellipse 50% 55% at 92% 12%, #6a4fc4 0%, transparent 70%),
    radial-gradient(ellipse 45% 50% at 95% 95%, #d9714f 0%, transparent 72%),
    radial-gradient(ellipse 45% 45% at 10% 100%, #2a9a8c 0%, transparent 70%),
    radial-gradient(ellipse 60% 60% at 50% 55%, #22355f 0%, transparent 80%),
    #1a2440}
  .win{position:absolute;left:${x}px;top:${y - TITLE_BAR}px;width:${width}px;height:${height + TITLE_BAR}px;border-radius:${RADIUS}px;
    box-shadow:0 24px 60px rgba(5,10,25,.55),0 0 0 1px rgba(255,255,255,.10)}
  .bar{position:absolute;left:${x}px;top:${y - TITLE_BAR}px;width:${width}px;height:${TITLE_BAR}px;background:${bar.bg};
    border-radius:${RADIUS}px ${RADIUS}px 0 0;border-bottom:1px solid ${bar.line};box-sizing:border-box;
    font:500 10.5px/${TITLE_BAR - 1}px -apple-system,'Helvetica Neue',Arial,sans-serif;color:${bar.fg};text-align:center}
  .dots{position:absolute;left:9px;top:5px;display:flex;gap:6px}
  .dots i{width:8px;height:8px;border-radius:50%;display:block}
  .pill{position:absolute;left:50%;top:${y + height + 8}px;transform:translateX(-50%);display:flex;align-items:center;gap:11px;white-space:nowrap;
    padding:0 16px;height:32px;border-radius:16px;background:rgba(14,24,42,.94);box-shadow:0 0 0 1px rgba(255,255,255,.10),0 8px 24px rgba(0,0,0,.35)}
  .tag{font:600 10.5px/1 ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:.18em;color:#e2805c;text-transform:uppercase}
  .sep{width:1px;height:16px;background:rgba(255,255,255,.22)}
  .text{font:600 16px/1 -apple-system,'Helvetica Neue',Arial,sans-serif;color:#f4f6fa}
  </style></head><body>
  <div class="bg"><div class="field"></div></div>
  <div class="win"></div>
  <div class="bar"><div class="dots"><i style="background:#ee6a5f"></i><i style="background:#f5bd4f"></i><i style="background:#61c454"></i></div>${escape(TITLES[window])}</div>
  <div class="pill"><span class="tag">${escape(tag)}</span><span class="sep"></span><span class="text">${escape(caption)}</span></div>
  </body></html>`;
}

/**
 * One transparent PNG the size of the canvas per moment. Homebrew's ffmpeg has no text filter,
 * so the browser draws the frame and ffmpeg only overlays it.
 */
export async function renderFrames(moments, dir) {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const tab = await browser.newPage({ viewport: CANVAS, deviceScaleFactor: 1 });
    const files = [];
    for (const [index, moment] of moments.entries()) {
      await tab.setContent(framePage(moment));
      const file = join(dir, `frame-${index}.png`);
      await tab.screenshot({ path: file, omitBackground: true });
      files.push(file);
    }
    return files;
  } finally {
    await browser.close();
  }
}
