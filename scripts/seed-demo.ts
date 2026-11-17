import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ensureSchemaAndSeed, pool } from '../src/db/index';
import {
  assertCanRunDemoSeed,
  assertDistinctDatabaseUrls,
  getNodeEnvironment,
  isProductionEnvironment,
} from '../src/config/environment';

export async function runDemoSeed(): Promise<{ filesExecuted: string[] }> {
  assertDistinctDatabaseUrls();

  if (isProductionEnvironment()) {
    // Registra tentativa bloqueada em audit_logs antes de abortar
    await pool
      .query(
        `INSERT INTO audit_logs (actor_role, action, target_type, target_id, metadata_json)
         VALUES ('system', 'blocked_demo_seed_in_production', 'database', 'seed-demo', $1::jsonb)`,
        [
          JSON.stringify({
            nodeEnv: getNodeEnvironment(),
            demoModeEnv: process.env.DEMO_MODE || 'unset',
            blockedAt: new Date().toISOString(),
          }),
        ]
      )
      .catch(() => null);
  }

  assertCanRunDemoSeed();
  await ensureSchemaAndSeed();

  const demoDir = path.resolve(process.cwd(), 'database', 'seeds', 'demo');
  const sqlFiles = readdirSync(demoDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const filesExecuted: string[] = [];
  for (const fileName of sqlFiles) {
    const sql = readFileSync(path.join(demoDir, fileName), 'utf-8');
    await pool.query(sql);
    filesExecuted.push(fileName);
  }

  return { filesExecuted };
}

if (
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('seed-demo.ts')
) {
  runDemoSeed()
    .then(async (res) => {
      console.log(
        `[seed-demo] Dados fictícios carregados em ambiente ${getNodeEnvironment()} (${res.filesExecuted.join(', ')}).`
      );
      await pool.end();
    })
    .catch(async (err) => {
      console.error(err?.message || err);
      await pool.end().catch(() => null);
      process.exit(1);
    });
}
