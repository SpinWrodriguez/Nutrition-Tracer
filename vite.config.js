import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Nutrition-Tracer/',
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
