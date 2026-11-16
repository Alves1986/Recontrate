import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { createApiRouter } from './src/server/apiRouter';

function neonApiPlugin(): Plugin {
  const apiApp = express();
  apiApp.use('/api', createApiRouter());

  return {
    name: 'confiare-neon-api',
    configureServer(server) {
      server.middlewares.use(apiApp);
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiApp);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), neonApiPlugin()],
    define: {
      'import.meta.env.VITE_NEON_AUTH_URL': JSON.stringify(
        env.VITE_NEON_AUTH_URL && !env.VITE_NEON_AUTH_URL.startsWith('$')
          ? env.VITE_NEON_AUTH_URL
          : env.NEON_AUTH_BASE_URL || ''
      ),
      'import.meta.env.VITE_NEON_REALTIME_URL': JSON.stringify(
        env.VITE_NEON_REALTIME_URL && !env.VITE_NEON_REALTIME_URL.startsWith('$')
          ? env.VITE_NEON_REALTIME_URL
          : env.NEON_REALTIME_URL || ''
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
