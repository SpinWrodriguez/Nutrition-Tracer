import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// One id per build, stamped into the bundle (__BUILD_ID__) and written to dist/version.json,
// so the running app can detect a newer deploy (see src/hooks/useUpdateCheck.js).
const BUILD_ID = Date.now().toString(36)

const versionFile = () => ({
  name: 'emit-version-json',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) })
  },
})

export default defineConfig({
  plugins: [react(), versionFile()],
  base: '/Nutrition-Tracer/',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  build: {
    rollupOptions: {
      output: {
        // recharts is only used by the Progress tab; keep it out of the initial bundle
        manualChunks: { recharts: ['recharts'] },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
