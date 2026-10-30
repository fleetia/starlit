import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { defineConfig } from 'vite';

import { licensesPlugin } from './scripts/licenses';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  plugins: [vanillaExtractPlugin(), react(), licensesPlugin(__dirname)],
  ...(command === 'build' && {
    build: {
      cssCodeSplit: true,
      outDir: 'dist',
      rollupOptions: {
        input: {
          app: resolve(__dirname, 'index.html'),
          background: resolve(__dirname, 'src/background/index.ts'),
          guide: resolve(__dirname, 'guide.html'),
          licenses: resolve(__dirname, 'licenses.html'),
        },
        output: {
          entryFileNames: '[name]/index.js',
          assetFileNames: '[name]/index.[ext]',
          chunkFileNames: '[name]/[name]__[hash].js',
          format: 'module',
        },
      },
    },
  }),
}));
