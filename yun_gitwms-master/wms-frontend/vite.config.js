import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import basicSsl from '@vitejs/plugin-basic-ssl'
import os from 'os'

// 获取本机局域网 IP 地址
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

// https://vite.dev/config/
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
    https: false,
    proxy: {
      // 将 /api 请求代理到后端，解决 HTTPS→HTTP 混合内容问题
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      // 将 WebSocket 请求也代理到后端
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  }
})
