import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Disable dependency pre-bundling for vis-timeline so you can debug it
  optimizeDeps: {
    exclude: ['vis-timeline'],
  },
})