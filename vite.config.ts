import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,

    // //optional
    // cors: true,
    // // Fix for dynamic imports over network
    // origin: 'http://192.168.1.10:5173',
    // hmr: {
    //   host: '192.168.1.10',
    //   port: 5173,
    // },
  },
})
