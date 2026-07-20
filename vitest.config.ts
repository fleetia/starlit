import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  test: {
    execArgv: ['--no-experimental-webstorage'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    globals: true,
    environment: 'happy-dom',
    restoreMocks: true,
    setupFiles: ['./test/setup.ts'],
  },
});
