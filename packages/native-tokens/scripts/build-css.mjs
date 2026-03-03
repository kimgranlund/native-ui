#!/usr/bin/env node

// Builds CSS outputs for @nonoun/native-tokens:
//   dist/native-tokens.css  — inspector UI styles
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

// Foundation CSS — ORDER MATTERS (cascade: colors → tokens → themes → base → primitives)
const foundationFiles = [
  'src/styles/colors.primitives.css',
  'src/styles/colors.tokens.css',
  'src/styles/themes.css',
  'src/styles/n.base.css',
  'src/styles/n.primitives.css',
];

const foundationCSS =
  '@layer colors, tokens, ui;\n\n' +
  foundationFiles.map(read).join('\n');

// Inspector UI styles
const tokensCSS = readFileSync(resolve(pkg, 'src/tokens.css'), 'utf-8');

// Write output
mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, 'foundation.css'), foundationCSS);
writeFileSync(resolve(dist, 'native-tokens.css'), tokensCSS);

console.log('CSS build complete:');
console.log(`  dist/foundation.css (${foundationFiles.length} files)`);
console.log('  dist/native-tokens.css');
