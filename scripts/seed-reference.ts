import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ensureSchemaAndSeed, pool } from '../src/db/index';
import { assertDistinctDatabaseUrls } from '../src/config/environment';

export async function runReferenceSeed(): Promise<{ filesExecuted: string[] }> {
  assertDistinctDatabaseUrls();
  await ensureSchemaAndSeed();

  const refDir = path.resolve(process.cwd(), 'database', 'seeds', 'reference');
  const sqlFiles = readdirSync(refDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const filesExecuted: string[] = [];
  for (const fileName of sqlFiles) {
    const sql = readFileSync(path.join(refDir, fileName), 'utf-8');
    await pool.query(sql);
    filesExecuted.push(fileName);
  }

  return { filesExecuted };
}

if (
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('seed-reference.ts')
) {
  runReferenceSeed()
    .then(async (res) => {
      console.log(
        `[seed-reference] Concluído com sucesso (${res.filesExecuted.join(', ')}).`
      );
      await pool.end();
    })
    .catch(async (err) => {
      console.error('[seed-reference] Falha ao executar seed de referência:', err);
      await pool.end().catch(() => null);
      process.exit(1);
    });
}
