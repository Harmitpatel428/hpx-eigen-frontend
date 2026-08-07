import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.httpClientIntegration(),
    Sentry.captureConsoleIntegration({ levels: ['error'] })
  ],
  tracesSampleRate: 1.0, // Set to 100% for now to catch everything
  environment: import.meta.env.MODE,
  // Ensure unhandled promise rejections are caught
  beforeSend(event) {
    return event;
  }
});

createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary fallback={<p>An error occurred.</p>}>
    <App />
  </Sentry.ErrorBoundary>,
)
