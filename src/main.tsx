import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'

import * as Sentry from "@sentry/react";
import { datadogRum } from "@datadog/browser-rum";

Sentry.init({ dsn: "your-dsn" });
datadogRum.init({
  applicationId: 'your-app-id',
  clientToken: 'your-token',
  site: 'datadoghq.com',
  service: 'hpx-eigen-crm',
  env: 'production',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input',
});
datadogRum.startSessionReplayRecording();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
