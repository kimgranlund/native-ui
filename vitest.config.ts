import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __DEV__: 'true',
  },
  resolve: {
    alias: {
      '@nonoun/native-core': resolve(__dirname, 'packages/native-core/src/index.ts'),
      '@nonoun/native-traits': resolve(__dirname, 'packages/native-traits/src/index.ts'),
      '@nonoun/native-ui': resolve(__dirname, 'src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        'src/test-setup.ts',
        'src/**/*.html',
        'src/nav/**',
        'src/icons/phosphor/**',
      ],
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
