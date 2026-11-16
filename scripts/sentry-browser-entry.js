// Source for public/vendor/sentry.min.js, the Sentry browser SDK loaded by the
// studio pages only (never the ARG pages). Rebuild with `pnpm run build:sentry`
// after changing this file or updating @sentry/browser.
import { init } from '@sentry/browser';

// Set by /vendor/sentry-config.js, which the server fills in from SENTRY_DSN.
const config = window.SITE_SENTRY;

if (config && config.dsn) {
  init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    // Sentry v11 collects user info (including IP addresses), cookies, headers,
    // query strings and request bodies by default. All of it stays out of Sentry.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
  });
}
