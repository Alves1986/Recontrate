import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { ensureSchemaAndSeed, pool } from '../db/index';
import {
  calculateAnnualMonthlyEquivalentCentavos,
  calculateAnnualSavingsCentavos,
  formatCentavosBRL,
} from '../utils/pricingCalculations';

let server: Server;
let baseUrl: string;

test.before(async () => {
  await ensureSchemaAndSeed();
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await pool.end();
});

test('1. API GET /api/plans retorna os 5 planos com valores exatos em centavos, limites e metadados', async () => {
  const res = await fetch(`${baseUrl}/api/plans`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  assert.equal(body.ok, true);
  assert.equal(body.plans.length, 5);

  const bySlug = Object.fromEntries(body.plans.map((p: any) => [p.slug, p]));

  // Ordem de exibição: Gratuito -> Essencial -> Profissional -> Premium -> Padrinho
  assert.deepEqual(
    body.plans.map((p: any) => p.slug),
    ['gratuito', 'essencial', 'profissional', 'premium', 'padrinho']
  );

  // Gratuito
  assert.equal(bySlug.gratuito.precoMensalCentavos, 0);
  assert.equal(bySlug.gratuito.precoAnualCentavos, 0);
  assert.equal(bySlug.gratuito.limiteOportunidadesMensal, 5);
  assert.equal(bySlug.gratuito.prioridadeLabel, 'Baixa');
  assert.equal(bySlug.gratuito.exibeAnuncios, true);
  assert.equal(bySlug.gratuito.limiteFotosPortfolio, 5);
  assert.equal(bySlug.gratuito.selo, null);

  // Essencial
  assert.equal(bySlug.essencial.precoMensalCentavos, 2990);
  assert.equal(bySlug.essencial.precoAnualCentavos, 29900);
  assert.equal(bySlug.essencial.limiteOportunidadesMensal, 15);
  assert.equal(bySlug.essencial.prioridadeLabel, 'Leve');
  assert.equal(bySlug.essencial.exibeAnuncios, false);
  assert.equal(bySlug.essencial.limiteFotosPortfolio, 10);
  assert.equal(bySlug.essencial.selo, 'Essencial');

  // Profissional
  assert.equal(bySlug.profissional.precoMensalCentavos, 5990);
  assert.equal(bySlug.profissional.precoAnualCentavos, 59900);
  assert.equal(bySlug.profissional.limiteOportunidadesMensal, 40);
  assert.equal(bySlug.profissional.prioridadeLabel, 'Média');
  assert.equal(bySlug.profissional.permiteDestaque, true);
  assert.equal(bySlug.profissional.permitePortfolioIlimitado, true);
  assert.equal(bySlug.profissional.exibeAnuncios, false);
  assert.equal(bySlug.profissional.selo, 'Profissional Confiare');

  // Premium
  assert.equal(bySlug.premium.precoMensalCentavos, 9990);
  assert.equal(bySlug.premium.precoAnualCentavos, 99900);
  assert.equal(bySlug.premium.limiteOportunidadesMensal, 100);
  assert.equal(bySlug.premium.prioridadeLabel, 'Alta');
  assert.equal(bySlug.premium.permiteRelatoriosAvancados, true);
  assert.equal(bySlug.premium.suportePrioritario, true);
  assert.equal(bySlug.premium.exibeAnuncios, false);
  assert.equal(bySlug.premium.selo, 'Top Confiare');

  // Padrinho
  assert.equal(bySlug.padrinho.precoMensalCentavos, 9990);
  assert.equal(bySlug.padrinho.precoAnualCentavos, 99900);
  assert.equal(bySlug.padrinho.limiteOportunidadesMensal, 100);
  assert.equal(bySlug.padrinho.prioridadeLabel, 'Alta');
  assert.equal(bySlug.padrinho.permiteRelatoriosAvancados, true);
  assert.equal(bySlug.padrinho.suportePrioritario, true);
  assert.equal(bySlug.padrinho.exibeAnuncios, false);
  assert.equal(bySlug.padrinho.selo, 'Padrinho Verificado');

  for (const plan of body.plans) {
    assert.equal(Number.isInteger(plan.precoMensalCentavos), true);
    assert.equal(Number.isInteger(plan.precoAnualCentavos), true);
  }
});

test('2. Cálculos do Toggle Mensal/Anual: equivalente mensal exato e economia de 2 meses no ano', () => {
  // Gratuito
  assert.equal(calculateAnnualMonthlyEquivalentCentavos(0), 0);
  assert.equal(calculateAnnualSavingsCentavos(0, 0), 0);

  // Essencial: R$ 29,90/mês | R$ 299,00/ano -> R$ 24,92/mês | economia R$ 59,80
  assert.equal(calculateAnnualMonthlyEquivalentCentavos(29900), 2492);
  assert.equal(calculateAnnualSavingsCentavos(2990, 29900), 5980);

  // Profissional: R$ 59,90/mês | R$ 599,00/ano -> R$ 49,92/mês | economia R$ 119,80
  assert.equal(calculateAnnualMonthlyEquivalentCentavos(59900), 4992);
  assert.equal(calculateAnnualSavingsCentavos(5990, 59900), 11980);
  assert.ok(formatCentavosBRL(4992).includes('49,92'));
  assert.ok(formatCentavosBRL(11980).includes('119,80'));

  // Premium e Padrinho: R$ 99,90/mês | R$ 999,00/ano -> R$ 83,25/mês | economia R$ 199,80
  assert.equal(calculateAnnualMonthlyEquivalentCentavos(99900), 8325);
  assert.equal(calculateAnnualSavingsCentavos(9990, 99900), 19980);
  assert.ok(formatCentavosBRL(8325).includes('83,25'));
  assert.ok(formatCentavosBRL(19980).includes('199,80'));
});
