import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  // WHY: __DEV__ is true during dev/test, false in production builds.
  // Warnings gated behind `if (__DEV__)` are dead-code-eliminated in dist/.
  define: {
    __DEV__: String(command !== 'build'),
  },
  resolve: {
    alias: command === 'serve' ? {
      // WHY: In dev, workspace packages import from @nonoun/* packages.
      // Without aliases Vite resolves to dist/ (built), creating a dual-module
      // problem where the same classes load from both source and dist.
      // Aliasing to source entries keeps everything in one module graph.
      '@nonoun/native-ui': resolve(__dirname, 'src/index.ts'),
      '@nonoun/native-codemirror/register': resolve(__dirname, 'packages/native-codemirror/src/register.ts'),
      '@nonoun/native-codemirror': resolve(__dirname, 'packages/native-codemirror/src/index.ts'),
    } : {},
  },
  // WHY: srcdoc iframes (native-playground) have origin "null". ES module <script src>
  // loads from null→localhost are blocked without CORS headers. Dev-only setting.
  server: {
    cors: { origin: '*' },
  },
  // WHY: Don't copy public/ assets into dist/ — library build, not app build
  publicDir: false,
  build: {
    lib: {
      entry: {
        'native-ui': resolve(__dirname, 'src/index.ts'),
        'kernel': resolve(__dirname, 'src/kernel.ts'),
        'traits': resolve(__dirname, 'src/traits-entry.ts'),
        'register-all': resolve(__dirname, 'src/register-all.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        // WHY: Keep CSS out of the JS bundle — consumers load CSS via <link>
        assetFileNames: 'assets/[name][extname]',
        // WHY: Stable chunk names for CDN/import-map consumers.
        // Hash-based names change every build, breaking external references.
        chunkFileNames: '[name].js',
        // WHY: Without manualChunks, Rolldown auto-splits shared code into
        // meaninglessly named chunks (register-all2.js, app-panel-element.js).
        // This groups shared modules into predictably named chunks.
        manualChunks(id) {
          // Kernel is a separate entry — let it stay isolated
          if (id.includes('/kernel/')) return undefined;
          // Traits + core + registries + reactivity → core.js (shared foundation)
          if (id.includes('/traits/') || id.includes('/core/') || id.includes('/registries/') || id.includes('/reactivity/')) return 'core';
          // All component + container classes → components.js
          if (id.includes('/components/') || id.includes('/containers/')) return 'components';
          // Icons → n-icon.js
          if (id.includes('/icons/')) return 'n-icon';
        },
      },
    },
    // WHY: Don't emit CSS from JS imports — CSS is distributed separately
    cssCodeSplit: false,
  },
}));
