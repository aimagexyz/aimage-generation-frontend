import 'mac-scrollbar/dist/mac-scrollbar.css';

import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from '@/App';
import { SENTRY_DSN, SENTRY_ENVIRONMENT } from '@/constants/env';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ['localhost', /^https:\/\/app\.aimage\.xyz/, /^https:\/\/api\.aimage\.xyz/],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    environment: SENTRY_ENVIRONMENT,
  });
}

const root = document.getElementById('root');
if (root) {
  const rootContainer = ReactDOM.createRoot(root);
  rootContainer.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
