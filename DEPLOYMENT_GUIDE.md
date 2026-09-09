# Deployment Guide: Migrating from Vercel to Railway

This document provides a comprehensive guide for migrating the **3minsto9 ARG & Web Application** from Vercel to **Railway.app**.

---

## Executive Summary & Why Vercel Wasn't Suitable

While Vercel is an exceptional platform for frontend hosting and serverless Jamstack applications, the 3minsto9 project required architectural changes that made serverless execution on Vercel suboptimal:

1. **Stateful Admin & Long-Lived Session Overhead**: Vercel functions are short-lived serverless functions (lambda execution). Stateful features such as in-memory fallback caches, active session state handling, rate-limiting windows per client IP across multiple concurrent admin API requests, and long-lived background connections perform significantly better on a persistent Node.js process.
2. **Serverless Cold Starts & Timeout Limits**: Admin operations (e.g., email export, audit log streaming, bulk system configuration changes) occasionally hit cold starts or execution timeout limits imposed on free/standard serverless tiers.
3. **500 Cascade Failures on Unhandled Errors**: In Vercel's `@vercel/node` routing model (`vercel.json` routing all traffic `/(.*)` to `server.ts`), unhandled exceptions at boot time or missing environment configurations can crash the entire function runtime, rendering all static HTML files unserviceable. On Railway, Express runs as a dedicated daemon process managed by process orchestrators.

---

## 1. Pre-Deployment Checklist

Before initiating the migration to Railway, verify and complete all requirements below.

### Environment Variables Needed

Gather all production secrets and configurations:

| Variable Name              | Description                                               | Example / Recommended Value                           |
| -------------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| `NODE_ENV`                 | Mode for Express execution                                | `production`                                          |
| `PORT`                     | HTTP port assigned dynamically                            | Handled automatically by Railway (defaults to `3000`) |
| `ADMIN_PASSWORD`           | Password required for `/api/admin/authenticate`           | _Strong random secret_                                |
| `UPSTASH_REDIS_REST_URL`   | Upstash Redis REST API endpoint URL                       | `https://your-upstash-redis-url.upstash.io`           |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST auth token                             | `your_upstash_redis_rest_token_here`                  |
| `KV_REST_API_URL`          | Alias for Upstash Redis URL (backward compatibility)      | Same as `UPSTASH_REDIS_REST_URL`                      |
| `KV_REST_API_TOKEN`        | Alias for Upstash Redis token (backward compatibility)    | Same as `UPSTASH_REDIS_REST_TOKEN`                    |
| `AUTH_PASSWORD`            | Access gate password for ARG verification (`/api/verify`) | `0408-1998-XXXX`                                      |
| `MAINTENANCE_MODE`         | Global maintenance flag (`true` / `false`)                | `false`                                               |
| `STUDIO_MAINTENANCE_MODE`  | Studio maintenance flag (`true` / `false`)                | `false`                                               |
| `MLTK_MAINTENANCE_MODE`    | MLTK/ARG maintenance flag (`true` / `false`)              | `false`                                               |
| `EMERGENCY_LOCKDOWN`       | Global emergency lockdown flag (`true` / `false`)         | `false`                                               |
| `STOREFRONT_URL`           | Storefront external link                                  | `https://store.3minsto9.co.uk`                        |

### Local Testing Steps

Validate the build and server execution locally before triggering a Railway build:

1. **Clean Installation & Build**:

   ```bash
   pnpm install
   pnpm run build
   ```

   _Verify that TypeScript compiles without errors (`tsc`) and Vite bundles assets into `dist/`._

2. **Run Production Server Locally**:

   ```bash
   NODE_ENV=production ADMIN_PASSWORD=test_admin_pass PORT=3000 node dist/server.js
   ```

3. **Verify Local Endpoints**:
   - Access home page: `http://localhost:3000/`
   - Access admin panel: `http://localhost:3000/admin/index.html`
   - Test admin authentication:
     ```bash
     curl -X POST http://localhost:3000/api/admin/authenticate \
       -H "Content-Type: application/json" \
       -d '{"password": "test_admin_pass"}'
     ```

4. **Run Unit & Automated Verification**:
   ```bash
   pnpm run typecheck
   pnpm test
   ```

### Backup Current State

1. **Redis Database Backup**:
   - Log into [Upstash Console](https://console.upstash.com/).
   - Select your Redis database instance.
   - Click **Data Browser** and export or capture keys (`emails:captured`, `config:phases`, `config:system`, `admin:audit_logs`).
   - Create a manual database snapshot / backup in Upstash settings.

2. **Download Email Subscriptions**:
   - If Vercel instance is still live, call `GET /api/admin/emails/export` with valid admin credentials to save `collected_emails.csv`.

---

## 2. Railway.app Setup

Follow these step-by-step instructions to create and launch the project on Railway.

### Step-by-Step Railway Project Creation

1. Log in to [Railway.app](https://railway.app/).
2. From the Railway Dashboard, click **+ New Project**.
3. Select **Deploy from GitHub repo**.
4. If you have not authorized Railway on GitHub, click **Configure GitHub App** and grant Railway read/write access to your repository (`329-Website` / `3minsto9-arg`).

### Connecting GitHub Repository

1. Select your repository from the list: `329-Website`.
2. Select the branch to deploy (e.g., `main`).
3. Click **Deploy Now** (the initial deployment may fail or stay pending until environment variables are configured).

### Setting Environment Variables

1. Click on the newly created Service block in your Railway project canvas.
2. Select the **Variables** tab.
3. Click **Raw Editor** or add variables individually:
   ```env
   NODE_ENV=production
   ADMIN_PASSWORD=your_secure_admin_password_here
   UPSTASH_REDIS_REST_URL=https://your-upstash-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token_here
   KV_REST_API_URL=https://your-upstash-redis-url.upstash.io
   KV_REST_API_TOKEN=your_upstash_redis_rest_token_here
   AUTH_PASSWORD=0408-1998-XXXX
   MAINTENANCE_MODE=false
   ```
4. Click **Save and Deploy**.

### Deploying from Main Branch

Railway automatically uses the project's repository configuration:

- **Build Phase**: Railway runs the `build` script in `package.json`: `tsc && vite build && cp -r public/* dist/public/`.
- **Start Phase**: Railway reads `Procfile` (`web: node dist/server.js`) and launches the Node process.

You can monitor the deployment status in the **Deployments** tab of your Railway service.

### Custom Domain Setup

1. Navigation: Go to **Settings** -> **Networking** -> **Custom Domains**.
2. Click **+ Custom Domain**.
3. Enter your domain name (e.g., `3minsto9.co.uk` or `app.3minsto9.co.uk`).
4. Railway will generate DNS records required for host verification:
   - **CNAME Record**: `your-domain.up.railway.app` (or A/AAAA IP addresses provided by Railway).

### SSL Certificate Configuration

- Railway automatically provisions and renews TLS/SSL certificates via **Let's Encrypt** as soon as DNS propagation completes.
- No manual SSL setup is required. Check the domain status in **Settings** -> **Networking** until it displays a green **Active** badge.

---

## 3. Verification Steps

Perform the following verification suite after Railway completes deployment to ensure everything is running smoothly.

### 1. Test Public Website

- Visit your Railway public domain (e.g., `https://your-app.up.railway.app/`).
- Verify the main homepage (`/public/index.html` / surface home page) loads correctly with CSS styles and scripts intact.
- Verify ARG pages load correctly (e.g., `/secure-data-drop-page.html`).

### 2. Test Admin Login Endpoint

Execute an HTTP request to verify the authentication endpoint:

```bash
curl -i -X POST https://your-app.up.railway.app/api/admin/authenticate \
  -H "Content-Type: application/json" \
  -d '{"password": "YOUR_CONFIGURED_ADMIN_PASSWORD"}'
```

**Expected Outcome**:

- Status: `200 OK`
- Header: `Set-Cookie: admin_session=...; HttpOnly; Secure; SameSite=Strict`
- Response Body: `{"success": true, "message": "Authenticated"}`

### 3. Test Admin Dashboard

1. Open browser navigation to `https://your-app.up.railway.app/admin/index.html`.
2. Enter the admin password configured in `ADMIN_PASSWORD`.
3. Confirm access to phase management, system configuration, email collections, and audit trail tabs.

### 4. Test Email Export

1. Authenticate in the admin dashboard.
2. Click **Export Emails CSV** or run:
   ```bash
   curl -i -H "X-Admin-Password: YOUR_CONFIGURED_ADMIN_PASSWORD" \
     https://your-app.up.railway.app/api/admin/emails/export
   ```
3. Confirm that a `collected_emails.csv` file downloads with HTTP header `Content-Type: text/csv`.

### 5. Check Redis Connection

1. Access the maintenance endpoint via admin credentials:
   ```bash
   curl -s -H "X-Admin-Password: YOUR_CONFIGURED_ADMIN_PASSWORD" \
     https://your-app.up.railway.app/api/admin/maintenance
   ```
2. Verify response includes `"storageBackend": "connected"` (or `"connected"` via Upstash Redis).

---

## 4. Rollback Plan

If critical issues arise during or after migration, follow these steps to revert safely.

### How to Revert to Vercel

1. **DNS Re-pointing**:
   - Access your DNS provider (e.g., Cloudflare, Namecheap, GoDaddy).
   - Change the CNAME record for `3minsto9.co.uk` back to `cname.vercel-dns.com` (or Vercel A records `76.76.21.21`).

2. **Vercel Re-deployment**:
   - Open [Vercel Dashboard](https://vercel.com/).
   - Select the `329-website` project.
   - Under **Deployments**, locate the last stable production deployment prior to migration.
   - Click **...** -> **Redeploy to Production**.

### Database Backup & Sync Procedures

1. Since state (phases, system config, collected emails, audit logs) is stored externally in **Upstash Redis**, database state is preserved independently of the runtime platform (Vercel or Railway).
2. If schema or key structures were modified during migration on Railway, restore the Redis backup exported during the Pre-Deployment checklist using the Upstash Data Browser.

### Staging & Railway Preview Deployments

- **PR Preview Environments**: Railway automatically builds preview deployments for open Pull Requests if enabled under project **Settings** -> **PR Deployments**.
- **Staging Service**: Create a secondary service on Railway (e.g., `3minsto9-staging`) connected to the `develop` branch with its own isolated environment variables to test infrastructure changes safely before main branch releases.

---

## 5. Ongoing Maintenance

### Monitoring Logs on Railway

1. Open Railway Dashboard -> Service -> **Logs**.
2. Railway provides real-time streaming logs for stdout/stderr.
3. Use log filters to search for `[AUDIT TRAIL]` or Express error logs (`console.error`).

### Updating Environment Variables

1. Navigate to Service -> **Variables**.
2. Add or update key-value pairs.
3. Railway triggers an automatic rolling re-deployment whenever environment variables change.

### Scaling Options

- **Vertical Scaling**: Under **Settings** -> **Resources**, adjust CPU and RAM limits (e.g., from default 8 GB / 8 vCPU max auto-scale).
- **Horizontal Scaling**: Node Express instance horizontal scaling can be configured on higher Railway plans. Note that rate-limiting fallback maps and session state rely on Redis (`@upstash/redis`), making multi-instance setups fully coherent.

### Database / Redis Maintenance

- Routinely inspect Redis usage in [Upstash Console](https://console.upstash.com/).
- Audit logs in Redis are automatically trimmed to the 100 most recent entries (`ltrim admin:audit_logs 0 99`).
- Perform periodic CSV exports of collected emails (`GET /api/admin/emails/export`) and clear obsolete test emails if required (`POST /api/admin/emails/clear`).

---

## 6. Security Best Practices for Admin Panel

1. **Strong Passwords**: Ensure `ADMIN_PASSWORD` is a cryptographically strong random string (at least 32 characters) in production.
2. **Session Security**: Session tokens generated via `crypto.randomBytes(32)` expire after 15 minutes. Ensure production runs under HTTPS so `res.cookie('admin_session', ...)` sets the `Secure` flag.
3. **IP Rate Limiting**: The admin authentication endpoint (`POST /api/admin/authenticate`) enforces strict IP rate limiting (maximum 5 failed login attempts per 15-minute window).
4. **Audit Logging**: All administrative actions (phase activations, system configuration updates, email exports, email deletions) are written to persistent audit logs (`admin:audit_logs`).
5. **Reverse Proxy Headers**: `app.set('trust proxy', 1)` is configured in Express to reliably capture client IP addresses from `X-Forwarded-For` without IP spoofing risks.

---

## 7. Troubleshooting Common Issues

### Issue 1: Server fails to start on Railway (`Error: EADDRINUSE` or Port Binding Failure)

- **Cause**: Hardcoding port `3000` instead of respecting Railway's dynamic `process.env.PORT`.
- **Solution**: Ensure `server.ts` uses `process.env.PORT || 3000` (already configured in codebase).

### Issue 2: Static assets / HTML pages return 404

- **Cause**: Assets were not copied to the `dist/` directory during build.
- **Solution**: Verify `package.json` contains `"build": "tsc && vite build && cp -r public/* dist/public/"`.

### Issue 3: Rate limiting triggers unexpectedly for all users

- **Cause**: Express missing `app.set('trust proxy', 1)`, causing all requests behind Railway's reverse proxy to share the proxy's IP address.
- **Solution**: Verify `trust proxy` setting is present in `server.ts`.

### Issue 4: Upstash Redis connection error or falling back to in-memory store

- **Cause**: Missing or incorrectly named environment variables (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
- **Solution**: Confirm environment variables are set correctly in Railway service settings and restart deployment.

---

## Useful Links & References

- [Railway Official Documentation](https://docs.railway.app/)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
