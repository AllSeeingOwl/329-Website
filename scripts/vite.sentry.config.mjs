// Builds public/vendor/sentry.min.js from scripts/sentry-browser-entry.js.
// Run with `pnpm run build:sentry`. The output is committed so dev and Docker
// builds don't need to regenerate it.
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  root,
  publicDir: false,
  build: {
    outDir: 'public/vendor',
    emptyOutDir: false,
    minify: true,
    target: 'es2020',
    lib: {
      entry: 'scripts/sentry-browser-entry.js',
      formats: ['iife'],
      name: 'SiteSentry',
      fileName: () => 'sentry.min.js',
    },
  },
});
