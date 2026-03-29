## 2024-03-15 - Broken Text Encoding and XSS via Truncation

**Vulnerability:** XSS risk and broken HTML entities due to applying `substring()` after an `escapeHTML` function.
**Learning:** Truncating HTML-escaped strings can slice through valid HTML entities (like `&amp;`), leaving malformed text or bypassing the escaping entirely if the truncation point splits the entity.
**Prevention:** Always truncate the raw input string _before_ applying the HTML escaping function to preserve entity integrity.

## 2026-03-16 - Custom Security Headers Middleware

**Vulnerability:** Missing HTTP Security Headers (Defense in Depth)
**Learning:** The application's Express backend (`server.js`) implements HTTP security headers (such as CSP, X-Frame-Options, X-Content-Type-Options, and X-XSS-Protection) using custom middleware rather than relying on third-party packages like `helmet` to minimize dependencies.
**Prevention:** When adding or updating global backend responses, always ensure the custom security headers middleware is applied early in the request lifecycle (before body parsers or static file serving) to protect all endpoints without introducing new dependencies.

## 2026-03-16 - Timing Attack on Password Verification

**Vulnerability:** Timing attack via strict equality (`===`) comparison for authentication passwords in `/api/verify`.
**Learning:** Comparing sensitive strings character-by-character using `===` allows attackers to infer the password length and content by measuring response times.
**Prevention:** Always use `crypto.timingSafeEqual` for comparing passwords or tokens, and ensure inputs are padded or handled with dummy comparisons if lengths mismatch to prevent length-based timing leaks.

## 2026-03-17 - Algorithmic Complexity DoS in Rate Limiter

**Vulnerability:** Algorithmic complexity (CPU exhaustion) and memory DoS via an unbounded or eagerly-iterated IP rate limit map.
**Learning:** Iterating over a `Map` of IPs on every request when a size threshold is reached creates an O(N) loop per request. Attackers can exploit this by flooding requests with unique IPs, permanently keeping the map at the threshold and causing high CPU load.
**Prevention:** Use an O(1) eviction policy (like deleting `keys().next().value`) to enforce hard size limits without iterating over the entire collection on the request path.

## 2026-03-17 - Unbounded Request Body Size (express.json)

**Vulnerability:** Unbounded request body size leading to Denial of Service (DoS) attacks via memory exhaustion.
**Learning:** Using `express.json()` or `express.urlencoded()` without a limit allows attackers to send massive JSON or URL-encoded payloads, consuming server memory and potentially crashing the application. To prevent Denial of Service (DoS) attacks via memory exhaustion, always specify a `limit` (e.g., '100kb') when using body-parsing middleware in Express applications.
**Prevention:** Always configure `express.json({ limit: '100kb' })` and `express.urlencoded({ extended: true, limit: '100kb' })` with a reasonable size limit based on application needs to reject oversized payloads.

## 2024-05-24 - [Information Leakage / Missing HSTS]

**Vulnerability:** Express defaults to leaking its framework presence via the `X-Powered-By: Express` header, and the application was missing Strict-Transport-Security (HSTS) enforcement.
**Learning:** These defaults in Express can aid attackers in footprinting the application and leave users vulnerable to downgrade attacks. The backend needs defense-in-depth even for ARG web apps.
**Prevention:** Always use `app.disable('x-powered-by')` or `helmet` to hide framework fingerprints, and enforce HTTPS by default using HSTS headers.

## 2026-06-25 - Unhandled URIError DoS via decodeURIComponent

**Vulnerability:** Denial of Service (DoS) and potential information disclosure via unhandled `URIError` exceptions when parsing request paths.
**Learning:** Built-in JavaScript functions like `decodeURIComponent` throw a `URIError` when encountering malformed URI encoding (e.g., `%ff`). If called directly on `req.path` within Express middleware without a `try...catch` block, it bypasses standard error handlers, crashing the request or bubbling up to the default Express error handler which might expose stack traces in development/testing.
**Prevention:** Always wrap `decodeURIComponent` calls in a `try...catch` block when processing untrusted user input or request paths, and handle the error gracefully (e.g., returning a `400 Bad Request`).

## 2026-11-20 - Unbounded Input Lengths (Defense in Depth)

**Vulnerability:** Missing input length limitations (`maxlength`) on form elements (e.g., text, email, textarea).
**Learning:** Allowing unbounded input from the frontend can increase the risk of excessively large payloads being submitted, which may contribute to DoS conditions or performance degradation, even if the backend ultimately has a payload limit. Adding limits to the frontend adds a layer of defense-in-depth.
**Prevention:** As a defense-in-depth security measure against client-side DoS and excessively large payloads, always explicitly define reasonable `maxlength` attributes on HTML `<input>` and `<textarea>` form elements.

## 2026-12-05 - Missing Cache Control Headers for Sensitive Content

**Vulnerability:** Sensitive API responses or authenticated views can be cached by browsers, proxies, or CDNs if explicit cache prevention directives are not used, leading to information disclosure.
**Learning:** A global Express middleware handles setting security headers. Including `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, and `Expires: 0` alongside the existing CSP and XSS headers provides robust defense-in-depth against unauthorized data recovery via local or network caches.
**Prevention:** Always explicitly define `Cache-Control` directives in the global security headers middleware to ensure sensitive data (such as decrypted ARG files or tokenized paths) is not inadvertently stored offline or in proxy caches.

## 2024-05-24 - Cross-Origin Information Leakage (Referrer-Policy)

**Vulnerability:** Missing `Referrer-Policy` header can leak sensitive URL paths or tokens across origins when users navigate away from the application.
**Learning:** Browsers by default may send the full URL of the referring page to the destination site. Setting the `Referrer-Policy` header to `strict-origin-when-cross-origin` ensures that only the origin is sent for cross-origin requests, protecting sensitive path information while still allowing full referrers for same-origin requests.
**Prevention:** Always include `Referrer-Policy: strict-origin-when-cross-origin` in the global security headers middleware to enhance user privacy and prevent cross-origin information leakage.

## 2024-05-24 - Client-Side Rate Limiting for Simulated Forms

**Vulnerability:** Missing client-side rate limiting on simulated frontend forms allows users to spam submissions, potentially causing client-side Denial of Service (DoS) or performance degradation.
**Learning:** Simulated frontend forms (e.g., ticket submissions) can be spammed by users if there is no client-side rate limiting, leading to unnecessary DOM updates and potential performance issues. Adding a simple `localStorage`-based rate limit provides a layer of defense-in-depth against client-side DoS.
**Prevention:** Implement client-side rate limiting using `localStorage` to track submission timestamps and prevent rapid subsequent submissions, ensuring the corresponding error message is accessible to screen readers (e.g., using `role="alert"` and `aria-live="polite"`).
