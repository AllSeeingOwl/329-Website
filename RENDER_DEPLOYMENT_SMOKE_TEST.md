# Render Deployment Smoke Test Procedure

This document provides guidelines and verification steps for validating the Render deployment of the Admin Console and core API services for `329-Website` (`3minsto9-arg`).

## Overview & Architecture Verification

Render Service Configuration (`render.yaml`):

- **Service Type**: Web Service (`type: web`)
- **Environment**: Node.js (`env: node`)
- **Build Command**: `pnpm install && pnpm run build`
- **Start Command**: `pnpm start` (`node dist/server.js`)
- **Health Check Path**: `/health`
- **Auto Deploy**: `true`

### Key Environment Variables Configured in Render

- `NODE_ENV`: `production`
- `ADMIN_PASSWORD`: Secret admin password for `/api/admin/verify` & admin console access.
- `AUTH_PASSWORD`: Secret ARG player code for `/api/verify` gate.
- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL for session storage and persistent configuration.
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST Token.
- `STOREFRONT_URL`: Storefront URL override.
- `MAINTENANCE_MODE`, `STUDIO_MAINTENANCE_MODE`, `MLTK_MAINTENANCE_MODE`, `EMERGENCY_LOCKDOWN`: System maintenance flags.

---

## Smoke Test Checklist

### 1. Health Check

- **Endpoint**: `GET /health`
- **Expected Status**: `200 OK`
- **Expected Response**: `{"status": "ok"}`
- **Purpose**: Confirms the Express process is active and accepting requests on Render.

### 2. Admin UI Resolution

- **Endpoint**: `GET /admin/`
- **Expected Status**: `200 OK`
- **Expected Response**: HTML page containing the retro retro-terminal Admin Console UI (`public/admin/index.html`).
- **Endpoint**: `GET /mltk-admin.html`
- **Expected Status**: `200 OK`
- **Expected Response**: HTML page containing the MLTK Admin Dashboard interface (`public/mltk-admin.html`).

### 3. Unauthenticated Access Protection

- **Endpoints**:
  - `GET /api/admin/dashboard-config`
  - `GET /api/admin/maintenance-config`
  - `GET /api/admin/phases`
  - `GET /api/admin/audit-logs`
  - `GET /api/admin/emails`
  - `GET /api/admin/announcements`
- **Expected Status**: `401 Unauthorized` or `403 Forbidden`
- **Expected Response**: JSON error indicating session required (e.g. `{"error": "Unauthorized: Admin session required"}`).

### 4. Admin Authentication (`ADMIN_PASSWORD`)

- **Endpoint**: `POST /api/admin/verify`
- **Invalid Password Test**:
  - Payload: `{"password": "wrong-password-123"}`
  - Expected Status: `401 Unauthorized`
  - Expected Response: `{"success": false, "message": "Invalid password"}`
- **Valid Password Test**:
  - Payload: `{"password": "<configured ADMIN_PASSWORD>"}`
  - Expected Status: `200 OK`
  - Expected Response: `{"success": true, "message": "Authenticated", "expiresAt": "..."}`
  - Cookie Set: `admin_session` HTTP-only, Secure cookie.

### 5. MLTK Player Verification Separation (`AUTH_PASSWORD`)

- **Endpoint**: `POST /api/verify`
- **Purpose**: Verify that MLTK ARG player verification is decoupled from administrative authentication.
- **Incorrect Code Test**:
  - Payload: `{"code": "invalid-arg-code"}`
  - Expected Response: `{"success": false}`
- **Correct Code Test**:
  - Payload: `{"code": "<configured AUTH_PASSWORD>"}`
  - Expected Response: `{"success": true}`
- **Verification**: Ensure passing `ADMIN_PASSWORD` to `/api/verify` or `AUTH_PASSWORD` to `/api/admin/verify` fails cleanly without granting unintended privilege cross-over.

### 6. Zero Sensitive Data Exposure

- Confirm that no responses, logs, or test outputs expose:
  - `ADMIN_PASSWORD`
  - `AUTH_PASSWORD`
  - `UPSTASH_REDIS_REST_TOKEN`
  - Session tokens or raw cookie strings.

---

## Local Automated Verification Command

Run the automated Render deployment smoke test suite locally:

```bash
pnpm test __tests__/renderDeploymentSmoke.test.ts
```

Run the complete production build verification script:

```bash
pnpm run verify:prod
```
