import { defineConfig } from 'vite';

// Sem plugins: a aplicação é TypeScript + Three.js puro e roda 100% local.
export default defineConfig({
  server: { host: '127.0.0.1', port: 5173, open: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
