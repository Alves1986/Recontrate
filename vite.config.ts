import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function neonApiPlugin(): Plugin {
  let apiAppPromise: Promise<express.Express> | null = null;
  const getApiApp = () => {
    if (!apiAppPromise) {
      apiAppPromise = import('./src/server/apiRouter').then(
        ({ createApiRouter }) => {
          const apiApp = express();
          apiApp.use('/api', createApiRouter());
          return apiApp;
        }
      );
    }
    return apiAppPromise;
  };

  return {
    name: 'confiare-neon-api',
    async configureServer(server) {
      const app = await getApiApp();
      server.middlewares.use(app);
    },
    async configurePreviewServer(server) {
      const app = await getApiApp();
      server.middlewares.use(app);
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
    build: {
      chunkSizeWarningLimit: 500,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor-react',
                test: /node_modules[\\/]react/,
                priority: 30,
              },
              {
                name: 'vendor-icons',
                test: /node_modules[\\/]lucide-react/,
                priority: 20,
              },
              {
                name: 'vendor-motion',
                test: /node_modules[\\/](motion|framer-motion)/,
                priority: 15,
              },
              {
                name: 'vendor',
                test: /node_modules/,
                maxSize: 380000,
                priority: 10,
              },
            ],
          },
        },
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
