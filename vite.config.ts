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
    server: {
      port,
      proxy: isDev ? {
        '/api': {
          target: 'https://gohotel-gohotel-backend-lhyen5-ecceab-13-140-185-49.sslip.io/',
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
