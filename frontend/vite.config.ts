import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permet l'accès depuis le réseau local
    port: 5174,
    // Optional dev proxy to bypass CORS while keeping API_URL=/api locally
    proxy: {
      '/api': {
        target: 'https://biblio-h6ji.onrender.com',
        changeOrigin: true,
        secure: true,
        // Remove /api prefix when forwarding
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0', // Permet l'accès au build via le réseau local
    port: 4173,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-pdf': ['react-pdf', 'pdfjs-dist'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-ui': ['lucide-react']
        }
      }
    }
  }
})
