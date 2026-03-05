/**
 * Build standalone reactivity bundle (DOM-free, Node-safe).
 *
 * Produces dist/reactivity.js — a self-contained ESM bundle with no browser
 * globals. Consumers import via `@nonoun/native-ui/reactivity`.
 *
 * This runs as a separate build step because Vite's multi-entry mode merges
 * shared reactivity modules into the core chunk (which has DOM deps).
 */

import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await build({
  root,
  configFile: false,
  publicDir: false,
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(root, 'src/reactivity/index.ts'),
      formats: ['es'],
      fileName: () => 'reactivity.js',
    },
    outDir: 'dist',
  },
});
