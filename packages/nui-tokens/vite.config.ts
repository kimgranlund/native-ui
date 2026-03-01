import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'nui-tokens',
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
