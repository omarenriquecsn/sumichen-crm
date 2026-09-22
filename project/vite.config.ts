import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  // 👇 importante para fallback en el deploy
  server: {
  // @ts-expect-error historyApiFallback is not typed in @vitejs/plugin-react
historyApiFallback: true,
  // Permite exponer el dev server por un quick tunnel de Cloudflare (demo remota).
  allowedHosts: ['.trycloudflare.com'],
  // Todo lo que el frontend pide a VITE_BACKEND_URL (=/api) se reenvía al backend local.
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api/, ''),
    },
  },
  }
})