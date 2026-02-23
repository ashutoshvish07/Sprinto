import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://sprinto-production.up.railway.app/',
        changeOrigin: true,
      },
      '/ws': {
        target: 'wss:https://sprinto-production.up.railway.app/',
        ws: true,
        changeOrigin:true,
        secure:true,
      },
    },
  },
})
