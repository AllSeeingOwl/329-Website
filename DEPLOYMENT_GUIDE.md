# Deployment Guide: Render Web Service Migration & Setup

This document provides a comprehensive guide for deploying and maintaining the **3minsto9 ARG & Web Application** on **Render** as a Web Service.

---

## Executive Summary & Architecture Overview

The 3minsto9 project relies on a long-running Express TypeScript server (`server.ts`) serving static frontend assets directly from `dist/public` alongside API routes for the ARG gate and admin panel.

1. **Persistent Execution Environment**: Running as a long-running process on Render Web Service ensures low-latency session handling, IP-based rate limiting, dynamic maintenance toggles, and streaming audit logs.
2. **State Storage**: Persistent state (admin sessions, Neural Link Progress phases, system configurations, and email collections) is managed via **Upstash Redis** (`@upstash/redis`), with an in-memory fallback for local development.
3. **Infrastructure as Code**: Deployment configuration is defined in `render.yaml` at the root of the repository.

---

## 1. Pre-Deployment Checklist

Before deploying or triggering a new release, verify and gather all necessary configurations.

### Required Environment Variables

| Variable Name              | Type       | Description                                       | Recommended Value / Example                          |
| -------------------------- | ---------- | ------------------------------------------------- | ---------------------------------------------------- |
| `NODE_ENV`                 | Non-Secret | Execution mode                                    | `production`                                         |
| `PORT`                     | Non-Secret | HTTP port assigned dynamically                    | Handled automatically by Render (defaults to `3000`) |
| `MAINTENANCE_MODE`         | Non-Secret | Global maintenance flag (`true` / `false`)        | `false`                                              |
| `STUDIO_MAINTENANCE_MODE`  | Non-Secret | Studio maintenance flag (`true` / `false`)        | `false`                                              |
| `MLTK_MAINTENANCE_MODE`    | Non-Secret | MLTK/ARG maintenance flag (`true` / `false`)      | `false`                                              |
| `EMERGENCY_LOCKDOWN`       | Non-Secret | Global emergency lockdown flag (`true` / `false`) | `false`                                              |
| `ADMIN_PASSWORD`           | **Secret** | Password required for `/api/admin` authentication | _Cryptographically strong secret_                    |
| `AUTH_PASSWORD`            | **Secret** | Access gate verification code (`/api/verify`)     | `0408-1998-XXXX`                                     |
| `UPSTASH_REDIS_REST_URL`   | **Secret** | Upstash Redis REST API URL                        | `https://your-upstash-redis-url.upstash.io`          |
| `UPSTASH_REDIS_REST_TOKEN` | **Secret** | Upstash Redis REST auth token                     | `your_upstash_redis_rest_token_here`                 |
| `STOREFRONT_URL`           | **Secret** | External storefront link (optional)               | `https://store.3minsto9.co.uk`                       |

### Local Verification Sequence

Before pushing changes to production, execute the automated verification suite:

```bash
# 1. Run unit tests
pnpm test

# 2. Run TypeScript type check
pnpm run typecheck

# 3. Execute local production verification script
pnpm run verify:prod
```

`pnpm run verify:prod` automatically tests frozen lockfile installation, TypeScript compilation, Vite build output, server boot, health checks (`GET /health`), static asset delivery (`/favicon.png`), secret enforcement, and credential masking.

---

## 2. Render Web Service Setup

Follow these steps to deploy using Render's Blueprint setup or manual service creation.

### Option A: Deploying via Render Blueprint (`render.yaml`)

1. Log into your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository (`329-Website`).
4. Render will detect `render.yaml` automatically:
   - **Service Name**: `3minsto9-arg`
   - **Environment**: `node`
   - **Build Command**: `pnpm install && pnpm run build`
   - **Start Command**: `pnpm start` (`node dist/server.js`)
   - **Health Check Path**: `/health`
5. Fill in the required secret environment variables (`ADMIN_PASSWORD`, `AUTH_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
6. Click **Apply** to start building and deploying.

### Option B: Manual Web Service Setup

1. Log into [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Select **Build and deploy from a Git repository**.
4. Set the following parameters:
   - **Runtime**: Node
   - **Build Command**: `pnpm install && pnpm run build`
   - **Start Command**: `pnpm start`
   - **Health Check Path**: `/health`
5. Add all Environment Variables under the **Environment** tab.

### Custom Domain & SSL Setup

1. In Render Dashboard, go to your Web Service -> **Settings** -> **Custom Domains**.
2. Click **Add Custom Domain** and enter your domain (e.g., `3minsto9.co.uk`).
3. Point your DNS provider's CNAME or A records to the values provided by Render.
4. Render automatically issues and renews TLS/SSL certificates via Let's Encrypt once DNS propagation resolves.

---

## 3. Post-Deployment Verification

Perform the following operational checks after deployment completes:

```bash
# 1. Verify service health
curl -i https://your-service.onrender.com/health

# 2. Verify homepage response
curl -i https://your-service.onrender.com/

# 3. Verify maintenance status API
curl -i https://your-service.onrender.com/api/maintenance-status

# 4. Test Admin Authentication API
curl -i -X POST https://your-service.onrender.com/api/admin/authenticate \
  -H "Content-Type: application/json" \
  -d '{"password": "YOUR_CONFIGURED_ADMIN_PASSWORD"}'
```

---

## 4. Maintenance & Security Best Practices

### Dynamic Maintenance Mode Control

Maintenance mode can be toggled without redeploying the application:

- **Via Admin Dashboard**: Log in at `/admin/index.html` and toggle Maintenance Mode in System Configuration.
- **Via Admin API**: Send a `POST /api/admin/maintenance/toggle` request with valid session/credentials.
- **Via Render Dashboard**: Set `MAINTENANCE_MODE=true` in Render's Environment Variables panel.

### Security Best Practices

1. **Strong Passwords**: Ensure `ADMIN_PASSWORD` is a strong random string (minimum 32 characters) in production.
2. **Cookie & Session Security**: Admin session cookies set `httpOnly: true`, `secure: true` (in production), and `sameSite: 'strict'`.
3. **Rate Limiting**: Failed login attempts are rate-limited to 5 failed attempts per 15-minute window per IP.
4. **Audit Trail Logging**: Administrative events (phase updates, maintenance toggles, email exports) are logged to Upstash Redis (`admin:audit_logs`).
5. **Reverse Proxy Configuration**: `app.set('trust proxy', 1)` is enabled in Express to properly resolve client IP addresses behind reverse proxies.
