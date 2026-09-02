import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: {
      allow: [currentDir, resolve(currentDir, "..")]
    },
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: "127.0.0.1"
  },
  build: {
    outDir: resolve(currentDir, "../wwwroot"),
    assetsDir: "assets/react",
    emptyOutDir: true
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"]
  }
});
