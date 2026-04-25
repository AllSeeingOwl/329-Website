## 2025-04-25 - [Security Enhancement] Adding XSS Protection and Upgrade-Insecure-Requests

**Vulnerability:** The application lacked some defense-in-depth headers for XSS protection and ensuring all requests are upgraded to HTTPS. While a restrictive CSP was already present, `upgrade-insecure-requests` was missing, and `X-XSS-Protection` was not set for legacy browsers.
**Learning:** Adding or modifying security headers in the Express application (`server.ts`) requires concurrent updates to the Jest test assertions (`server.test.js`), as the test suite strictly enforces the exact string match of the `content-security-policy` and other headers.
**Prevention:** Always verify test suites when updating global security headers and ensure any changes to `server.ts` are reflected in `server.test.js`.
