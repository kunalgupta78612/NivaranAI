import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // When your Express backend is running, this forwards /api to it.
      '/api': { target: 'http://localhost:4000', changeOrigin: true }
    }
  }
})
