import test from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { db, ensureSchemaAndSeed, pool } from '../db/index';
import { providerProfiles } from '../db/schema';
import { AsaasBillingAdapter } from './billingProvider';
import {
  calculateProRataUpgradeCents,
  SubscriptionLifecycleService,
} from './subscriptionLifecycle';

const TEST_WEBHOOK_SECRET = 'test_wh_secret_confiare_2026';

function createTestService() {
  const adapter = new AsaasBillingAdapter({
    apiKey: '',
    webhookToken: TEST_WEBHOOK_SECRET,
  });
  return new SubscriptionLifecycleService(adapter);
}

test.after(async () => {
  await pool.end();
});

test('calculateProRataUpgradeCents computes exact integer centavos for remaining cycle days', () => {
  const start = new Date('2026-11-01T00:00:00Z');
  const end = new Date('2026-12-01T00:00:00Z'); // 30 days
  const halfWay = new Date('2026-11-16T00:00:00Z'); // 15 days left (50%)

  // Upgrade from Essencial (2990) to Profissional (5990) -> diff = 3000 -> 50% = 1500 centavos
  const proRata = calculateProRataUpgradeCents({
    currentPriceCents: 2990,
    newPriceCents: 5990,
    cycleStart: start,
    cycleEnd: end,
    now: halfWay,
  });
  assert.equal(proRata, 1500);
  assert.equal(Number.isInteger(proRata), true);
});

test('Subscription lifecycle: checkout -> webhook invoice_paid -> duplicate & out-of-order webhook protection', async () => {
  await ensureSchemaAndSeed();
  const service = createTestService();

  const checkout = await service.startCheckout({
    providerProfileId: 'prov-joao',
    providerName: 'João Batista Silva',
    providerEmail: 'joao@confiare.com.br',
    providerPhone: '(11) 99812-4401',
    planSlug: 'essencial',
    cycle: 'mensal',
    paymentMethod: 'pix',
  });

  assert.equal(checkout.subscription.status, 'pendente');
  assert.equal(checkout.invoice.valorCentavos, 2990);

  const eventId = `evt_paid_${Date.now()}`;
  const rawPayload = JSON.stringify({
    id: eventId,
    event: 'PAYMENT_CONFIRMED',
    payment: {
      id: checkout.invoice.gatewayInvoiceId,
      subscription: checkout.subscription.gatewaySubscriptionId,
      value: 29.9,
      billingType: 'PIX',
      externalReference: checkout.subscription.id,
    },
  });

  // 1. First webhook activates subscription
  const firstResult = await service.processWebhook(rawPayload, {
    'asaas-access-token': TEST_WEBHOOK_SECRET,
  });
  assert.equal(firstResult.ok, true);
  assert.equal(firstResult.duplicate, false);
  assert.equal(firstResult.status, 'processado');

  const summaryAfterPaid = await service.getProviderSubscriptionSummary('prov-joao');
  assert.equal(summaryAfterPaid.subscription?.id, checkout.subscription.id);
  assert.equal(summaryAfterPaid.subscription?.status, 'ativa');
  assert.equal(summaryAfterPaid.plan.slug, 'essencial');

  // 2. Duplicate webhook with same eventId is ignored idempotently
  const dupResult = await service.processWebhook(rawPayload, {
    'asaas-access-token': TEST_WEBHOOK_SECRET,
  });
  assert.equal(dupResult.ok, true);
  assert.equal(dupResult.duplicate, true);

  // 3. Out-of-order older PAYMENT_CREATED webhook does not regress active subscription
  const outOfOrderPayload = JSON.stringify({
    id: `evt_created_late_${Date.now()}`,
    event: 'PAYMENT_CREATED',
    payment: {
      id: checkout.invoice.gatewayInvoiceId,
      subscription: checkout.subscription.gatewaySubscriptionId,
      value: 29.9,
      billingType: 'PIX',
      externalReference: checkout.subscription.id,
    },
  });
  const outOfOrderRes = await service.processWebhook(outOfOrderPayload, {
    'asaas-access-token': TEST_WEBHOOK_SECRET,
  });
  assert.equal(outOfOrderRes.outOfOrderIgnored, true);

  const summaryStillActive = await service.getProviderSubscriptionSummary('prov-joao');
  assert.equal(summaryStillActive.subscription?.status, 'ativa');
});

test('Upgrade applies immediately with pro-rata and stable renewal date; Downgrade schedules for cycle end', async () => {
  await ensureSchemaAndSeed();
  const service = createTestService();

  const checkout = await service.startCheckout({
    providerProfileId: 'prov-joao',
    providerName: 'João Batista Silva',
    providerEmail: 'joao@confiare.com.br',
    providerPhone: '(11) 99812-4401',
    planSlug: 'essencial',
    cycle: 'mensal',
    paymentMethod: 'pix',
  });
  await service.activateSubscription(checkout.subscription.id);

  const originalFim = checkout.subscription.fim;

  // Upgrade Essencial -> Profissional
  const upgraded = await service.upgradeSubscription({
    subscriptionId: checkout.subscription.id,
    targetPlanSlug: 'profissional',
  });

  assert.equal(upgraded.newPlan.slug, 'profissional');
  assert.equal(upgraded.newPlan.limiteOportunidadesMensal, 40);
  assert.equal(upgraded.subscription.fim.getTime(), originalFim.getTime());
  assert.ok(upgraded.proRataCents > 0);

  // Downgrade Profissional -> Essencial keeps Profissional until cycle end
  const downgraded = await service.scheduleDowngrade({
    subscriptionId: checkout.subscription.id,
    targetPlanSlug: 'essencial',
  });

  assert.equal(downgraded.currentPlan.slug, 'profissional');
  assert.equal(downgraded.scheduledPlan.slug, 'essencial');
  assert.equal(
    downgraded.subscription.planId,
    upgraded.newPlan.id // still Profissional until cycle end
  );
  assert.equal(downgraded.effectiveDate.getTime(), originalFim.getTime());
});

test('Inadimplência applies 7-day grace period and downgrades to Gratuito after tolerance without deleting provider data', async () => {
  await ensureSchemaAndSeed();
  const service = createTestService();

  const checkout = await service.startCheckout({
    providerProfileId: 'prov-joao',
    providerName: 'João Batista Silva',
    providerEmail: 'joao@confiare.com.br',
    providerPhone: '(11) 99812-4401',
    planSlug: 'premium',
    cycle: 'mensal',
    paymentMethod: 'cartao',
  });
  await service.activateSubscription(checkout.subscription.id);

  const failTime = new Date('2026-11-16T10:00:00Z');
  const failedSub = await service.markPaymentFailed(
    checkout.subscription.id,
    failTime
  );
  assert.equal(failedSub.status, 'inadimplente');
  assert.ok(failedSub.toleranciaAte);

  // Day 5 (within 7-day grace period): still inadimplente with tolerance active, not downgraded yet
  const day5 = new Date('2026-11-21T10:00:00Z');
  await service.runLifecycleJobs(day5);
  const summaryDay5 = await service.getProviderSubscriptionSummary('prov-joao');
  assert.equal(summaryDay5.subscription?.status, 'inadimplente');
  assert.equal(summaryDay5.plan.slug, 'premium');

  // Day 8 (after 7-day grace period): downgraded to Gratuito, profile & reviews preserved
  const day8 = new Date('2026-11-24T12:00:00Z');
  const jobResult = await service.runLifecycleJobs(day8);
  assert.ok(jobResult.overdueDowngraded >= 1);

  const summaryDay8 = await service.getProviderSubscriptionSummary('prov-joao');
  assert.equal(summaryDay8.subscription?.status, 'expirada');
  assert.equal(summaryDay8.plan.slug, 'gratuito');

  const [providerAfter] = await db
    .select()
    .from(providerProfiles)
    .where(eq(providerProfiles.id, 'prov-joao'));
  assert.ok(providerAfter, 'Provider profile must never be deleted on default');
  assert.equal(providerAfter.reviewsCount, 94);
  assert.equal(providerAfter.planSlug, 'gratuito');
});
