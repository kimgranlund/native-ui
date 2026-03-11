import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __DEV__: 'false',
  },
  publicDir: false,
  build: {
    lib: {
      entry: {
        'native-core': resolve(__dirname, 'src/index.ts'),
      },
      formats: ['es'],
    },
    emptyOutDir: true,
    minify: true,
  },
});
