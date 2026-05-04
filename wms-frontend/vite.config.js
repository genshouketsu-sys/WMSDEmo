cat << 'EOF' > /Volumes/Lexar / wmsdemo / SpeedWMS / wms - frontend / vite.config.js
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import os from 'os'
import basicSsl from '@vitejs/plugin-basic-ssl'

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

export default defineConfig({
  define: {
    __LOCAL_IP__: JSON.stringify(getLocalIP()),
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    basicSsl()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  }
})
EOF