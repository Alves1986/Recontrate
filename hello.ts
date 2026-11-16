import { Hono } from 'hono';
import { Pool } from 'pg';
import { parseEnv } from '@neon/env';
import { attachDatabasePool } from '@neon/functions';
import config from './neon';

const { postgres } = parseEnv(config, ['DATABASE_URL']);
const pool = new Pool({
  connectionString: postgres.databaseUrl.replace(
    'sslmode=require',
    'sslmode=verify-full'
  ),
  max: 5,
});
attachDatabasePool(pool);

const app = new Hono();

app.get('/', async (c) => {
  const { rows } = await pool.query<{ db: string; ts: string }>(
    'SELECT current_database() AS db, NOW()::text AS ts'
  );
  return c.json({
    ok: true,
    service: 'neon-functions',
    message: 'Hello from Neon Functions (Confiare)',
    branch: process.env.NEON_BRANCH || 'production',
    branchId: process.env.NEON_BRANCH_ID || null,
    database: rows[0]?.db || 'neondb',
    timestamp: rows[0]?.ts || new Date().toISOString(),
  });
});

export default app;
