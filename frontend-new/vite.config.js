import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    entries: ['src/**/*.{js,jsx,ts,tsx}'],
  },
  build: {
    // Lower warning threshold from 600KB to 400KB to catch unoptimized chunks
    chunkSizeWarningLimit: 400,
    // Use default Rollup minification (no need for terser)
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor/react-core';
          }

          if (id.includes('/@reduxjs/') || id.includes('/react-redux/') || id.includes('/redux/')) {
            return 'vendor/state-mgmt';
          }

          if (id.includes('/react-router/') || id.includes('/react-router-dom/')) {
            return 'vendor/router';
          }

          if (
            id.includes('/framer-motion/') ||
            id.includes('/motion-dom/') ||
            id.includes('/motion-utils/')
          ) {
            return 'vendor/motion';
          }

          if (
            id.includes('/recharts/') ||
            id.includes('/d3-') ||
            id.includes('/victory-vendor/')
          ) {
            return 'vendor/charts';
          }

          if (
            id.includes('/jspdf/') ||
            id.includes('/html2canvas/') ||
            id.includes('/canvg/') ||
            id.includes('/dompurify/') ||
            id.includes('/svg-pathdata/')
          ) {
            return 'vendor/pdf';
          }

          if (
            id.includes('/exceljs/') ||
            id.includes('/xlsx/') ||
            id.includes('/pako/') ||
            id.includes('/fflate/')
          ) {
            return 'vendor/excel';
          }

          if (
            id.includes('/axios/') ||
            id.includes('/lucide-react/') ||
            id.includes('/@react-oauth/')
          ) {
            return 'vendor/common';
          }

          return 'vendor/misc';
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    // Optimize HMR for faster dev reload on file changes
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    },
    watch: {
      // Don't watch build output directories - prevents unnecessary rebuilds
      ignored: ['**/android/**', '**/ios/**', '**/dist/**', '**/node_modules/**']
    }
  }
})
