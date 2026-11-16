import type { PoolClient } from 'pg';
import { pool } from './index';

export type AppRole = 'anon' | 'cliente' | 'prestador' | 'padrinho' | 'admin';

export interface RlsContext {
  userId?: string | null;
  role: AppRole;
  providerProfileId?: string | null;
}

/**
 * Executes a database operation inside a transaction scoped with Postgres Row Level Security (RLS)
 * variables (`app.current_user_id`, `app.current_user_role`, `app.current_provider_id`) and
 * `SET LOCAL ROLE confiare_rls_user` so RLS policies are strictly enforced by PostgreSQL.
 */
export async function withRlsContext<T>(
  ctx: RlsContext,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE confiare_rls_user');
    await client.query(
      `SELECT
        set_config('app.current_user_id', $1, true),
        set_config('app.current_user_role', $2, true),
        set_config('app.current_provider_id', $3, true)`,
      [
        ctx.userId || '',
        ctx.role || 'anon',
        ctx.providerProfileId || '',
      ]
    );

    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
