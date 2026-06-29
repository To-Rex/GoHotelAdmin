import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const port = parseInt(env.VITE_PORT || '5173', 10)
  const isDev = mode === 'development'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '/api/v1'),
      'import.meta.env.VITE_API_BASE': JSON.stringify(env.VITE_API_BASE || 'http://localhost:8000'),
    },
    server: {
      port,
      proxy: isDev ? {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      } : undefined,
    },
    preview: {
      port: parseInt(env.VITE_PORT || '5173', 10),
      host: true,
      allowedHosts: true,
    },
  }
})
