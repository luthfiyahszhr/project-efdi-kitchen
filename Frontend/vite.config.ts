import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const backendTarget =
    process.env.VITE_BACKEND_URL || fileEnv.VITE_BACKEND_URL || 'http://127.0.0.1:3000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': backendTarget,
        '/csrf': backendTarget,
        '/health': backendTarget,
        '/media': backendTarget,
      },
    },
  }
})
