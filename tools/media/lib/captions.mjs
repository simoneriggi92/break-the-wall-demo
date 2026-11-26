import { join } from 'node:path';
import { chromium } from 'playwright';

/**
 * Renders each caption as a transparent PNG the size of a frame, its bar at the bottom.
 * Homebrew's ffmpeg is built without freetype, so it has no drawtext filter: the browser
 * that records the take draws the captions instead, and ffmpeg only overlays them.
 */
export async function renderCaptions(captions, { width, height, dir }) {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    const files = [];
    for (const [index, caption] of captions.entries()) {
      await page.setContent(captionPage(caption, width));
      const file = join(dir, `caption-${index}.png`);
      await page.screenshot({ path: file, omitBackground: true });
      files.push(file);
    }
    return files;
  } finally {
    await browser.close();
  }
}

function captionPage(caption, width) {
  const size = Math.max(14, Math.round(width / 42));
  const text = caption.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return `<!doctype html><html><body style="margin:0;height:100vh;display:flex;align-items:flex-end;justify-content:center;background:transparent">
<div style="margin-bottom:${Math.round(size * 0.9)}px;padding:${Math.round(size * 0.4)}px ${size}px;border-radius:${Math.round(size * 0.4)}px;background:rgba(17,17,17,.82);color:#fff;font:600 ${size}px/1.25 -apple-system,'Helvetica Neue',Arial,sans-serif;max-width:86%;text-align:center">${text}</div>
</body></html>`;
}
