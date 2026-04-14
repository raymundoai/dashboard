import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'react-core'
          }

          if (id.includes('/react-router-dom/') || id.includes('/@tanstack/')) {
            return 'router-query'
          }

          if (
            id.includes('/@base-ui/') ||
            id.includes('/class-variance-authority/') ||
            id.includes('/clsx/') ||
            id.includes('/tailwind-merge/') ||
            id.includes('/lucide-react/')
          ) {
            return 'ui-kit'
          }

          if (
            id.includes('/recharts/') ||
            id.includes('/d3-') ||
            id.includes('/internmap/') ||
            id.includes('/victory-vendor/')
          ) {
            return 'charts-vendor'
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
