import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // The Amplify sandbox rewrites files under .amplify/artifacts while
    // running; Vite's watcher picking those up races it and causes EPERM
    // rename errors on Windows.
    watch: {
      ignored: ['**/.amplify/**'],
    },
  },
})
