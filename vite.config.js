import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/powerbi-proxy': {
        target: 'https://wabi-west-europe-f-primary-api.analysis.windows.net',
        changeOrigin: true,
        rewrite: (_path) => '/public/reports/querydata?synchronous=true',
        headers: {
          'X-PowerBI-ResourceKey': '385e6016-908c-4d32-aec3-82bf62e9726c'
        }
      }
    }
  }
})
