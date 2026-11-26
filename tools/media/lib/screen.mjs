import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Records a page by taking its screenshot at a steady rate and piping the frames to ffmpeg.
 *
 * Playwright's own video, Chrome's screencast and a bare DevTools screenshot all capture a page at
 * its CSS size even when it is drawn at twice the density: a 1280×800 window comes out 1280×800.
 * Playwright's screenshot carries every device pixel (2560×1600), at about 50 a second, so the
 * recording is a stream of those (measured on Chrome 158, 2026-11-26).
 *
 * Frame k shows the page at `startedAt + k / fps`: when a screenshot takes longer than a frame,
 * the last one is repeated until the clock catches up, so the video keeps wall-clock time and two
 * recordings line up on their `startedAt` alone.
 */
export async function recordScreen(page, file, { fps = 20 } = {}) {
  const ffmpeg = spawn('ffmpeg', [
    '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-y', file,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errors = '';
  ffmpeg.stderr.on('data', (chunk) => { errors += chunk; });
  const exited = once(ffmpeg, 'close');

  const interval = 1000 / fps;
  let running = true;
  let written = 0;
  let last;
  let startedAt;

  const capture = async () => {
    try {
      // The caret stays as the person sees it while typing. A screenshot taken while the page
      // navigates can hang until Playwright's 30 s default; a short timeout caps the stale frames.
      return await page.screenshot({ type: 'jpeg', quality: 88, caret: 'initial', timeout: 2_000 });
    } catch {
      // A page between two documents has nothing to capture: the previous frame stands in.
      return last;
    }
  };

  last = await capture();
  if (!last) throw new Error(`The page could not be captured, so ${file} was not started.`);
  startedAt = Date.now();
  const loop = (async () => {
    while (running) {
      const frame = (await capture()) ?? last;
      if (!frame) continue; // nothing captured yet: the clock starts with the first frame
      last = frame;
      const due = Math.floor((Date.now() - startedAt) / interval) + 1;
      while (written < due) {
        if (!ffmpeg.stdin.write(frame)) await once(ffmpeg.stdin, 'drain');
        written += 1;
      }
      await sleep(Math.max(0, startedAt + written * interval - Date.now()));
    }
  })();

  return {
    startedAt,
    async stop() {
      running = false;
      await loop;
      ffmpeg.stdin.end();
      const [code] = await exited;
      if (code !== 0) throw new Error(`ffmpeg could not write ${file}:\n${errors.trim()}`);
      return file;
    },
  };
}
