import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      store: fileURLToPath(new URL('./src/store', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['@/config.js'],
  },
  define: {
    'process.env': process.env,
  },
})
