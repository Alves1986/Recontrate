import test from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { db, ensureSchemaAndSeed, INITIAL_PLANS_SEED, pool } from './index';
import { plans } from './schema';

test.after(async () => {
  await pool.end();
});

test('Plans seed: all 4 Recontrate plans use integer centavos, exact opportunity limits, and only Gratuito displays ads', async () => {
  await ensureSchemaAndSeed();

  const dbPlans = await db
    .select()
    .from(plans)
    .where(eq(plans.ativo, true))
    .orderBy(plans.ordemExibicao);
  assert.equal(dbPlans.length, 4);

  const [legacyPadrinho] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, 'padrinho'));
  if (legacyPadrinho) {
    assert.equal(legacyPadrinho.ativo, false);
  }

  const bySlug = Object.fromEntries(dbPlans.map((p) => [p.slug, p]));

  // 1. Gratuito: R$ 0,00 | 5 oportunidades | exibe_anuncios = true
  assert.equal(bySlug.gratuito.precoMensalCentavos, 0);
  assert.equal(bySlug.gratuito.precoAnualCentavos, 0);
  assert.equal(bySlug.gratuito.limiteOportunidadesMensal, 5);
  assert.equal(bySlug.gratuito.prioridadeMatching, 0);
  assert.equal(bySlug.gratuito.permiteDestaque, false);
  assert.equal(bySlug.gratuito.permiteRelatoriosAvancados, false);
  assert.equal(bySlug.gratuito.exibeAnuncios, true);

  // 2. Essencial: R$ 29,90/mês (2990) | R$ 299/ano (29900) | 15 oportunidades | sem anúncios
  assert.equal(bySlug.essencial.precoMensalCentavos, 2990);
  assert.equal(bySlug.essencial.precoAnualCentavos, 29900);
  assert.equal(bySlug.essencial.limiteOportunidadesMensal, 15);
  assert.equal(bySlug.essencial.prioridadeMatching, 2);
  assert.equal(bySlug.essencial.exibeAnuncios, false);

  // 3. Profissional: R$ 59,90/mês (5990) | R$ 599/ano (59900) | 40 oportunidades | destaque & portfólio ilimitado
  assert.equal(bySlug.profissional.precoMensalCentavos, 5990);
  assert.equal(bySlug.profissional.precoAnualCentavos, 59900);
  assert.equal(bySlug.profissional.limiteOportunidadesMensal, 40);
  assert.equal(bySlug.profissional.prioridadeMatching, 5);
  assert.equal(bySlug.profissional.permiteDestaque, true);
  assert.equal(bySlug.profissional.permitePortfolioIlimitado, true);
  assert.equal(bySlug.profissional.exibeAnuncios, false);

  // 4. Premium: R$ 99,90/mês (9990) | R$ 999/ano (99900) | 100 oportunidades | relatórios avançados
  assert.equal(bySlug.premium.precoMensalCentavos, 9990);
  assert.equal(bySlug.premium.precoAnualCentavos, 99900);
  assert.equal(bySlug.premium.limiteOportunidadesMensal, 100);
  assert.equal(bySlug.premium.prioridadeMatching, 8);
  assert.equal(bySlug.premium.permiteDestaque, true);
  assert.equal(bySlug.premium.permiteRelatoriosAvancados, true);
  assert.equal(bySlug.premium.exibeAnuncios, false);

  // Ensure all monetary values are strictly integers
  for (const plan of INITIAL_PLANS_SEED) {
    assert.equal(Number.isInteger(plan.precoMensalCentavos), true);
    assert.equal(Number.isInteger(plan.precoAnualCentavos), true);
  }

  // Ensure startup seed never overwrites commercial prices edited manually (ON CONFLICT DO NOTHING)
  const originalPrice = bySlug.essencial.precoMensalCentavos;
  try {
    await db
      .update(plans)
      .set({ precoMensalCentavos: originalPrice + 100 })
      .where(eq(plans.slug, 'essencial'));
    await ensureSchemaAndSeed();
    const [afterSeed] = await db
      .select()
      .from(plans)
      .where(eq(plans.slug, 'essencial'));
    assert.equal(afterSeed.precoMensalCentavos, originalPrice + 100);
  } finally {
    await db
      .update(plans)
      .set({ precoMensalCentavos: originalPrice })
      .where(eq(plans.slug, 'essencial'));
  }
});
