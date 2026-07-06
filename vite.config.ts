import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const clientEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const envDefine: Record<string, string> = {}
  for (const [key, value] of Object.entries(clientEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value)
  }

  const port = parseInt(env.VITE_PORT || '5173', 10)
  const isDev = mode === 'development'

  return {
    define: envDefine,
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
