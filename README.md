**[Technical Documentation (README)](README.md)** | **[What is this? (Layman's Guide)](WHAT_IS_THIS.md)**

---

# 3minsto9 ARG / Web Experience

This repository contains the web assets and supporting infrastructure for the **"3minsto9"** Alternate Reality Game (ARG) and immersive media project.

## Narrative Context

The experience is centered around the conflict between an underground group known as **Team Rabbit** and the monolithic corporate entity **MLTK**, set within the **City of Everywhere**. The website structure physically separates "formal business" real-world studio pages (3minsto9 Operations) from the satirical "in-universe" corporate MLTK pages, complete with hidden rebel communication nodes.

## Project Structure

The project relies on a Node.js Express backend (`server.ts`) that serves static assets from a `public/` directory.

- **`public/`**: Contains the web assets, including `.html` pages, CSS, and some inline JavaScript files.
  - **JavaScript Utilities**: Extracted business logic and DOM interactions are stored as standard `.js` files within `public/`. They use a UMD-like pattern (`if (typeof module !== 'undefined' && module.exports)`) to allow execution in both the browser and Node.js environments.
- **`server.ts`**: An Express server configured to serve static files from the `public/` directory.
- **Persistent State**: The application utilizes Upstash Redis (`@upstash/redis`) for persistent storage (e.g., dashboard configuration) replacing previous SQLite/Vercel KV implementations. It includes an in-memory fallback for local development.
- **Root Directory**: Contains configuration files (Vite, Playwright, Cypress, ESLint, Prettier) and Jest unit tests (e.g., `velvet_rope_utils.test.js`).

## Development

Make sure you have Node.js (v22+) and pnpm installed. Install dependencies using:

```bash
pnpm install
```

_(Note: If you experience timeouts during installation, use the `--prefer-offline` flag.)_

### Environment Variables

The Express server (`server.ts`) relies on the following environment variables:

- **`UPSTASH_REDIS_REST_URL`**: REST URL for the Upstash Redis database (required in production, Secret).
- **`UPSTASH_REDIS_REST_TOKEN`**: Authentication token for the Upstash Redis database (required in production, Secret).
- **`ADMIN_PASSWORD`**: Password required for admin panel access (`/api/admin/verify`). Required in production (Secret).
- **`AUTH_PASSWORD`**: Access gate verification password (`/api/verify`). Required in production (Secret).
- **`STOREFRONT_URL`**: Optional external storefront link (Secret).
- **`PORT`**: HTTP port assigned by host environment (defaults to 3000 locally).
- **`MAINTENANCE_MODE`**: Set to `'true'` to enable global maintenance mode.
- **`STUDIO_MAINTENANCE_MODE`**: Set to `'true'` to enable maintenance mode specifically for studio pages.
- **`MLTK_MAINTENANCE_MODE`**: Set to `'true'` to enable maintenance mode specifically for MLTK/ARG pages.
- **`EMERGENCY_LOCKDOWN`**: Set to `'true'` to enable emergency lockdown.

### Available Scripts

- **`pnpm run dev`**: Starts the local development backend server using `nodemon`.
- **`pnpm run lint`**: Runs ESLint to check for code quality.
- **`pnpm run format`**: Runs Prettier to format code.
- **`pnpm run typecheck`**: Runs TypeScript type checking.
- **`pnpm test`**: Runs Jest unit tests.
- **`pnpm test -- --coverage`**: Runs tests and generates a coverage report.
- **`pnpm run test:e2e:playwright`**: Runs end-to-end tests using Playwright.
- **`pnpm run test:e2e:cypress`**: Opens Cypress for end-to-end testing.
- **`pnpm run build`**: Compiles TypeScript and builds Vite frontend assets into `dist/`.
- **`pnpm start`**: Runs the compiled production server from `dist/server.js`.
- **`pnpm run verify:prod`**: Runs the local production verification script (`./scripts/verify-production.sh`) to test build artifacts, server startup, health endpoints, static assets, and secret enforcement.

## Testing & CI/CD

- **Jest**: Unit tests are located in the repository root alongside the scripts they test. Tests requiring DOM interaction use `jest-environment-jsdom` and include the `/** @jest-environment jsdom */` pragma.
- **End-to-End**: Playwright and Cypress are used for robust E2E verification. Playwright E2E tests (`pnpm run test:e2e:playwright`) spin up the local server with the required `AUTH_PASSWORD=test` environment variable.
- **CI/CD**: The repository exclusively uses standard GitHub-hosted runners (e.g., `ubuntu-latest`) for all CI/CD workflows to ensure low maintenance and secure ephemeral environments. Self-hosted GitHub Actions runners are explicitly considered unnecessary.
- **Automated Housekeeping**: A suite of automated GitHub Actions handles weekly unused code and dependency checks (`knip`), weekly broken link checking (`lychee-action`), weekly Dependabot updates, weekly repository cleanup for stale branches and issues, and on-push automated formatting and lint fixing (Prettier and ESLint).

## Project Management

The repository includes an ARG-specific GitHub Project management setup to track code, narrative, puzzles, and art assets. Please refer to:

- **[PROJECT_MANAGEMENT.md](PROJECT_MANAGEMENT.md)**: Configuration guide and key practices.
- **Issue Templates**: Found in `.github/ISSUE_TEMPLATE/` (`bug_report.md`, `feature_request.md`, `arg_task.md`).
- **PR Template**: Located at `.github/pull_request_template.md`.

## Render Deployment Guide

The project is configured for deployment as a **Render Web Service**.

### 1. Render Service Overview

- **Service Type**: Render Web Service
- **Runtime**: Node.js (v22+)
- **Build Command**: `pnpm install && pnpm run build`
- **Start Command**: `pnpm start` (`node dist/server.js`)
- **Health Check Path**: `/health`

### 2. Required Environment Variables

| Variable Name              | Type       | Description                                        |
| :------------------------- | :--------- | :------------------------------------------------- |
| `NODE_ENV`                 | Non-Secret | Set to `production`                                |
| `MAINTENANCE_MODE`         | Non-Secret | Set to `false`                                     |
| `STUDIO_MAINTENANCE_MODE`  | Non-Secret | Set to `false`                                     |
| `MLTK_MAINTENANCE_MODE`    | Non-Secret | Set to `false`                                     |
| `EMERGENCY_LOCKDOWN`       | Non-Secret | Set to `false`                                     |
| `ADMIN_PASSWORD`           | **Secret** | Cryptographically strong password for `/api/admin` |
| `AUTH_PASSWORD`            | **Secret** | Verification code for ARG gate (`0408-1998-XXXX`)  |
| `UPSTASH_REDIS_REST_URL`   | **Secret** | Upstash Redis REST API URL                         |
| `UPSTASH_REDIS_REST_TOKEN` | **Secret** | Upstash Redis REST Auth Token                      |
| `STOREFRONT_URL`           | **Secret** | Storefront destination link (optional)             |

### 3. Connecting GitHub & Deploying

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository (`329-Website`).
4. Render will detect `render.yaml` and configure the Web Service automatically.
5. In the Render Dashboard, fill in the required secret environment variables (`ADMIN_PASSWORD`, `AUTH_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
6. Click **Apply** to trigger your initial build and deployment.

### 4. Configuring Custom Domain

1. In the Render Dashboard, navigate to your Web Service -> **Settings** -> **Custom Domains**.
2. Click **Add Custom Domain** and enter `3minsto9.co.uk` (or your domain).
3. Update your DNS provider with the CNAME/A records provided by Render.
4. Render will automatically issue and renew TLS/SSL certificates via Let's Encrypt.

### 5. Verifying Deployment

Run the following checks against your live Render service URL:

```bash
# 1. Health check
curl -i https://your-service.onrender.com/health

# 2. Homepage render
curl -i https://your-service.onrender.com/

# 3. Dynamic maintenance status API
curl -i https://your-service.onrender.com/api/maintenance-status
```

### 6. Activating Maintenance Mode Safely

Maintenance mode can be toggled without requiring application redeployments:

- **Option A (Admin API)**: Authenticate to the admin dashboard and send a `POST /api/admin/maintenance/toggle` request.
- **Option B (Render Dashboard)**: Update `MAINTENANCE_MODE=true` in Render's Environment Variables panel.
