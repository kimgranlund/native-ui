// Vite config for building the demo site (Vercel deployment).
// Separate from vite.config.ts which builds the library.
// Usage: vite build --config vite.config.site.ts

import { defineConfig } from 'vite';
import type { Plugin, HtmlTagDescriptor } from 'vite';
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

// WHY: Inject n-site.css and site-entry.ts into every page.
// Uses Vite's HtmlTagDescriptor API so the script tag is properly
// resolved and bundled during the build pipeline.
function injectSiteAssets(): Plugin {
  const css = readFileSync(
    resolve(__dirname, 'src/styles/n-site.css'),
    'utf8',
  );
  return {
    name: 'inject-site-assets',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        const tags: HtmlTagDescriptor[] = [
          {
            tag: 'style',
            children: css,
            injectTo: 'head',
          },
          {
            tag: 'script',
            attrs: { type: 'module', src: '/src/site-entry.ts' },
            injectTo: 'head',
          },
        ];
        return tags;
      },
    },
  };
}

const srcEntries = collectHtmlEntries(resolve(__dirname, 'src'));

export default defineConfig({
  plugins: [injectSiteAssets()],
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
      treeshake: false,
    },
  },
});
