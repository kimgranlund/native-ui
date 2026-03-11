import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __DEV__: 'false',
  },
  resolve: {
    alias: {
      '@nonoun/native-core': resolve(__dirname, '../native-core/src/index.ts'),
      '@nonoun/native-traits': resolve(__dirname, '../native-traits/src/index.ts'),
      '@nonoun/native-kernel': resolve(__dirname, '../native-kernel/src/index.ts'),
      '@nonoun/native-ui/kernel': resolve(__dirname, '../../src/kernel.ts'),
      '@nonoun/native-ui/register': resolve(__dirname, '../../src/register-all.ts'),
      '@nonoun/native-ui': resolve(__dirname, '../../src/index.ts'),
      '@nonoun/native-code': resolve(__dirname, '../native-code/src/index.ts'),
    },
  },
  publicDir: false,
  server: {
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, '/v1'),
      },
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, '/v1'),
      },
    },
  },
  build: {
    lib: {
      entry: {
        'native-ai': resolve(__dirname, 'src/index.ts'),
        'gateway': resolve(__dirname, 'src/gateway.ts'),
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
