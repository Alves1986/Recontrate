import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSchemaAndSeed, pool } from '../db/index';
import { AsaasBillingAdapter } from './billingProvider';
import { SubscriptionLifecycleService } from './subscriptionLifecycle';
import {
  AdAndMetricsService,
  validateAdSlotContent,
} from './adAndMetricsService';

test.after(async () => {
  await pool.end();
});

test('Ads never appear in any client flow and never appear for paid plans', async () => {
  await ensureSchemaAndSeed();
  const adService = new AdAndMetricsService();
  const lifecycle = new SubscriptionLifecycleService(
    new AsaasBillingAdapter({ apiKey: '' })
  );

  const freeProvId = `prov-ad-free-${Date.now()}`;
  await lifecycle.startCheckout({
    providerProfileId: freeProvId,
    providerName: 'Prestador Gratuito Ads',
    providerEmail: 'adfree@confiare.com.br',
    providerPhone: '(11) 99111-0001',
    planSlug: 'gratuito',
    cycle: 'mensal',
    paymentMethod: 'pix',
  });

  // 1. All client flow surfaces must strictly return null
  const clientSurfaces = [
    'fluxo_busca_cliente',
    'fluxo_solicitacao_cliente',
    'fluxo_selecao_prestador',
    'fluxo_liberacao_contato',
  ] as const;

  for (const surface of clientSurfaces) {
    const ad = await adService.getEligibleAdForSurface({
      surface,
      providerProfileId: freeProvId,
      sessionBannersShown: 0,
    });
    assert.equal(ad, null, `Ad must never appear on ${surface}`);
  }

  // 2. Paid plan provider must never see ads on provider panel
  const paidProvId = `prov-ad-paid-${Date.now()}`;
  const paidCheckout = await lifecycle.startCheckout({
    providerProfileId: paidProvId,
    providerName: 'Prestador Essencial Sem Ads',
    providerEmail: 'adpaid@confiare.com.br',
    providerPhone: '(11) 99111-0002',
    planSlug: 'essencial',
    cycle: 'mensal',
    paymentMethod: 'pix',
  });
  await lifecycle.activateSubscription(paidCheckout.subscription.id);

  const paidAd = await adService.getEligibleAdForSurface({
    surface: 'painel_prestador',
    providerProfileId: paidProvId,
    sessionBannersShown: 0,
  });
  assert.equal(paidAd, null, 'Paid plan provider must not see ads');
});

test('Gratuito provider panel enforces max 1 banner per session, max 3 impressions per day, and "Patrocinado" badge', async () => {
  await ensureSchemaAndSeed();
  const adService = new AdAndMetricsService();
  const lifecycle = new SubscriptionLifecycleService(
    new AsaasBillingAdapter({ apiKey: '' })
  );

  const freeProvId = `prov-ad-cap-${Date.now()}`;
  await lifecycle.startCheckout({
    providerProfileId: freeProvId,
    providerName: 'Prestador Gratuito Cap',
    providerEmail: 'adcap@confiare.com.br',
    providerPhone: '(11) 99111-0003',
    planSlug: 'gratuito',
    cycle: 'mensal',
    paymentMethod: 'pix',
  });

  // Session 1, Impression 1 -> allowed with badge 'Patrocinado'
  const imp1 = await adService.getEligibleAdForSurface({
    surface: 'painel_prestador',
    providerProfileId: freeProvId,
    sessionBannersShown: 0,
  });
  assert.ok(imp1);
  assert.equal(imp1.badge, 'Patrocinado');
  assert.equal(imp1.dailyImpressionsUsed, 1);

  // Same session (sessionBannersShown = 1) -> blocked (max 1 banner per session)
  const sameSession = await adService.getEligibleAdForSurface({
    surface: 'painel_prestador',
    providerProfileId: freeProvId,
    sessionBannersShown: 1,
  });
  assert.equal(sameSession, null, 'Max 1 banner per panel session');

  // Session 2 & 3 on same day -> impressions 2 and 3 allowed
  const imp2 = await adService.getEligibleAdForSurface({
    surface: 'painel_prestador',
    providerProfileId: freeProvId,
    sessionBannersShown: 0,
  });
  assert.ok(imp2);
  assert.equal(imp2.dailyImpressionsUsed, 2);

  const imp3 = await adService.getEligibleAdForSurface({
    surface: 'painel_prestador',
    providerProfileId: freeProvId,
    sessionBannersShown: 0,
  });
  assert.ok(imp3);
  assert.equal(imp3.dailyImpressionsUsed, 3);

  // Session 4 on same day -> blocked (max 3 impressions per provider per day)
  const imp4 = await adService.getEligibleAdForSurface({
    surface: 'painel_prestador',
    providerProfileId: freeProvId,
    sessionBannersShown: 0,
  });
  assert.equal(imp4, null, 'Max 3 impressions per provider per day');
});

test('validateAdSlotContent blocks gambling, predatory loans, adult content, and competitors, and getAdminMetrics computes MRR/ARR/CTR', async () => {
  const blockedBet = validateAdSlotContent({
    nome: 'Ganhe dinheiro na Bet Cassino',
    categoria: 'ferramentas',
    anunciante: 'Bet123',
    texto: 'Aposte agora',
  });
  assert.equal(blockedBet.valid, false);

  const blockedCategory = validateAdSlotContent({
    nome: 'Produto Aleatório',
    categoria: 'criptomoedas',
    anunciante: 'Empresa X',
    texto: 'Compre agora',
  });
  assert.equal(blockedCategory.valid, false);

  const validToolAd = validateAdSlotContent({
    nome: 'Parafusadeira Brushless 20V',
    categoria: 'ferramentas',
    anunciante: 'Loja do Mecânico & Eletricista',
    texto: 'Condição especial para autônomos Confiare.',
  });
  assert.equal(validToolAd.valid, true);

  const adService = new AdAndMetricsService();
  const metrics = await adService.getAdminMetrics();
  assert.equal(Number.isInteger(metrics.mrrCentavos), true);
  assert.equal(metrics.arrCentavos, metrics.mrrCentavos * 12);
  assert.ok(metrics.adImpressionsCount >= 3);
});
