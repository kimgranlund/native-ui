// Vite config for building the demo site (Vercel deployment).
// Separate from vite.config.ts which builds the library.
// Usage: vite build --config vite.config.site.ts

import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { resolve } from 'path';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

// Collect all .html files recursively under src/ as MPA entry points
function collectHtmlEntries(dir: string, base = ''): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const rel = base ? `${base}/${item}` : item;
    if (statSync(full).isDirectory()) {
      if (item === '__tests__' || item === 'node_modules') continue;
      Object.assign(entries, collectHtmlEntries(full, rel));
    } else if (item.endsWith('.html')) {
      const name = rel.replace(/\.html$/, '').replace(/\//g, '-');
      entries[name] = full;
    }
  }
  return entries;
}

// WHY: Inject site-overrides.css into every HTML page's <head>.
// Fixes ui-layout flash-prevention (visibility: hidden) that blocks
// rendering in static builds where [data-ready] may not get set.
function injectSiteOverrides(): Plugin {
  const css = readFileSync(
    resolve(__dirname, 'src/styles/site-overrides.css'),
    'utf8',
  );
  return {
    name: 'inject-site-overrides',
    transformIndexHtml(html) {
      return html.replace('</head>', `<style>${css}</style></head>`);
    },
  };
}

const srcEntries = collectHtmlEntries(resolve(__dirname, 'src'));

export default defineConfig({
  plugins: [injectSiteOverrides()],
  define: {
    __DEV__: 'false',
  },
  build: {
    outDir: 'site',
    // WHY: Disable tree-shaking for the demo site. Inline <script type="module">
    // in HTML pages import .ts files that call customElements.define() as side
    // effects. Rolldown tree-shakes them away because package.json has
    // "sideEffects": false. This is correct for library builds, but wrong here.
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...srcEntries,
      },
      treeshake: false,
    },
  },
});
