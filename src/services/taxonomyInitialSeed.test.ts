import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_TAXONOMY_CATEGORIES,
  slugifyTaxonomyTerm,
} from '../data/taxonomySeed';
import { ensureSchemaAndSeed, pool, seedInitialTaxonomy } from '../db/index';

const EXPECTED_CATALOG: Record<string, string[]> = {
  Elétrica: [
    'Instalação elétrica residencial',
    'Instalação elétrica comercial',
    'Manutenção elétrica',
    'Instalação de chuveiro',
    'Instalação de tomadas e interruptores',
    'Quadro de distribuição',
    'Iluminação',
    'Automação residencial',
    'Aterramento',
    'Manutenção predial elétrica',
  ],
  Hidráulica: [
    'Instalação hidráulica residencial',
    'Reparo de vazamento',
    'Desentupimento',
    'Instalação de torneira',
    'Instalação de vaso sanitário',
    "Manutenção de caixa d'água",
    'Instalação de aquecedor',
    'Manutenção predial hidráulica',
  ],
  Pintura: [
    'Pintura residencial',
    'Pintura comercial',
    'Pintura de fachada',
    'Textura',
    'Grafiato',
    'Verniz',
    'Pintura de gesso',
    'Restauração de pintura',
  ],
  'Diarista e limpeza': [
    'Limpeza residencial',
    'Limpeza comercial',
    'Limpeza pós-obra',
    'Limpeza de sofá',
    'Limpeza de carpete',
    'Organização residencial',
    'Passadoria',
    'Lavanderia',
  ],
  'Ar-condicionado': [
    'Instalação de split',
    'Manutenção de split',
    'Higienização',
    'Carga de gás',
    'Instalação de ar-condicionado comercial',
    'Manutenção preventiva',
    'Instalação de cassete',
    'Instalação de piso teto',
  ],
  'Montagem e móveis': [
    'Montagem de móveis',
    'Desmontagem de móveis',
    'Montagem de armário',
    'Montagem de cozinha',
    'Montagem de berço',
    'Montagem de estante',
    'Instalação de suporte de TV',
    'Montagem de escritório',
  ],
  'Reforma e construção': [
    'Alvenaria',
    'Gesso',
    'Piso',
    'Porcelanato',
    'Azulejo',
    'Reforma de banheiro',
    'Reforma de cozinha',
    'Drywall',
    'Forro',
    'Impermeabilização',
  ],
  Jardinagem: [
    'Manutenção de jardim',
    'Poda de árvores',
    'Gramado',
    'Irrigação',
    'Paisagismo',
    'Limpeza de área externa',
    'Plantio',
  ],
  'Técnico e informática': [
    'Manutenção de computador',
    'Formatação',
    'Instalação de programas',
    'Redes e Wi-Fi',
    'Câmeras de segurança',
    'Suporte técnico residencial',
    'Suporte técnico comercial',
  ],
  'Mudança e frete': [
    'Mudança residencial',
    'Mudança comercial',
    'Frete',
    'Içamento',
    'Embalagem',
    'Desmontagem para mudança',
    'Transporte de móveis',
  ],
};

test('Catálogo estático contém exatamente as 10 categorias e 81 especialidades solicitadas', () => {
  const categoryNames = INITIAL_TAXONOMY_CATEGORIES.map((c) => c.nome);
  assert.deepEqual(categoryNames, Object.keys(EXPECTED_CATALOG));

  let totalSpecs = 0;
  for (const cat of INITIAL_TAXONOMY_CATEGORIES) {
    const actualSpecs = cat.specialties.map((s) => s.nome);
    assert.deepEqual(actualSpecs, EXPECTED_CATALOG[cat.nome]);
    totalSpecs += actualSpecs.length;
  }
  assert.equal(totalSpecs, 81);
});

test('Seed no PostgreSQL garante todas as 10 categorias e 81 especialidades oficiais ativas', async () => {
  await ensureSchemaAndSeed();
  const seeded = await seedInitialTaxonomy(pool);
  assert.equal(seeded.categoriesCount, 10);
  assert.equal(seeded.specialtiesCount, 81);

  const expectedSlugs = Object.values(EXPECTED_CATALOG)
    .flat()
    .map((name) => slugifyTaxonomyTerm(name));

  const { rows } = await pool.query<{
    category_nome: string;
    spec_nome: string;
    spec_slug: string;
  }>(
    `SELECT COALESCE(c.nome, c.name) AS category_nome, s.nome AS spec_nome, s.slug AS spec_slug
     FROM specialties s
     JOIN categories c ON c.id = s.category_id
     WHERE s.slug = ANY($1::text[])
       AND s.ativo = true
       AND s.oficial = true
       AND c.ativo = true`,
    [expectedSlugs]
  );

  assert.equal(rows.length, 81);

  const dbByCat = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = dbByCat.get(row.category_nome) || new Set<string>();
    set.add(row.spec_nome);
    dbByCat.set(row.category_nome, set);
  }

  for (const [catName, specList] of Object.entries(EXPECTED_CATALOG)) {
    const foundSet = dbByCat.get(catName);
    assert.ok(foundSet, `Categoria ausente no banco: ${catName}`);
    for (const specName of specList) {
      assert.equal(
        foundSet.has(specName),
        true,
        `Especialidade ausente no banco em "${catName}": ${specName}`
      );
    }
  }
});

test.after(async () => {
  await pool.end();
});
