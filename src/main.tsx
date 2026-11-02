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

// Self-heal: unregister any previously-installed service worker + clear its caches. The offline SW was
// caching a stale app shell; removing it on load fixes browsers that still have it registered.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
  if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
}
