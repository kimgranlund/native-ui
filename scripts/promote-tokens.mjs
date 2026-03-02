/**
 * promote-tokens.mjs
 *
 * One-time migration: rename --_* color locals to --n-* public tokens.
 * Geometry locals were renamed separately by promote-geometry-tokens.mjs.
 *
 * Usage: node scripts/promote-tokens.mjs
 */

import { globSync } from 'node:fs';
import { readFileSync, writeFileSync } from 'node:fs';

/* ── Token groups to rename ── */

// Order matters: longer prefixes first to avoid partial matches.
// Each entry: [pattern, replacement]
// Patterns use regex with word-boundary-like context.
const replacements = [
  // Compound names first (longest match wins)
  ['--_surface-ink', '--n-surface-ink'],
  ['--_track-border', '--n-track-border'],
  ['--_border-color', '--n-border-color'],
  ['--_indicator-background', '--n-indicator-background'],

  // Simple groups
  ['--_background', '--n-background'],
  ['--_surface', '--n-surface'],   // safe: --_surface-ink already handled
  ['--_color', '--n-color'],
  ['--_body', '--n-body'],
  ['--_card', '--n-card'],
  ['--_panel', '--n-panel'],
  ['--_control', '--n-control'],
  ['--_button', '--n-button'],
  ['--_widget', '--n-widget'],
  ['--_ground', '--n-ground'],
  ['--_ink', '--n-ink'],
];

// --_border needs special handling: must NOT match --_border-radius (geometry)
// We handle it separately with a regex negative lookahead.

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

  // Apply ordered replacements
  for (const [from, to] of replacements) {
    content = content.replaceAll(from, to);
  }

  // --_border → --n-border (but NOT --_border-radius)
  // Negative lookahead: --_border NOT followed by -radius
  content = content.replace(/--_border(?!-radius)/g, '--n-border');

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
  // Count lines that differ
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  let diffs = 0;
  const len = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < len; i++) {
    if (aLines[i] !== bLines[i]) diffs++;
  }
  return diffs;
}
