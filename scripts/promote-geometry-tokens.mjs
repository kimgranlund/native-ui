/**
 * promote-geometry-tokens.mjs
 *
 * One-time migration: rename shared --_* geometry locals to --n-* public tokens.
 * Only component-internal derived values (--_box-size, --_circle-size, --_dot-size,
 * --_rows, --_autogrow-height, --_border-radius, --_popover-origin, --_popover-from,
 * --_group-line-inset, --_group-child-inset, etc.) remain --_*.
 *
 * Usage: node scripts/promote-geometry-tokens.mjs
 */

import { globSync } from 'node:fs';
import { readFileSync, writeFileSync } from 'node:fs';

/* ── Token renames ── */

// Order: longer prefixes first to avoid partial matches.
// --_space also catches --_space-k (desired).
const replacements = [
  ['--_letter-spacing', '--n-letter-spacing'],
  ['--_min-height', '--n-min-height'],
  ['--_font-weight', '--n-font-weight'],
  ['--_font-size', '--n-font-size'],
  ['--_line-height', '--n-line-height'],
  ['--_icon-size', '--n-icon-size'],
  ['--_space', '--n-space'],       // also renames --_space-k → --n-space-k
  ['--_radius', '--n-radius'],
  ['--_duration', '--n-duration'],
  ['--_easing', '--n-easing'],
];

/* ── Glob targets ── */

const files = globSync([
  'src/**/*.css',
  'src/**/*.html',
  'src/**/*.ts',
  'packages/**/*.css',
  'packages/**/*.html',
  'packages/**/*.ts',
], { ignore: ['**/node_modules/**', '**/dist/**'] });

/* ── Process ── */

let totalReplacements = 0;
let filesChanged = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  const original = content;

  for (const [from, to] of replacements) {
    content = content.replaceAll(from, to);
  }

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
