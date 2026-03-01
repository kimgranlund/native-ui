import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: false,
  define: {
    __DEV__: 'false',
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'nui-app',
    },
    rollupOptions: {
      external: [/^@nonoun\/native-ui/],
      output: {
        assetFileNames: 'assets/[name][extname]',
      },
    },
    cssCodeSplit: false,
  },
});
