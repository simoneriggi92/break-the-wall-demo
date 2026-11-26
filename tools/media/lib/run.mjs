import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

/** Runs a system tool; on failure the error carries the tool's last words, which name the cause. */
export async function run(command, args) {
  try {
    const { stdout } = await exec(command, args, { maxBuffer: 1 << 26 });
    return stdout;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`${command} is not installed: see tools/media/README.md`);
    }
    const tail = String(error.stderr ?? '').trim().split('\n').slice(-6).join('\n');
    throw new Error(`${command} failed:\n${tail}`);
  }
}

export async function probeVideo(file) {
  const info = JSON.parse(await run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'format=duration:stream=width,height', '-of', 'json', file,
  ]));
  return { duration: Number(info.format.duration), width: info.streams[0].width, height: info.streams[0].height };
}
