import { defineConfig } from "vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  plugins: [vanillaExtractPlugin(), react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src")
    }
  },
  css: {
    modules: {
      generateScopedName: "[local]-[hash:base64:5]"
    },
    preprocessorOptions: {
      scss: {
        api: "modern"
      }
    }
  },
  ...(command === "build" && {
    build: {
      cssCodeSplit: true,
      outDir: "dist",
      rollupOptions: {
        input: {
          newtab: resolve(__dirname, "src/newtab/index.html"),
          background: resolve(__dirname, "src/background/index.ts")
        },
        output: {
          entryFileNames: "[name]/index.js",
          assetFileNames: "[name]/index.[ext]",
          chunkFileNames: "[name]/[name]__[hash].js",
          format: "module"
        }
      }
    }
  })
}));
