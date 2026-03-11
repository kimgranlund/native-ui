import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __DEV__: 'false',
  },
  resolve: {
    alias: {
      '@nonoun/native-core': resolve(__dirname, '../native-core/src/index.ts'),
    },
  },
  publicDir: false,
  build: {
    lib: {
      entry: {
        'register': resolve(__dirname, 'src/register.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^@nonoun\//],
      treeshake: false,
    },
    emptyOutDir: false,
    minify: true,
  },
});
