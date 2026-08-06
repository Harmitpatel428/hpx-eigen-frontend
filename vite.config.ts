import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from "@sentry/vite-plugin"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      // Only load Sentry plugin when auth token is present (skips upload warnings in CI)
      ...(env.SENTRY_AUTH_TOKEN
        ? [sentryVitePlugin({
            org: "hpx",
            project: "hpx-eigen-frontend",
            authToken: env.SENTRY_AUTH_TOKEN,
          })]
        : []),
    ],
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 1600,
    },
  }
})
