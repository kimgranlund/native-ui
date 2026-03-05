import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: false,
  define: {
    __DEV__: 'false',
  },
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
        'native-chat': resolve(__dirname, 'src/index.ts'),
        'register': resolve(__dirname, 'src/register.ts'),
        'gateway': resolve(__dirname, 'src/gateway.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^@nonoun\//],
    },
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@nonoun/native-ui': resolve(__dirname, '../../src/index.ts'),
    },
  },
});
