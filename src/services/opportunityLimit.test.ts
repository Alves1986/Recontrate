import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSchemaAndSeed, pool } from '../db/index';
import { AsaasBillingAdapter } from './billingProvider';
import { OpportunityLimitService } from './opportunityLimitService';
import { SubscriptionLifecycleService } from './subscriptionLifecycle';
import { getMatchingPriority } from '../utils/marketplaceRules';
import type { ProviderProfile } from '../types/confiare';

test.after(async () => {
  await pool.end();
});

test('Gratuito plan never receives more than 5 opportunities per month and offers upgrade without blocking profile', async () => {
  await ensureSchemaAndSeed();
  const limitService = new OpportunityLimitService();
  const lifecycle = new SubscriptionLifecycleService(
    new AsaasBillingAdapter({ apiKey: '' })
  );

  const testProviderId = `prov-free-${Date.now()}`;
  await lifecycle.startCheckout({
    providerProfileId: testProviderId,
    providerName: 'Prestador Gratuito Teste',
    providerEmail: 'free@confiare.com.br',
    providerPhone: '(11) 99000-0001',
    planSlug: 'gratuito',
    cycle: 'mensal',
    paymentMethod: 'pix',
  });

  // Opportunities 1 through 5 must be allowed
  for (let i = 1; i <= 5; i++) {
    const res = await limitService.recordOpportunitySent(testProviderId);
    assert.equal(res.allowed, true, `Opportunity #${i} should be allowed`);
    assert.equal(res.status.used, i);
    assert.equal(res.status.remaining, 5 - i);
  }

  // Opportunity #6 must be blocked
  const sixth = await limitService.recordOpportunitySent(testProviderId);
  assert.equal(sixth.allowed, false, '6th opportunity on Gratuito must be blocked');
  assert.equal(sixth.status.used, 5);
  assert.equal(sixth.status.remaining, 0);
  assert.equal(sixth.status.limitReached, true);
  assert.equal(sixth.status.upgradeSuggested, true);
  assert.equal(sixth.status.profileBlocked, false);
});

test('Paid plans enforce exact limits (15 / 40 / 100) and upgrading immediately unlocks higher limit', async () => {
  await ensureSchemaAndSeed();
  const limitService = new OpportunityLimitService();
  const lifecycle = new SubscriptionLifecycleService(
    new AsaasBillingAdapter({ apiKey: '' })
  );

  const testProviderId = `prov-paid-${Date.now()}`;
  const checkout = await lifecycle.startCheckout({
    providerProfileId: testProviderId,
    providerName: 'Prestador Pago Teste',
    providerEmail: 'paid@confiare.com.br',
    providerPhone: '(11) 99000-0002',
    planSlug: 'essencial',
    cycle: 'mensal',
    paymentMethod: 'pix',
  });
  await lifecycle.activateSubscription(checkout.subscription.id);

  // Essencial has limit 15
  for (let i = 1; i <= 15; i++) {
    const res = await limitService.recordOpportunitySent(testProviderId);
    assert.equal(res.allowed, true);
  }
  const sixteenth = await limitService.recordOpportunitySent(testProviderId);
  assert.equal(sixteenth.allowed, false, '16th opportunity on Essencial must be blocked');
  assert.equal(sixteenth.status.limit, 15);

  // Upgrade immediately to Profissional (limit 40) -> 16th opportunity now succeeds!
  await lifecycle.upgradeSubscription({
    subscriptionId: checkout.subscription.id,
    targetPlanSlug: 'profissional',
  });

  const afterUpgrade = await limitService.recordOpportunitySent(testProviderId);
  assert.equal(afterUpgrade.allowed, true, 'Upgrade to Profissional unlocks up to 40');
  assert.equal(afterUpgrade.status.limit, 40);
  assert.equal(afterUpgrade.status.used, 16);
  assert.equal(afterUpgrade.status.remaining, 24);
});

test('getMatchingPriority combines compatibility, availability, reputation, and moderate plan bonus without buying reputation', () => {
  const highRepGratuito: ProviderProfile = {
    id: 'prov-free-star',
    name: 'Mestre Gratuito',
    initials: 'MG',
    category: 'Eletricista',
    specialties: ['Quadros'],
    neighborhoods: ['Pinheiros'],
    city: 'São Paulo, SP',
    yearsExperience: 12,
    bio: 'Eletricista em Pinheiros',
    isVerified: true,
    isTopRegion: false,
    plan: 'Gratuito',
    ratingAvg: 5.0,
    reviewsCount: 80,
    completedJobs: 100,
    responseTimeMinutes: 8,
    responseRatePercent: 100,
    attendanceRatePercent: 100,
    profileCompletenessPercent: 100,
    availableToday: true,
    whatsapp: '(11) 99999-0001',
    previouslyHiredByCurrentUser: true,
    trustedSubstitutesIds: [],
    portfolio: [],
    reviews: [],
  };

  const lowRepPremium: ProviderProfile = {
    ...highRepGratuito,
    id: 'prov-premium-low',
    name: 'Prestador Premium Distante',
    neighborhoods: ['Outro Bairro'],
    plan: 'Premium',
    ratingAvg: 3.2,
    responseTimeMinutes: 75,
    responseRatePercent: 60,
    attendanceRatePercent: 85,
    availableToday: false,
    previouslyHiredByCurrentUser: false,
  };

  const scoreFree = getMatchingPriority(highRepGratuito, {
    locationQuery: 'Pinheiros',
  });
  const scorePremium = getMatchingPriority(lowRepPremium, {
    locationQuery: 'Pinheiros',
    cancellationCount: 2,
  });

  // Plan never buys composite reputation score
  assert.ok(scoreFree.compositeScore > scorePremium.compositeScore);
  // Compatible, available, high-reputation Gratuito provider outranks incompatible, low-reputation Premium provider
  assert.ok(scoreFree.priorityScore > scorePremium.priorityScore);
});
