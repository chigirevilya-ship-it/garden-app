import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// One-file demo build (fonts and all assets inlined): npx vite build -c vite.demo.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: 'dist-demo',
    assetsInlineLimit: 100_000_000,
  },
})
