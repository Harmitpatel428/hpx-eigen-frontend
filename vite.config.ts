import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from "@sentry/vite-plugin"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: "hpx",
      project: "hpx-eigen-frontend",
    })
  ],
  build: {
    sourcemap: true, // Source map generation must be turned on
  },
})
