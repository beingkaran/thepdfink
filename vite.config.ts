import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
    // Account/checkout API lives in Cloudflare Pages Functions — run
    // `npx wrangler pages dev dist --port 8788` alongside `npm run dev`.
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM
      ? process.env.TAURI_ENV_PLATFORM === 'windows'
        ? 'chrome105'
        : 'es2022'
      : 'esnext',
    minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})