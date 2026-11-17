import { ensureSchemaAndSeed, pool, seedInitialTaxonomy } from './index';

async function main() {
  await ensureSchemaAndSeed();
  const result = await seedInitialTaxonomy(pool);
  console.log(
    `[taxonomy-seed] Sincronizado com sucesso: ${result.categoriesCount} categorias e ${result.specialtiesCount} especialidades oficiais.`
  );
  await pool.end();
}

main().catch(async (err) => {
  console.error('[taxonomy-seed] Erro ao executar seed de taxonomia:', err);
  await pool.end().catch(() => null);
  process.exit(1);
});
