// Sentry error reporting.
// server.ts imports this before anything else so Sentry can hook into Express.
// Sentry stays off unless SENTRY_DSN is set, so local runs and tests send nothing.
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN || '';
const environment = process.env.NODE_ENV || 'development';
// Render sets RENDER_GIT_COMMIT on every deploy, so each error shows which
// commit it came from.
const release = process.env.RENDER_GIT_COMMIT || undefined;

// Sentry v11 collects request bodies, cookies, headers, query strings, user info and
// local variables by default. Here that would include zine passwords, admin sessions
// and players' emails, so every category is switched off; errors keep their stack traces.
const PRIVATE_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  stackFrameVariables: false,
};

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release,
    // Performance tracing is off by default. Set SENTRY_TRACES_SAMPLE_RATE (0 to 1) to turn it on.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0,
    dataCollection: PRIVATE_DATA_COLLECTION,
  });
}

// The origin browsers send error reports to. Only the studio pages' CSP allows it.
let ingestOrigin = '';
if (dsn) {
  try {
    ingestOrigin = new URL(dsn).origin;
  } catch {
    console.error('SENTRY_DSN is not a valid URL; browser error reporting is off.');
  }
}

/** Settings for the studio pages' browser SDK, or null when browser reporting is off. */
const browserSentryConfig = ingestOrigin ? { dsn, environment, release } : null;

export { Sentry, browserSentryConfig, ingestOrigin as sentryIngestOrigin };
