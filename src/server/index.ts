import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createApiRouter } from './apiRouter';
import { pool } from '../db/index';

export function createApp() {
  const app = express();
  app.use('/api', createApiRouter());

  const distDir = path.resolve(process.cwd(), 'dist');
  if (existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const port = Number(process.env.PORT || 3000);
  const app = createApp();
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Confiare Server listening on http://localhost:${port}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      pool.end();
    });
  });
}
