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
      '@nonoun/native-codemirror/register': resolve(__dirname, '../native-codemirror/src/register.ts'),
      '@nonoun/native-codemirror': resolve(__dirname, '../native-codemirror/src/index.ts'),
    },
  },
  publicDir: false,
  build: {
    lib: {
      entry: {
        'native-playground': resolve(__dirname, 'src/index.ts'),
        'register': resolve(__dirname, 'src/register.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        /^@nonoun\//,
        /^@codemirror\//,
        /^@lezer\//,
      ],
    },
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: true,
  },
});
