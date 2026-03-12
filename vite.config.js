import { defineConfig } from 'vite';

export default defineConfig({
  root: './public', // Set root to your public folder for now
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    // Add custom rollup options if you want to bundle .txt files or specific entry points later
  },
  server: {
    port: 3001,
    proxy: {
      // Proxy API requests to your express backend during development
      '/api': 'http://localhost:3000'
    }
  }
});