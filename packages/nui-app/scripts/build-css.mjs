#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf-8');
}

// Order: sidebar first (structural parent), then siblings
const cssFiles = [
  'src/nui-sidebar/nui-sidebar.css',
  'src/nui-app-breadcrumb/nui-app-breadcrumb.css',
  'src/nui-app-canvas/nui-app-canvas.css',
  'src/nui-app-panel/nui-app-panel.css',
];

const output = cssFiles.map(read).join('\n');

mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, 'nui-app.css'), output);

console.log(`CSS build complete: dist/nui-app.css (${cssFiles.length} files)`);
