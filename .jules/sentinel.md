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

## 2026-10-08 - [Security Fix] Rate Limiting on Admin Quick-Login Endpoint

**Vulnerability:** The admin quick-login route (`/api/admin/quick-login`) authenticated secret bypass keys without checking or updating rate limiting structures, allowing attackers to bypass standard login rate limits and brute-force bypass keys.
**Learning:** Alternative login routes (such as quick-login/bypass links) must share and enforce the central rate-limiting mechanism (`isRateLimited`, `recordFailedAttempt`, `clearRateLimit`) rather than implementing independent auth handlers without rate checks.
**Prevention:** Always export and apply centralized rate limiting helpers across all authentication routes in the application.

## 2026-10-09 - [Security Fix] Rate Limiting on Public Email Collection Endpoint

**Vulnerability:** The public email collection endpoint (`POST /api/emails/collect`) lacked rate limiting, allowing unauthenticated attackers or bots to flood the endpoint with unlimited requests. This could cause memory exhaustion (OOM DoS), database list bloat, and analytics distortion.
**Learning:** Public data collection endpoints must implement rate limiting with bounded memory stores and O(1) eviction logic so that high-volume automated requests are blocked (HTTP 429) without exhausting server memory.
**Prevention:** Always apply rate limiting with size-bounded Map stores to public POST endpoints.

## 2026-10-12 - [Security Fix] Input and Key Allowlist Validation on Maintenance Config Endpoints

**Vulnerability:** The admin maintenance configuration endpoints (`POST /api/admin/maintenance-config` and `POST /api/admin/maintenance-config/all`) lacked input type checks and key allowlisting. An authenticated attacker or malicious payload could pass arbitrary `key` strings to populate unapproved fields in persistent Redis hash storage (`config:maintenance`), or supply non-boolean `value` types to corrupt internal boolean flags (`MAINTENANCE_MODE`, etc.).
**Learning:** Admin endpoints updating system or feature configuration must explicitly validate property types and check property keys against a strict allowlist before updating database structures or in-memory process flags.
**Prevention:** Always enforce explicit key allowlisting and primitive type validation (`typeof value === 'boolean'`) on administrative configuration endpoints.

## 2026-10-13 - [Security Fix] Admin User Input Sanitization and System Config Bounds

**Vulnerability:** The admin routes extracted `adminUser` in an inconsistent and unsanitized manner, allowing newline/control characters (`\r\n`) and unbounded string lengths (DoS via audit log bloat in Redis and memory), while `validateSystemConfig` lacked upper bound checks on `maxConcurrentSessions` and `sessionTimeout`.
**Learning:** Centralizing user identity extraction in a helper like `getAdminUser(req)` ensures consistent control-character stripping and length truncation across all route handlers before logging or storing audit records.
**Prevention:** Always sanitize control characters and cap string lengths for user identifiers recorded in system audit logs, and enforce upper bound constraints on numeric configuration parameters.

## 2026-10-14 - [Security Fix] Host Header Injection and Sitemap Cache Poisoning Sanitization

**Vulnerability:** The sitemap endpoints (`/sitemap.xml` and `/internal-sitemap.json`) constructed absolute URLs by directly interpolating the unvalidated `req.get('host')` header. An attacker sending requests with a crafted Host header (e.g. containing HTML tags or external domains) could inject arbitrary URLs into generated sitemaps and poison the in-memory sitemap cache for up to 1 hour across all users and crawlers.
**Learning:** Host headers supplied in HTTP requests are untrusted user input. When constructing absolute URLs in cached dynamic endpoints (like XML/JSON sitemaps), the `Host` header must be validated against a strict hostname pattern (`/^[a-zA-Z0-9.-]+(?::\d+)?$/`) and fall back to a safe default if invalid or malformed.
**Prevention:** Always validate and sanitize HTTP Host headers before using them to construct response content or cache keys.

## 2026-10-16 - [Security Fix] Log Injection and Audit Store Bloat Sanitization in Phase Changes

**Vulnerability:** The administrative action audit logger `logPhaseChange()` in `src/routes/admin.ts` incorporated `action` and `targetId` parameters without stripping control characters (`\r\n\t`) or capping string lengths. An attacker sending requests with crafted parameters (e.g. `phaseId` or `id`) containing newline characters could perform Log Injection (CWE-117) to forge fake `[AUDIT TRAIL]` log lines in standard output or exhaust Redis/in-memory audit log storage.
**Learning:** All parameters logged to stdout or stored in audit logs—even those coming from administrative URL or body parameters—must be explicitly sanitized to remove newline/control characters and length-capped before logging or persisting.
**Prevention:** Always strip `[\r\n\t]` and cap string lengths for every parameter included in audit trail logging or persistent audit lists.

## 2026-10-20 - [Security Fix] Control Character Stripping in Email Source Parameter and CSV Cell Sanitization

**Vulnerability:** The public email collection endpoint (`POST /api/emails/collect`) accepted user-supplied `source` parameters without stripping newline or control characters (`[\r\n\t]`). An attacker providing a multi-line `source` parameter containing embedded newlines (e.g., `newsletter\r\n=1+1`) could bypass initial-character CSV formula injection checks in `sanitizeCsvCell` and execute arbitrary spreadsheet formulas or split lines in CSV exports.
**Learning:** `sanitizeCsvCell` only checks if string values start (`^`) with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`). Input containing embedded newline characters can break out of CSV rows and place formula triggers at the beginning of a new line, effectively bypassing initial-character sanitization rules.
**Prevention:** Always strip control characters (`[\r\n\t]`) from user inputs during collection, and ensure `sanitizeCsvCell` replaces embedded newlines with spaces before checking for formula trigger characters.

## 2026-10-22 - [Security Fix] Audit Logging and Admin User Sanitization for Phase Setting Endpoint

**Vulnerability:** The active phase setting endpoint (`POST /api/admin/phases/set`) was implemented directly on `app` in `server.ts` rather than in `src/routes/admin.ts`. As a result, changing active phase state bypassed administrative audit logging (`logPhaseChange`) and user identity sanitization (`getAdminUser`), leaving a gap in the administrative audit trail.
**Learning:** Consolidating all admin routes strictly in `src/routes/admin.ts` ensures that state-changing administrative operations consistently extract/sanitize `adminUser` identifiers and persist audit log records to Redis (`admin:audit_logs`).
**Prevention:** Ensure all admin endpoints are co-located in `src/routes/admin.ts` and explicitly invoke `logPhaseChange` on state-changing operations.

## 2026-10-24 - [Security Enhancement] Input Length Validation on Phase Updates and Puzzle Code Verification

**Vulnerability:** `PUT /api/admin/phases/:phaseId` accepted `name` and `relatedContent` inputs without upper-bound length or array element limits, creating storage bloat and potential DoS risks. Similarly, `POST /api/verify` created Buffer instances and ran timing comparisons on puzzle code inputs of arbitrary length.
**Learning:** Input parameters mapped to persistent object fields (`name`, `relatedContent`) or processed into Buffer instances for cryptographic timing checks must enforce explicit length constraints (e.g., `code.length <= 100`, `name.length <= 200`) to prevent memory/storage exhaustion.
**Prevention:** Always bound array element counts and string parameter lengths on public and administrative endpoints.

## 2026-10-25 - [Security Fix] Input Length Validation on Admin Password, Bypass Key, and Session Token Validation

**Vulnerability:** `verifyPassword` and `verifyBypassKey` in `src/middleware/adminAuth.ts` allocated Buffer instances from input strings via `Buffer.from()` before checking character lengths, creating memory exhaustion risks if sent massive strings. Similarly, `extractSessionToken` and `validateAdminSession` allowed oversized tokens to perform unnecessary Redis lookups.
**Learning:** In authentication routines with constant-time comparisons, string inputs should be length-checked (e.g., `password.length <= 200`, `token.length <= 100`) before converting to Buffer or querying database stores, while maintaining dummy timing comparisons if oversized to prevent side-channel leaks.
**Prevention:** Always validate string input upper bounds before memory allocation or database queries in authentication routines.

## 2026-10-28 - [Security Fix] Open Redirect Prevention on Clean URL Middleware

**Vulnerability:** The legacy `.html` redirect middleware in `server.ts` stripped `.html` from `req.path` and issued `res.redirect(301, cleanPath + query)`. When an attacker supplied a request with a leading double slash (e.g. `//evil.com/test.html`), `cleanPath` evaluated to `//evil.com/test`, resulting in an Open Redirect (CWE-601) to a protocol-relative external URL.
**Learning:** Redirect targets constructed from request paths must be sanitized by stripping leading slashes and backslashes (`/^[/\\]+/`) before prepending a single `/` to ensure the redirect target is strictly interpreted as a relative path on the same host.
**Prevention:** Always sanitize dynamic redirect target paths to ensure they begin with a single `/` and cannot be abused as protocol-relative URLs (`//`).
