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
  }
})