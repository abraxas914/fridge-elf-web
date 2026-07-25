import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const outDir =
  process.env.WEB_OUT_DIR ?? fileURLToPath(new URL('./dist', import.meta.url))
const isRetinboxBuild = process.env.RTH_BUILD === '1'

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2017',
    rollupOptions: {
      output: {
        codeSplitting: !isRetinboxBuild,
      },
    },
  },
})
