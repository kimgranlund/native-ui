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
      },
    },
    // WHY: Don't emit CSS from JS imports — CSS is distributed separately
    cssCodeSplit: false,
  },
}));
