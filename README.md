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
- **Root Directory**: Contains configuration files (Vite, Webpack, Playwright, Cypress, ESLint, Prettier) and Jest unit tests (e.g., `velvet_rope_utils.test.js`).

## Development

Make sure you have Node.js (v22+) and pnpm installed. Install dependencies using:

```bash
pnpm install
```

_(Note: If you experience timeouts during installation, use the `--prefer-offline` flag.)_

### Environment Variables

The local Express server (`server.ts`) relies on the following environment variables:

- **`AUTH_PASSWORD`**: Required for the `/api/verify` endpoint. The server will exit if this is not set.
- **`MAINTENANCE_MODE`**: Set to `'true'` to enable maintenance mode, which intercepts all requests, returning a 503 status code and serving `public/maintenance.html`.
- **`KV_REST_API_URL`**: The REST API URL for the Upstash Redis database.
- **`KV_REST_API_TOKEN`**: The authentication token for the Upstash Redis database.

### Available Scripts

- **`pnpm run dev:server`**: Starts the local development backend server using `nodemon`.
- **`pnpm run maintenance:toggle`**: Executes script to toggle the Vercel maintenance mode environment variable.
- **`pnpm run lint`**: Runs ESLint to check for code quality.
- **`pnpm run format`**: Runs Prettier to format code.
- **`pnpm run typecheck`**: Runs TypeScript type checking.
- **`pnpm test`**: Runs Jest unit tests.
- **`pnpm test -- --coverage`**: Runs tests and generates a coverage report.
- **`pnpm run test:e2e:playwright`**: Runs end-to-end tests using Playwright.
- **`pnpm run test:e2e:cypress`**: Opens Cypress for end-to-end testing.
- **`pnpm run build:vite`** / **`pnpm run build:webpack`**: Executes builds if needed.

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

## Deployment

The project is deployed and hosted on **Vercel**, accessible via the custom domain `3minsto9.co.uk` and Vercel-provided subdomains (e.g., `329-website.vercel.app`).

- The deployment utilizes the Node.js Express application (`server.ts`).
  - **Security**: The server enforces strict security headers including a Content-Security-Policy with `upgrade-insecure-requests` and `X-XSS-Protection`. It also implements a 100kb payload limit to prevent Denial-of-Service attacks.
  - **Proxy Configuration**: `app.set('trust proxy', 1)` is configured to correctly extract the client IP from the `X-Forwarded-For` header on Vercel deployments, preventing proxy IPs from triggering global rate limits.
- The Express server uses `process.env.PORT` to allow Vercel to dynamically assign the port (falling back to 3000 locally).
- Critical environment variables like `AUTH_PASSWORD`, `MAINTENANCE_MODE`, and the `KV_REST_API_*` variables must be configured in the Vercel project settings.
- Internal navigation links within the `.html` files utilize URL-encoded relative paths (e.g., `surface-home-page.html`) to avoid 404 errors on subpaths.
