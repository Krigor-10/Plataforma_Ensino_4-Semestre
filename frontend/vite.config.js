import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    // Rede de seguranca contra imagem pesada demais indo pro build de novo -
    // comprime no build, sem exigir que quem sobe um asset novo lembre de
    // otimizar na mao (ver auditoria de prontidao pra Azure: as imagens de
    // curso foram commitadas em resolucao de foto de banco de imagens, ate
    // 7,5MB cada).
    ViteImageOptimizer({
      // So raster (foto/thumbnail de curso) - os poucos SVGs do projeto sao
      // icone/placeholder, ja pequenos, e otimiza-los exigiria instalar o
      // svgo so por isso.
      test: /\.(jpe?g|png|webp)$/i,
      jpg: { quality: 78 },
      jpeg: { quality: 78 },
      png: { quality: 78 },
      webp: { quality: 78 }
    })
  ],
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
