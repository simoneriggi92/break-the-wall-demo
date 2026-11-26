#!/usr/bin/env node
// Records a take: the terminal (ttyd showing the tmux session that runs claude) and Break the
// Wall's page, each in its own 1280×800 window, on one timeline. While it runs, drive.mjs sends it
// commands (real clicks and keys on the page, marks on the timeline); `stop` composes the take.
// Usage: node record.mjs <take-dir> [--terminal <url>] [--theme paper|blueprint] [--headless]
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { compose } from './lib/compose.mjs';

const SIZE = { width: 1280, height: 800 };

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    terminal: { type: 'string', default: 'http://localhost:7681' },
    theme: { type: 'string', default: 'paper' },
    headless: { type: 'boolean', default: false },
  },
});
if (positionals.length !== 1 || !['paper', 'blueprint'].includes(values.theme)) {
  console.error('Usage: node record.mjs <take-dir> [--terminal <url>] [--theme paper|blueprint] [--headless]');
  process.exit(2);
}

const takeDir = resolve(positionals[0]);
const rawDir = join(takeDir, 'raw');
await mkdir(rawDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: values.headless });
const marks = [];

/**
 * One window per side, each recording from the moment its page exists. That moment is taken as
 * the midpoint of newPage(), the call during which the recording starts: compose aligns the two
 * recordings on these instants.
 */
async function openSide(options) {
  const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: rawDir, size: SIZE }, ...options });
  const before = Date.now();
  const page = await context.newPage();
  return { context, page, startedAt: Math.round((before + Date.now()) / 2) };
}

const terminal = await openSide({});
const page = await openSide({ locale: 'en-US', colorScheme: 'light' });

// The page keeps its theme and language per browser: set before its own scripts read them, so
// every take shows the same page whatever was chosen in an earlier one.
await page.context.addInitScript((preferences) => {
  try { localStorage.setItem('btw:preferences', JSON.stringify(preferences)); } catch { /* not every page has storage */ }
}, { theme: values.theme, language: 'en' });
// A headless recording has no pointer: draw the real one, so a viewer sees where each click lands.
await page.context.addInitScript(showPointer);

// xterm's scrollbar would sit in the middle of the composed take, between the two windows.
await terminal.context.addInitScript(() => addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = '.xterm-viewport { overflow-y: hidden !important; }';
  document.head.append(style);
}));
await terminal.page.goto(values.terminal);
await page.page.setContent('<!doctype html><title>Waiting for Break the Wall</title><body style="margin:0;background:#f4f1ea"></body>');

const sides = { terminal: terminal.page, page: page.page };
const token = randomBytes(16).toString('hex');
const server = createServer((request, response) => {
  let body = '';
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', async () => {
    const reply = (status, value) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(value));
    };
    if (request.method !== 'POST' || request.headers.authorization !== `Bearer ${token}`) {
      return reply(403, { error: 'Not a command from drive.mjs.' });
    }
    try {
      const { command, args = [], side = 'page' } = JSON.parse(body);
      if (!(side in sides)) throw new Error(`side must be "terminal" or "page", not "${side}".`);
      const result = await perform(command, args, sides[side]);
      // The answer must reach drive.mjs before the process ends.
      if (command === 'stop') response.on('finish', () => process.exit(0));
      reply(200, { result });
    } catch (error) {
      reply(400, { error: error.message });
    }
  });
});
server.listen(0, '127.0.0.1', async () => {
  await writeFile(join(takeDir, 'control.json'), JSON.stringify({ port: server.address().port, token }));
  console.log(`Recording ${takeDir}`);
});

let stopping;
process.on('SIGINT', () => { stopping ??= stop().then(() => process.exit(0)); });
process.on('SIGTERM', () => { stopping ??= stop().then(() => process.exit(0)); });

async function perform(command, args, target) {
  switch (command) {
    case 'goto': return (await target.goto(args[0]), target.url());
    case 'click': return clickLike(target, target.locator(args[0]));
    case 'click-role': return clickLike(target, await byRole(target, args[0], args[1]));
    case 'click-text': return clickLike(target, target.getByText(args[0], { exact: false }).first());
    case 'fill': return (await target.locator(args[0]).fill(args[1]), 'filled');
    case 'type': return (await target.keyboard.type(args[0], { delay: 35 }), 'typed');
    case 'press': return (await target.keyboard.press(args[0]), 'pressed');
    case 'select-text': return selectText(target, args[0]);
    case 'wait-text': return (await target.getByText(args[0]).first().waitFor({ timeout: Number(args[1] ?? 60_000) }), 'shown');
    case 'wait-gone': return (await target.getByText(args[0]).first().waitFor({ state: 'hidden', timeout: Number(args[1] ?? 600_000) }), 'gone');
    case 'snapshot': return target.locator('body').ariaSnapshot();
    case 'screenshot': return (await target.screenshot({ path: resolve(args[0]) }), resolve(args[0]));
    case 'mark': {
      marks.push({ at: Date.now(), label: args.join(' ') });
      return `mark ${marks.length}`;
    }
    case 'stop': return stopping ??= stop();
    default: throw new Error(`Unknown command "${command}".`);
  }
}

/** The element whose name is exactly this, else the one whose name holds it: "Ask" must not hit "Ask about this question". */
async function byRole(target, role, name) {
  const exact = target.getByRole(role, { name, exact: true });
  return (await exact.count()) > 0 ? exact.first() : target.getByRole(role, { name });
}

/** Moves the pointer there as a hand would, then clicks: a jump would read as a cut in the media. */
async function clickLike(target, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('The element is not visible.');
  await target.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
  await locator.click();
  return 'clicked';
}

/** Selects a passage the way a person does, by dragging across it, so the page sees a real selection. */
async function selectText(target, text) {
  const locator = target.getByText(text, { exact: false }).first();
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`No visible passage holds "${text}".`);
  const y = box.y + Math.min(box.height / 2, 10);
  await target.mouse.move(box.x + 2, y, { steps: 12 });
  await target.mouse.down();
  await target.mouse.move(box.x + box.width - 2, box.y + box.height - Math.min(box.height / 2, 10), { steps: 24 });
  await target.mouse.up();
  return 'selected';
}

async function stop() {
  const videos = { terminal: terminal.page.video(), page: page.page.video() };
  await terminal.context.close();
  await page.context.close();
  await browser.close();
  const timeline = {
    terminal: { video: relative(takeDir, await videos.terminal.path()), startedAt: terminal.startedAt },
    page: { video: relative(takeDir, await videos.page.path()), startedAt: page.startedAt },
    marks,
  };
  await writeFile(join(takeDir, 'timeline.json'), `${JSON.stringify(timeline, null, 2)}\n`);
  const { take } = await compose(takeDir);
  return take;
}

/** Runs inside the page: a dot that follows the real mouse, and a ring on each press. */
function showPointer() {
  addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'fixed', left: '0', top: '0', width: '18px', height: '18px', margin: '-9px 0 0 -9px',
      borderRadius: '50%', background: 'rgba(20,20,20,.55)', border: '2px solid #fff',
      boxShadow: '0 1px 4px rgba(0,0,0,.4)', pointerEvents: 'none', zIndex: '2147483647',
      transition: 'transform .12s', transform: 'translate(-40px,-40px)',
    });
    document.documentElement.append(dot);
    let at = 'translate(-40px,-40px)';
    addEventListener('mousemove', (event) => { at = `translate(${event.clientX}px,${event.clientY}px)`; dot.style.transform = at; }, true);
    addEventListener('mousedown', () => { dot.style.transform = `${at} scale(.7)`; }, true);
    addEventListener('mouseup', () => { dot.style.transform = at; }, true);
  });
}
