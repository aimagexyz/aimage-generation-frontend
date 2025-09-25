export const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL;

export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
export const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || GOOGLE_CLIENT_ID;
export const CHAT_BOT_URL = import.meta.env.VITE_CHAT_BOT_URL;
