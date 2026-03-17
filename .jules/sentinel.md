## 2024-03-15 - Broken Text Encoding and XSS via Truncation
**Vulnerability:** XSS risk and broken HTML entities due to applying `substring()` after an `escapeHTML` function.
**Learning:** Truncating HTML-escaped strings can slice through valid HTML entities (like `&amp;`), leaving malformed text or bypassing the escaping entirely if the truncation point splits the entity.
**Prevention:** Always truncate the raw input string *before* applying the HTML escaping function to preserve entity integrity.

## 2026-03-16 - Custom Security Headers Middleware
**Vulnerability:** Missing HTTP Security Headers (Defense in Depth)
**Learning:** The application's Express backend (`server.js`) implements HTTP security headers (such as CSP, X-Frame-Options, X-Content-Type-Options, and X-XSS-Protection) using custom middleware rather than relying on third-party packages like `helmet` to minimize dependencies.
**Prevention:** When adding or updating global backend responses, always ensure the custom security headers middleware is applied early in the request lifecycle (before body parsers or static file serving) to protect all endpoints without introducing new dependencies.

## 2026-03-16 - Timing Attack on Password Verification
**Vulnerability:** Timing attack via strict equality (`===`) comparison for authentication passwords in `/api/verify`.
**Learning:** Comparing sensitive strings character-by-character using `===` allows attackers to infer the password length and content by measuring response times.
**Prevention:** Always use `crypto.timingSafeEqual` for comparing passwords or tokens, and ensure inputs are padded or handled with dummy comparisons if lengths mismatch to prevent length-based timing leaks.
