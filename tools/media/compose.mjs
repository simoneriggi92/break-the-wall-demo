#!/usr/bin/env node
// Composes a recorded take again from its two recordings, when the recorder's own pass must be redone.
// Usage: node compose.mjs <take-dir>
import { resolve } from 'node:path';
import { compose } from './lib/compose.mjs';

if (process.argv.length !== 3) {
  console.error('Usage: node compose.mjs <take-dir>');
  process.exit(2);
}

try {
  const { take, marks } = await compose(resolve(process.argv[2]));
  console.log(take);
  for (const mark of marks) {
    console.log(`${mark.at.toFixed(2).padStart(8)} s  ${mark.label}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
