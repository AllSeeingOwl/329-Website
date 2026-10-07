## 2025-04-25 - [Security Enhancement] Adding XSS Protection and Upgrade-Insecure-Requests

**Vulnerability:** The application lacked some defense-in-depth headers for XSS protection and ensuring all requests are upgraded to HTTPS. While a restrictive CSP was already present, `upgrade-insecure-requests` was missing, and `X-XSS-Protection` was not set for legacy browsers.
**Learning:** Adding or modifying security headers in the Express application (`server.ts`) requires concurrent updates to the Jest test assertions (`server.test.js`), as the test suite strictly enforces the exact string match of the `content-security-policy` and other headers.
**Prevention:** Always verify test suites when updating global security headers and ensure any changes to `server.ts` are reflected in `server.test.js`.

## 2025-05-15 - [Security Fix] Hardcoded Mock Password in Client-Side JS

**Vulnerability:** The application contained a hardcoded mock password and a fallback authentication mechanism in client-side JavaScript (`public/mltk_login_utils.js`). This allowed users to discover the password by inspecting the source code and bypass backend API authentication if the API was induced to fail.
**Learning:** Client-side authentication logic should never contain hardcoded secrets or fallbacks that bypass server-side validation, even for "static deployment" convenience, as they are trivially discoverable.
**Prevention:** Strictly enforce server-side authentication and remove any "fallback" logic that relies on client-side secrets.

## 2026-10-06 - [Security Fix] Rate Limit Map Bounding and O(1) Eviction

**Vulnerability:** The admin login handler in `src/middleware/adminAuth.ts` maintained an in-memory `rateLimitMap` without a size bound. An attacker sending requests with spoofed IP addresses could grow the map indefinitely, leading to memory exhaustion and Denial of Service (DoS).
**Learning:** In-memory rate-limiting maps in Node.js/Express applications must explicitly cap maximum size and implement an eviction strategy (such as deleting the oldest entry via Map insertion order iterator) to remain safe against IP spoofing DoS attacks.
**Prevention:** Always bound Map structures used for rate limiting or session tracking when backed by in-memory stores.

## 2026-10-07 - [Security Fix] CSV Formula Injection Sanitization

**Vulnerability:** The admin email export endpoint (`GET /api/admin/emails/export`) generated CSV downloads directly from user-submitted email addresses and source parameters without sanitizing cell values starting with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`). An attacker submitting malicious input (e.g. via `POST /api/emails/collect`) could trigger CSV/Formula Injection (CWE-1236) when an administrator opens the exported file in spreadsheet applications like Excel or Google Sheets.
**Learning:** All user-supplied text exported to CSV format must be sanitized by prepending a single quote (`'`) to any cell string starting with formula trigger characters, ensuring the spreadsheet software treats the value strictly as literal text.
**Prevention:** Always apply cell sanitization to user-generated data prior to generating downloadable CSV files.
