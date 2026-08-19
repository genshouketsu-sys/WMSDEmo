import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import os from 'os'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

// When PORT is provided by the hosting/preview environment (e.g. the v0
// preview proxies http on 3000), serve plain http on that port. Otherwise keep
// the original local-dev setup: https on 5173 (needed for the camera-based QR
// scanner). This keeps local development unchanged while making the preview work.
const envPort = process.env.PORT ? Number(process.env.PORT) : null
const useHttps = envPort === null

export default defineConfig({
  define: {
    __LOCAL_IP__: JSON.stringify(getLocalIP()),
  },
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    ...(useHttps ? [basicSsl()] : [])
  ],
  server: {
    host: '0.0.0.0',
    port: envPort ?? 5173,
    https: useHttps,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:8081',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  }
})
