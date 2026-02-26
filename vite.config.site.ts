// Vite config for building the demo site (Vercel deployment).
// Separate from vite.config.ts which builds the library.
// Usage: vite build --config vite.config.site.ts

import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Collect all .html files recursively under src/ as MPA entry points
function collectHtmlEntries(dir: string, base = ''): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const rel = base ? `${base}/${item}` : item;
    if (statSync(full).isDirectory()) {
      // Skip test directories and node_modules
      if (item === '__tests__' || item === 'node_modules') continue;
      Object.assign(entries, collectHtmlEntries(full, rel));
    } else if (item.endsWith('.html')) {
      const name = rel.replace(/\.html$/, '').replace(/\//g, '-');
      entries[name] = full;
    }
  }
  return entries;
}

const srcEntries = collectHtmlEntries(resolve(__dirname, 'src'));

export default defineConfig({
  define: {
    __DEV__: 'false',
  },
  build: {
    outDir: 'site',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...srcEntries,
      },
    },
  },
});
