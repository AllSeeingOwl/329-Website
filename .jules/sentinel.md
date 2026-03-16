## 2024-03-15 - Broken Text Encoding and XSS via Truncation

**Vulnerability:** XSS risk and broken HTML entities due to applying `substring()` after an `escapeHTML` function.
**Learning:** Truncating HTML-escaped strings can slice through valid HTML entities (like `&amp;`), leaving malformed text or bypassing the escaping entirely if the truncation point splits the entity.
**Prevention:** Always truncate the raw input string _before_ applying the HTML escaping function to preserve entity integrity.

## 2026-03-16 - Custom Security Headers Middleware

**Vulnerability:** Missing HTTP Security Headers (Defense in Depth)
**Learning:** The application's Express backend (`server.js`) implements HTTP security headers (such as CSP, X-Frame-Options, X-Content-Type-Options, and X-XSS-Protection) using custom middleware rather than relying on third-party packages like `helmet` to minimize dependencies.
**Prevention:** When adding or updating global backend responses, always ensure the custom security headers middleware is applied early in the request lifecycle (before body parsers or static file serving) to protect all endpoints without introducing new dependencies.

## 2026-03-16 - Enforce Body Size Limit in express.json

**Vulnerability:** Unbounded Request Body Size.
**Learning:** Default `express.json()` configurations do not limit the size of the request body, which can lead to Denial of Service (DoS) attacks via memory exhaustion if an attacker sends extremely large JSON payloads.
**Prevention:** Always specify a `limit` (e.g., '100kb') when using body-parsing middleware like `express.json()` or `express.urlencoded()` to ensure the server rejects excessively large requests.
