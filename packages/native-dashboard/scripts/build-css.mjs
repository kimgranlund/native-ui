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
  'src/sidebar/sidebar.css',
  'src/dashboard-breadcrumb/dashboard-breadcrumb.css',
  'src/dashboard-canvas/dashboard-canvas.css',
  'src/dashboard-panel/dashboard-panel.css',
];

const output = cssFiles.map(read).join('\n');

mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, 'native-dashboard.css'), output);

console.log(`CSS build complete: dist/native-dashboard.css (${cssFiles.length} files)`);
