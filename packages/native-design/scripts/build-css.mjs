#!/usr/bin/env node

// Builds CSS outputs for @nonoun/native-design:
//   dist/native-design.css  — inspector UI styles
//   dist/foundation.css     — full foundation (colors + tokens + themes + base + primitives)

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(__dirname, '..');
const root = resolve(pkg, '../..');
const dist = resolve(pkg, 'dist');

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf-8');
}

// Foundation CSS — ORDER MATTERS (cascade: colors → tokens → themes → reset → component tokens)
const foundationFiles = [
  'src/styles/css/colors.computed.css',
  'src/styles/css/colors.semantic.css',
  'src/styles/css/colors.themes.css',
  'src/styles/css/layout.reset.css',
  'src/styles/css/components.tokens.css',
];

const foundationCSS =
  '@layer colors, tokens, ui;\n\n' +
  foundationFiles.map(read).join('\n');

// Inspector UI styles
const designCSS = readFileSync(resolve(pkg, 'src/design.css'), 'utf-8');

// Write output
mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, 'foundation.css'), foundationCSS);
writeFileSync(resolve(dist, 'native-design.css'), designCSS);

console.log('CSS build complete:');
console.log(`  dist/foundation.css (${foundationFiles.length} files)`);
console.log('  dist/native-design.css');
