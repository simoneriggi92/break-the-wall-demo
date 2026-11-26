#!/usr/bin/env node
// Sends one command to a running recorder and prints its answer.
// Usage: node drive.mjs <take-dir> [--terminal] <command> [args...]
//   goto <url> · click <selector> · click-role <role> <name> · click-text <text> · fill <selector> <text>
//   type <text> · press <key> · select-text <text> · wait-text <text> [ms] · wait-gone <text> [ms]
//   snapshot · screenshot <file>
//   mark <label> · stop
// Commands go to the page unless --terminal is given. The terminal's keys go through tmux, not here.
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const [takeDir, ...rest] = process.argv.slice(2);
const side = rest[0] === '--terminal' ? (rest.shift(), 'terminal') : 'page';
const [command, ...args] = rest;
if (!takeDir || !command) {
  console.error('Usage: node drive.mjs <take-dir> [--terminal] <command> [args...]');
  process.exit(2);
}

try {
  const { port, token } = JSON.parse(await readFile(join(resolve(takeDir), 'control.json'), 'utf8'));
  const response = await fetch(`http://127.0.0.1:${port}/`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ command, args, side }),
  });
  const answer = await response.json();
  if (!response.ok) throw new Error(answer.error);
  console.log(answer.result);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
