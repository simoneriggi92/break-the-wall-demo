import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const here = new URL('..', import.meta.url).pathname;

export const tempDir = () => mkdtemp(join(tmpdir(), 'btw-media-'));

/** A synthetic recording: a moving test pattern, so every frame differs as a real take's do. */
export async function syntheticVideo(file, { seconds, width, height, fps = 25, color, stripes }) {
  // A plain colour tells this recording apart from another in the output. A small pattern still
  // moves in its bottom-right corner, as a real take always moves: frames that never change make
  // a still WebP, not an animation.
  const pattern = `testsrc2=size=${width}x${height}:rate=${fps}:duration=${seconds}`;
  // Stripes, equal and side by side, tell apart which part of the take a frame was cut from.
  const plain = (c, w) => `color=c=${c}:size=${w}x${height}:rate=${fps}:duration=${seconds}`;
  const background = stripes
    ? `${stripes.map((c, i) => `${plain(c, width / stripes.length)}[c${i}]`).join(';')};${stripes.map((_, i) => `[c${i}]`).join('')}hstack=inputs=${stripes.length}[bg]`
    : color ? `${plain(color, width)}[bg]` : '';
  const graph = background
    ? `${background};testsrc2=size=320x200:rate=${fps}:duration=${seconds}[fg];[bg][fg]overlay=W-w:H-h[out]`
    : `${pattern}[out]`;
  await run('ffmpeg', [
    '-v', 'error', '-filter_complex', graph, '-map', '[out]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-y', file,
  ]);
  return file;
}

/** Runs one of the package's scripts as a person would, and returns its exit and output. */
export async function script(name, args) {
  try {
    const { stdout, stderr } = await run('node', [join(here, name), ...args], { maxBuffer: 1 << 24 });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

export async function probe(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', file,
  ]);
  const info = JSON.parse(stdout);
  return { duration: Number(info.format.duration), width: info.streams[0].width, height: info.streams[0].height };
}

/**
 * An animated WebP's length, from its frames' durations. ffprobe cannot read animated WebP, so
 * the RIFF chunks are walked here: each ANMF chunk holds a frame, its duration a 24-bit
 * little-endian count of milliseconds at byte 12 of the chunk's payload.
 */
export async function webpInfo(file) {
  const bytes = await readFile(file);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`${file} is not a WebP file`);
  }
  let offset = 12;
  let milliseconds = 0;
  let frames = 0;
  let width = 0;
  let height = 0;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (type === 'VP8X') {
      width = bytes.readUIntLE(payload + 4, 3) + 1;
      height = bytes.readUIntLE(payload + 7, 3) + 1;
    }
    if (type === 'ANMF') {
      frames += 1;
      milliseconds += bytes.readUIntLE(payload + 12, 3);
    }
    offset = payload + size + (size % 2);
  }
  return { duration: milliseconds / 1000, frames, width, height };
}

/** The mean colour of a frame's top-left corner, away from any caption, as [red, green, blue]. */
export async function cornerColor(file, at) {
  const { stdout } = await promisify(execFile)('ffmpeg', [
    '-v', 'error', '-ss', String(at), '-i', file, '-frames:v', '1',
    '-vf', 'crop=iw/4:ih/4:0:0,scale=1:1:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
  ], { encoding: 'buffer' });
  return [...stdout.subarray(0, 3)];
}

export const writeJson = (file, value) => writeFile(file, JSON.stringify(value, null, 2));
