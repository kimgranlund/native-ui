import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Separate build for register.js — side-effect-only entry that calls define().
 * Must be built independently from the main library to prevent Rollup's
 * multi-entry chunking from stripping the side-effect calls.
 *
 * @nonoun/native-ui is NOT aliased here — stays external so define() calls
 * are preserved as opaque external function calls.
 */
export default defineConfig({
  define: {
    __DEV__: 'false',
  },
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/register.ts'),
      formats: ['es'],
      fileName: 'register',
    },
    rollupOptions: {
      external: [
        /^@nonoun\//,
        /^@codemirror\//,
        /^@lezer\//,
      ],
      treeshake: false,
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: true,
  },
});
