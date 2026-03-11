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
        'native-traits': resolve(__dirname, 'src/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        /^@nonoun\//,
      ],
    },
    emptyOutDir: true,
    minify: true,
  },
});
