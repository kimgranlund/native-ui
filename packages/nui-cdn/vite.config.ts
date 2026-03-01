import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __DEV__: 'false',
  },
  resolve: {
    alias: {
      '@nonoun/native-ui/register': resolve(__dirname, '../../src/register-all.ts'),
      '@nonoun/native-ui': resolve(__dirname, '../../src/index.ts'),
    },
  },
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'NativeUI',
      formats: ['iife'],
      fileName: () => 'native-ui.iife.js',
    },
    emptyOutDir: true,
    cssCodeSplit: false,
  },
});
