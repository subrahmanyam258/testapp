import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { target: 'es2019', outDir: 'dist-single', assetsInlineLimit: 100000000 },
})
