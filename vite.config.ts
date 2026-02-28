import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  // WHY: __DEV__ is true during dev/test, false in production builds.
  // Warnings gated behind `if (__DEV__)` are dead-code-eliminated in dist/.
  define: {
    __DEV__: String(command !== 'build'),
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
        'inspector': resolve(__dirname, 'src/inspector.ts'),
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
        // meaninglessly named chunks (register-all2.js, ui-layout-inspector-element.js).
        // This groups shared modules into predictably named chunks.
        manualChunks(id) {
          // Kernel and A2UI are a separate entry — let them stay isolated
          if (id.includes('/kernel/') || id.includes('/a2ui/')) return undefined;
          // Inspector modules only used by the inspector entry — no redirect needed
          if (id.includes('/inspector/')) return undefined;
          // Traits + core + reactivity → core.js (shared foundation)
          if (id.includes('/traits/') || id.includes('/core/') || id.includes('/reactivity/')) return 'core';
          // All component + container classes → components.js
          if (id.includes('/components/') || id.includes('/containers/')) return 'components';
          // Icons → ui-icon.js
          if (id.includes('/icons/')) return 'ui-icon';
        },
      },
    },
    // WHY: Don't emit CSS from JS imports — CSS is distributed separately
    cssCodeSplit: false,
  },
}));
