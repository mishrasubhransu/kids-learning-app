import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Vercel serverless functions (api/) don't exist in the Vite dev
    // server. For local testing run `npx vercel dev --listen 3000` in a
    // second terminal and this forwards /api there; without it, /api calls
    // fail silently (name audio etc.) but the app works normally.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
