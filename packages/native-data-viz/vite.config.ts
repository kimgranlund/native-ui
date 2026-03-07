import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __DEV__: 'false',
  },
  resolve: {
    alias: {
      '@nonoun/native-ui': resolve(__dirname, '../../src/index.ts'),
    },
  },
  publicDir: false,
  build: {
    lib: {
      entry: {
        'native-data-viz': resolve(__dirname, 'src/index.ts'),
        'register': resolve(__dirname, 'src/register.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^@nonoun\//],
    },
    cssCodeSplit: false,
  },
});
