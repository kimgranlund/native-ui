/**
 * promote-remaining-tokens.mjs
 *
 * Final migration: rename ALL remaining --_* tokens to --n-*.
 * This includes color math intermediates, component-local vars, etc.
 *
 * Usage: node scripts/promote-remaining-tokens.mjs
 */

import { globSync } from 'node:fs';
import { readFileSync, writeFileSync } from 'node:fs';

const files = globSync([
  'src/**/*.css',
  'src/**/*.html',
  'src/**/*.ts',
  'packages/**/*.css',
  'packages/**/*.html',
  'packages/**/*.ts',
], { ignore: ['**/node_modules/**', '**/dist/**', 'scripts/**'] });

let totalReplacements = 0;
let filesChanged = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  const original = content;

  content = content.replaceAll('--_', '--n-');

  if (content !== original) {
    writeFileSync(file, content);
    const count = countDiffs(original, content);
    totalReplacements += count;
    filesChanged++;
    console.log(`  ${file} (${count} replacements)`);
  }
}

console.log(`\nDone: ${totalReplacements} replacements across ${filesChanged} files.`);

function countDiffs(a, b) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  let diffs = 0;
  const len = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < len; i++) {
    if (aLines[i] !== bLines[i]) diffs++;
  }
  return diffs;
}
