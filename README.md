# 3minsto9 ARG / Web Experience

This repository contains the web assets and supporting infrastructure for the **"3minsto9"** Alternate Reality Game (ARG) and immersive media project.

## Narrative Context

The experience is centered around the conflict between an underground group known as **Team Rabbit** and the monolithic corporate entity **MLTK**, set within the **City of Everywhere**. The website structure physically separates "formal business" real-world studio pages (3minsto9 Operations) from the satirical "in-universe" corporate MLTK pages, complete with hidden rebel communication nodes.

## Project Structure

The project relies on a Node.js Express backend (`server.js`) that serves static assets from a `public/` directory.

- **`public/`**: Contains the web assets.
  - For narrative and stylistic reasons, HTML, CSS, and some inline JavaScript files are stored as raw `.txt` files.
  - **JavaScript Utilities**: Extracted business logic and DOM interactions are stored as standard `.js` files within `public/`. They use a UMD-like pattern (`if (typeof module !== 'undefined' && module.exports)`) to allow execution in both the browser and Node.js environments.
- **`server.js`**: An Express server configured to serve the `.txt` files as `text/html`.
- **Root Directory**: Contains configuration files (Vite, Webpack, Playwright, Cypress, ESLint, Prettier) and Jest unit tests (e.g., `velvet_rope_utils.test.js`).

## Development

Make sure you have Node.js (v22+) and npm (v11+) installed. Install dependencies using:

```bash
npm install
```
*(Note: If you experience timeouts during installation, use `--prefer-offline` and `--no-audit` flags.)*

### Available Scripts

- **`npm run dev:server`**: Starts the local development backend server using `nodemon`.
- **`npm run lint`**: Runs ESLint to check for code quality.
- **`npm run format`**: Runs Prettier to format code.
- **`npm run typecheck`**: Runs TypeScript type checking.
- **`npm test`**: Runs Jest unit tests.
- **`npm test -- --coverage`**: Runs tests and generates a coverage report.
- **`npm run test:e2e:playwright`**: Runs end-to-end tests using Playwright.
- **`npm run test:e2e:cypress`**: Opens Cypress for end-to-end testing.
- **`npm run build:vite`** / **`npm run build:webpack`**: Executes builds if needed.

## Testing

- **Jest**: Unit tests are located in the repository root alongside the scripts they test. Tests requiring DOM interaction use `jest-environment-jsdom` and include the `/** @jest-environment jsdom */` pragma.
- **End-to-End**: Playwright and Cypress are used for robust E2E verification. Due to the `.txt` extensions, testing tools often intercept requests to manually fulfill routes with `text/html` content types.

## Deployment

The project is automatically deployed to **GitHub Pages** via a GitHub Actions workflow (`.github/workflows/static.yml`).

- The workflow uploads the `./public` directory as the deployment artifact.
- A custom 404 page is handled by copying/renaming the in-universe 404 error file to `404.html` within the `public/` directory.
- Internal navigation links within the `.txt` files utilize URL-encoded relative paths (e.g., `Surface%20Home%20Page.html`) to avoid 404 errors on subpaths.
