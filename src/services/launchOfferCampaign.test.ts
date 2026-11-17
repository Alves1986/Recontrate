import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { ensureSchemaAndSeed, pool } from '../db/index';
import {
  advancePromotionalCycleOrReturnFullPrice,
  checkLaunchOfferEligibility,
  LAUNCH_OFFER_PRICES_CENTAVOS,
  LAUNCH_OFFER_SLUG,
} from './launchOfferService';

let server: Server;
let baseUrl: string;
const TEST_ASAAS_WEBHOOK_TOKEN =
  process.env.ASAAS_WEBHOOK_TOKEN || 'test_wh_secret_confiare_2026';

test.before(async () => {
  process.env.ASAAS_WEBHOOK_TOKEN = TEST_ASAAS_WEBHOOK_TOKEN;
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

async function seedIsolatedProvider(id: string, phone: string) {
  await pool.query(
    `INSERT INTO provider_profiles (
      id, slug, name, category, city, plan_slug, whatsapp
    ) VALUES ($1, $1, $2, 'Eletricista', 'São Paulo, SP', 'gratuito', $3)
    ON CONFLICT (id) DO NOTHING`,
    [id, `Prestador ${id}`, phone]
  );
}

test('1. Valores exatos da campanha em centavos e exclusão de Gratuito e Anual', async () => {
  assert.deepEqual(LAUNCH_OFFER_PRICES_CENTAVOS, {
    essencial: { full: 2990, promo: 1495 },
    profissional: { full: 5990, promo: 2995 },
    premium: { full: 9990, promo: 4995 },
    padrinho: { full: 10990, promo: 5495 },
  });

  const ts = Date.now();
  const freeCheck = await checkLaunchOfferEligibility(
    { email: `free.${ts}@example.com`, phone: '(11) 98111-0001' },
    { providerProfileId: `prov-free-${ts}` },
    { planSlug: 'gratuito', cycle: 'mensal' }
  );
  assert.equal(freeCheck.eligible, false);
  assert.equal(
    freeCheck.reason,
    'Esta oferta não está disponível para o plano selecionado.'
  );

  const annualCheck = await checkLaunchOfferEligibility(
    { email: `annual.${ts}@example.com`, phone: '(11) 98111-0002' },
    { providerProfileId: `prov-annual-${ts}` },
    { planSlug: 'profissional', cycle: 'anual' }
  );
  assert.equal(annualCheck.eligible, false);
  assert.equal(
    annualCheck.reason,
    'Esta oferta não está disponível para o plano selecionado.'
  );
});

test('2. Fluxo Completo: elegibilidade -> checkout Profissional 50% off (2995 centavos) -> webhook -> transição para preço cheio no 4º ciclo', async () => {
  const ts = Date.now();
  const provId = `prov-launch-ok-${ts}`;
  const phone = `(11) 97222-${String(ts).slice(-4)}`;
  const email = `launch.ok.${ts}@example.com`;
  const cpf = `1234567${String(ts).slice(-4)}`;
  await seedIsolatedProvider(provId, phone);

  // 1. Consulta endpoint de elegibilidade
  const eligRes = await fetch(
    `${baseUrl}/api/promotions/launch-offer/eligibility?providerProfileId=${provId}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&cpfCnpj=${cpf}&planSlug=profissional&cycle=mensal`
  );
  assert.equal(eligRes.status, 200);
  const eligBody = (await eligRes.json()) as any;
  assert.equal(eligBody.eligible, true);
  assert.equal(eligBody.selectedPlanPromoCentavos, 2995);
  assert.equal(eligBody.selectedPlanFullCentavos, 5990);
  assert.equal(eligBody.durationCycles, 3);

  // 2. Checkout mensal com oferta de lançamento
  const checkoutRes = await fetch(`${baseUrl}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerProfileId: provId,
      providerName: 'Novo Prestador Lançamento',
      providerEmail: email,
      providerPhone: phone,
      planSlug: 'profissional',
      cycle: 'mensal',
      paymentMethod: 'pix',
      applyLaunchOffer: true,
      cpfCnpj: cpf,
      deviceFingerprint: `fp-${ts}`,
    }),
  });
  assert.equal(checkoutRes.status, 201);
  const checkoutBody = (await checkoutRes.json()) as any;
  assert.equal(checkoutBody.launchOfferApplied, true);
  assert.equal(checkoutBody.invoice.valorCentavos, 2995);
  assert.equal(checkoutBody.launchOfferRedemption.ciclo_promocional_atual, 1);

  // 3. Webhook confirma pagamento e ativa assinatura
  const whRes = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
    },
    body: JSON.stringify({
      id: `evt_launch_${ts}`,
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: checkoutBody.invoice.gatewayInvoiceId,
        subscription: checkoutBody.subscription.gatewaySubscriptionId,
        value: 29.95,
        billingType: 'PIX',
        externalReference: checkoutBody.subscription.id,
      },
    }),
  });
  assert.equal(whRes.status, 202);

  // 4. Ciclos 2 e 3 mantêm promoção; ciclo 4 retorna ao preço cheio (5990)
  const c2 = await advancePromotionalCycleOrReturnFullPrice(
    checkoutBody.subscription.id
  );
  assert.equal(c2.hasActivePromotion, true);
  assert.equal(c2.cycleNumber, 2);

  const c3 = await advancePromotionalCycleOrReturnFullPrice(
    checkoutBody.subscription.id
  );
  assert.equal(c3.hasActivePromotion, true);
  assert.equal(c3.cycleNumber, 3);

  const c4 = await advancePromotionalCycleOrReturnFullPrice(
    checkoutBody.subscription.id
  );
  assert.equal(c4.hasActivePromotion, false);
  assert.equal(c4.returnedToFullPrice, true);
});

test('3. Antifraude Multi-Conta & Cancelamento durante a promoção impedem novo resgate', async () => {
  const ts = Date.now();
  const provId1 = `prov-abuse-1-${ts}`;
  const provId2 = `prov-abuse-2-${ts}`;
  const sharedPhone = `(11) 96333-${String(ts).slice(-4)}`;
  const sharedCpf = `9876543${String(ts).slice(-4)}`;
  const sharedFp = `device-fp-${ts}`;
  await seedIsolatedProvider(provId1, sharedPhone);
  await seedIsolatedProvider(provId2, `(11) 96444-${String(ts).slice(-4)}`);

  // 1. Primeira conta resgata no plano Essencial (R$ 14,95 = 1495 centavos)
  const firstCheckout = await fetch(`${baseUrl}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerProfileId: provId1,
      providerName: 'Conta 1',
      providerEmail: `conta1.${ts}@example.com`,
      providerPhone: sharedPhone,
      planSlug: 'essencial',
      cycle: 'mensal',
      paymentMethod: 'pix',
      applyLaunchOffer: true,
      cpfCnpj: sharedCpf,
      deviceFingerprint: sharedFp,
    }),
  });
  assert.equal(firstCheckout.status, 201);
  const firstBody = (await firstCheckout.json()) as any;
  assert.equal(firstBody.invoice.valorCentavos, 1495);

  // 2. Segunda conta com mesmo CPF/CNPJ ou dispositivo tenta pegar oferta novamente -> BLOQUEADA
  const secondElig = await checkLaunchOfferEligibility(
    {
      email: `conta2.${ts}@example.com`,
      phone: `(11) 96444-${String(ts).slice(-4)}`,
      cpfCnpj: sharedCpf,
      deviceFingerprint: sharedFp,
    },
    { providerProfileId: provId2 },
    { planSlug: 'premium', cycle: 'mensal' }
  );
  assert.equal(secondElig.eligible, false);
  assert.equal(secondElig.resultado, 'bloqueado');
  assert.equal(secondElig.reason, 'Você já utilizou esta oferta anteriormente.');

  const blockedCheckout = await fetch(
    `${baseUrl}/api/subscriptions/checkout`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerProfileId: provId2,
        providerName: 'Conta 2 Fraude',
        providerEmail: `conta2.${ts}@example.com`,
        providerPhone: `(11) 96444-${String(ts).slice(-4)}`,
        planSlug: 'premium',
        cycle: 'mensal',
        paymentMethod: 'pix',
        applyLaunchOffer: true,
        cpfCnpj: sharedCpf,
        deviceFingerprint: sharedFp,
      }),
    }
  );
  assert.equal(blockedCheckout.status, 400);

  // 3. Conta 1 cancela durante a promoção -> perde o restante da oferta e não pode reativar com desconto
  const cancelRes = await fetch(
    `${baseUrl}/api/subscriptions/${firstBody.subscription.id}/cancel`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Desistência no mês 1' }),
    }
  );
  assert.equal(cancelRes.status, 200);

  const recheck = await checkLaunchOfferEligibility(
    { email: `conta1.${ts}@example.com`, phone: sharedPhone },
    { providerProfileId: provId1 },
    { planSlug: 'essencial', cycle: 'mensal' }
  );
  assert.equal(recheck.eligible, false);
  assert.equal(recheck.reason, 'Você já utilizou esta oferta anteriormente.');
});

test('4. Campanha fora da data de vigência retorna "A campanha encerrou."', async () => {
  const ts = Date.now();
  const futureOut = await checkLaunchOfferEligibility(
    { email: `exp.${ts}@example.com` },
    { providerProfileId: `prov-exp-${ts}` },
    {
      planSlug: 'profissional',
      cycle: 'mensal',
      campaignSlug: LAUNCH_OFFER_SLUG,
      now: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    }
  );
  assert.equal(futureOut.eligible, false);
  assert.equal(futureOut.reason, 'A campanha encerrou.');
});

test('5. Eventos duplicados de webhook, falha de pagamento (7 dias), renovação até o 4º ciclo e reativação sem nova oferta', async () => {
  const ts = Date.now();
  const provId = `prov-launch-wh-${ts}`;
  const phone = `(11) 95555-${String(ts).slice(-4)}`;
  const email = `launch.wh.${ts}@example.com`;
  await seedIsolatedProvider(provId, phone);

  // 1. Checkout com oferta de lançamento (Profissional R$ 29,95 = 2995 centavos)
  const checkoutRes = await fetch(`${baseUrl}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerProfileId: provId,
      providerName: 'Prestador Webhook Lançamento',
      providerEmail: email,
      providerPhone: phone,
      planSlug: 'profissional',
      cycle: 'mensal',
      paymentMethod: 'pix',
      applyLaunchOffer: true,
    }),
  });
  assert.equal(checkoutRes.status, 201);
  const checkoutBody = (await checkoutRes.json()) as any;
  const subId = checkoutBody.subscription.id;
  assert.equal(checkoutBody.invoice.valorCentavos, 2995);

  const firstPaidPayload = JSON.stringify({
    id: `evt_dup_check_${ts}`,
    event: 'PAYMENT_CONFIRMED',
    payment: {
      id: checkoutBody.invoice.gatewayInvoiceId,
      subscription: checkoutBody.subscription.gatewaySubscriptionId,
      value: 29.95,
      billingType: 'PIX',
      externalReference: subId,
    },
  });

  // 2. Primeiro webhook ativa assinatura (ciclo 1)
  const wh1 = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
    },
    body: firstPaidPayload,
  });
  assert.equal(wh1.status, 202);

  // 3. Evento duplicado com mesmo id -> ignorado idempotente (200, duplicate: true), mantém ciclo 1
  const whDup = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
    },
    body: firstPaidPayload,
  });
  assert.equal(whDup.status, 200);
  const whDupBody = (await whDup.json()) as any;
  assert.equal(whDupBody.duplicate, true);

  const { rows: cycle1Check } = await pool.query(
    `SELECT ciclo_promocional_atual, status FROM promotional_redemptions WHERE subscription_id = $1`,
    [subId]
  );
  assert.equal(cycle1Check[0].ciclo_promocional_atual, 1);

  // 4. Webhooks de renovação dos ciclos 2, 3 e 4 (no 4º ciclo retorna ao preço cheio)
  for (const cycleIdx of [2, 3, 4]) {
    const renRes = await fetch(`${baseUrl}/api/webhooks/billing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
      },
      body: JSON.stringify({
        id: `evt_ren_${cycleIdx}_${ts}`,
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: checkoutBody.invoice.gatewayInvoiceId,
          subscription: checkoutBody.subscription.gatewaySubscriptionId,
          value: cycleIdx === 4 ? 59.9 : 29.95,
          billingType: 'PIX',
          externalReference: subId,
        },
      }),
    });
    assert.equal(renRes.status, 202);
  }

  const { rows: cycle4Check } = await pool.query(
    `SELECT ciclo_promocional_atual, status FROM promotional_redemptions WHERE subscription_id = $1`,
    [subId]
  );
  assert.equal(cycle4Check[0].ciclo_promocional_atual, 4);
  assert.equal(cycle4Check[0].status, 'concluido');

  // 5. Falha de pagamento (PAYMENT_OVERDUE) aplica 7 dias de tolerância sem excluir o prestador
  const overdueRes = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
    },
    body: JSON.stringify({
      id: `evt_overdue_launch_${ts}`,
      event: 'PAYMENT_OVERDUE',
      payment: {
        id: checkoutBody.invoice.gatewayInvoiceId,
        subscription: checkoutBody.subscription.gatewaySubscriptionId,
        value: 59.9,
        billingType: 'PIX',
        externalReference: subId,
      },
    }),
  });
  assert.equal(overdueRes.status, 202);

  const subAfterOverdue = (await (
    await fetch(`${baseUrl}/api/providers/${provId}/subscription`)
  ).json()) as any;
  assert.equal(subAfterOverdue.subscription.status, 'inadimplente');
  assert.ok(subAfterOverdue.subscription.toleranciaAte);

  // 6. Cancelamento e reativação: reativar tentando usar oferta novamente é bloqueado; reativar no preço cheio funciona
  const cancelRes = await fetch(`${baseUrl}/api/subscriptions/${subId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Cancelamento para testar reativação' }),
  });
  assert.equal(cancelRes.status, 200);

  const reactivateWithPromo = await fetch(
    `${baseUrl}/api/subscriptions/checkout`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerProfileId: provId,
        providerName: 'Prestador Webhook Lançamento',
        providerEmail: email,
        providerPhone: phone,
        planSlug: 'essencial',
        cycle: 'mensal',
        paymentMethod: 'pix',
        applyLaunchOffer: true,
      }),
    }
  );
  assert.equal(reactivateWithPromo.status, 400);

  const reactivateFullPrice = await fetch(
    `${baseUrl}/api/subscriptions/checkout`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerProfileId: provId,
        providerName: 'Prestador Webhook Lançamento',
        providerEmail: email,
        providerPhone: phone,
        planSlug: 'essencial',
        cycle: 'mensal',
        paymentMethod: 'pix',
        applyLaunchOffer: false,
      }),
    }
  );
  assert.equal(reactivateFullPrice.status, 201);
  const reactivateBody = (await reactivateFullPrice.json()) as any;
  assert.equal(reactivateBody.launchOfferApplied, false);
  assert.equal(reactivateBody.invoice.valorCentavos, 2990);
});
