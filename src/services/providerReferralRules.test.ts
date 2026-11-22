import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import {
  REFERRAL_REWARD_DAYS,
  REFERRED_WELCOME_BONUS_DAYS,
  buildReferralShareUrl,
  buildWhatsAppInviteUrl,
  computeReferralMetrics,
  generateReadableReferralCode,
  isSelfReferralAttempt,
  normalizeReferralCode,
} from './providerReferralService';
import { canUserAccessRoute, isProtectedRoutePath } from '../App';
import { extractAuthTokenCandidates, isCompactJwt } from '../server/authMiddleware';
import { createApp } from '../server/index';
import { pool } from '../db/index';

let server: Server;
let baseUrl = '';

test.before(async () => {
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
    (
      server as Server & { closeAllConnections?: () => void }
    ).closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await pool.end();
});

test('1. Constantes de recompensa (+15d indicador e +10d indicado) e geração de código', () => {
  assert.equal(REFERRAL_REWARD_DAYS, 15);
  assert.equal(REFERRED_WELCOME_BONUS_DAYS, 10);
  assert.equal(normalizeReferralCode('  rec-abc234 '), 'REC-ABC234');

  const seeded1 = generateReadableReferralCode('user-uuid-001');
  const seeded2 = generateReadableReferralCode('user-uuid-001');
  const randomCode = generateReadableReferralCode();

  assert.equal(seeded1, seeded2);
  assert.match(seeded1, /^REC-[A-HJ-NP-Z2-9]{6}$/);
  assert.match(randomCode, /^REC-[A-HJ-NP-Z2-9]{6}$/);
});

test('2. Bloqueio antifraude de autoindicação (mesmo userId, email ou telefone)', () => {
  assert.equal(
    isSelfReferralAttempt(
      { userId: 'u-1', email: 'joao@recontrate.com.br', phone: '(11) 99999-1111' },
      { userId: 'u-1', email: 'outro@recontrate.com.br', phone: '(11) 98888-2222' }
    ),
    true
  );

  assert.equal(
    isSelfReferralAttempt(
      { email: 'Maria@Exemplo.COM ', phone: '(11) 91234-5678' },
      { email: 'maria@exemplo.com', phone: '(21) 90000-0000' }
    ),
    true
  );

  assert.equal(
    isSelfReferralAttempt(
      { email: 'a@recontrate.com', phone: '(11) 98765-4321' },
      { email: 'b@recontrate.com', phone: '11987654321' }
    ),
    true
  );

  assert.equal(
    isSelfReferralAttempt(
      { userId: 'u-1', email: 'a@recontrate.com', phone: '(11) 98765-4321' },
      { userId: 'u-2', email: 'b@recontrate.com', phone: '(11) 91111-2222' }
    ),
    false
  );
});

test('3. Cálculo das métricas e funil de indicações de prestadores (+15 dias grátis)', () => {
  const empty = computeReferralMetrics({ clicksCount: 0, referrals: [] });
  assert.equal(empty.totalInvites, 0);
  assert.equal(empty.conversionRatePercent, 0);
  assert.equal(empty.totalFreeDaysEarned, 0);
  assert.equal(empty.rewardDaysPerProvider, 15);

  const metrics = computeReferralMetrics({
    clicksCount: 10,
    referrals: [
      { status: 'convite_enviado', rewardDays: 15, rewardStatus: 'pendente' },
      { status: 'cadastrado', rewardDays: 15, rewardStatus: 'pendente' },
      { status: 'validado', rewardDays: 15, rewardStatus: 'disponivel' },
      {
        status: 'validado',
        rewardDays: 15,
        rewardStatus: 'aplicado_na_assinatura',
      },
      { status: 'bloqueado', rewardDays: 15, rewardStatus: 'cancelado' },
    ],
  });

  assert.equal(metrics.totalInvites, 5);
  assert.equal(metrics.pendingInvites, 1);
  assert.equal(metrics.registeredWaitingOnboarding, 1);
  assert.equal(metrics.validatedReferrals, 2);
  assert.equal(metrics.blockedReferrals, 1);
  assert.equal(metrics.clicksCount, 10);
  assert.equal(metrics.totalFreeDaysEarned, 30);
  assert.equal(metrics.availableFreeDays, 15);
  assert.equal(metrics.appliedFreeDays, 15);
  assert.equal(metrics.pendingFreeDays, 15);
  assert.equal(metrics.conversionRatePercent, 20);
  assert.equal(metrics.referredWelcomeBonusDays, 10);
  assert.equal(metrics.receivedWelcomeBonusDays, 0);

  const metricsWithAvailableBonus = computeReferralMetrics({
    clicksCount: 4,
    referrals: [],
    receivedWelcomeBonus: {
      status: 'validado',
      rewardDays: 10,
      rewardStatus: 'disponivel',
    },
  });
  assert.equal(metricsWithAvailableBonus.receivedWelcomeBonusDays, 10);
  assert.equal(metricsWithAvailableBonus.receivedWelcomeBonusAvailableDays, 10);
  assert.equal(metricsWithAvailableBonus.receivedWelcomeBonusAppliedDays, 0);
  assert.equal(metricsWithAvailableBonus.totalFreeDaysEarned, 10);
  assert.equal(metricsWithAvailableBonus.availableFreeDays, 10);

  const metricsWithAppliedBonus = computeReferralMetrics({
    clicksCount: 4,
    referrals: [
      { status: 'validado', rewardDays: 15, rewardStatus: 'aplicado_na_assinatura' },
    ],
    receivedWelcomeBonus: {
      status: 'validado',
      rewardDays: 10,
      rewardStatus: 'aplicado_na_assinatura',
    },
  });
  assert.equal(metricsWithAppliedBonus.receivedWelcomeBonusDays, 10);
  assert.equal(metricsWithAppliedBonus.receivedWelcomeBonusAppliedDays, 10);
  assert.equal(metricsWithAppliedBonus.totalFreeDaysEarned, 25);
  assert.equal(metricsWithAppliedBonus.appliedFreeDays, 25);
});

test('4. Construção de URL de indicação (?ref=...) e mensagem de convite WhatsApp', () => {
  const shareUrl = buildReferralShareUrl(
    'https://recontrate.com.br/',
    'rec-joao9a'
  );
  assert.equal(
    shareUrl,
    'https://recontrate.com.br/criar-conta?role=prestador&ref=REC-JOAO9A'
  );

  const waWithPhone = buildWhatsAppInviteUrl({
    phone: '(11) 98765-4321',
    referredName: 'Carlos',
    referrerName: 'Ana',
    shareUrl,
    code: 'REC-JOAO9A',
  });
  assert.match(waWithPhone, /^https:\/\/wa\.me\/5511987654321\?text=/);
  const decodedWa = decodeURIComponent(waWithPhone);
  assert.match(decodedWa, /REC-JOAO9A/);
  assert.match(decodedWa, /10 dias grátis/);

  const waGeneric = buildWhatsAppInviteUrl({
    shareUrl,
    code: 'REC-JOAO9A',
  });
  assert.match(waGeneric, /^https:\/\/wa\.me\/\?text=/);
});

test('5. Regra estrita de negócio: só pode indicar quando cadastrado e logado (UI + API 401)', async () => {
  assert.equal(isProtectedRoutePath('/app/indicacoes'), true);
  assert.deepEqual(canUserAccessRoute('/app/indicacoes', null), {
    allowed: false,
    redirectTo: '/entrar',
  });
  assert.deepEqual(
    canUserAccessRoute('/app/indicacoes', {
      userId: 'u-1',
      neonAuthUserId: null,
      fullName: 'Carlos Eletricista',
      email: 'carlos@recontrate.com.br',
      roles: ['prestador'],
      activeRole: 'prestador',
      status: 'ativo',
      emailVerified: true,
      onboardingCompleted: true,
      providerProfileId: 'prov-u1',
      redirectTo: '/app/prestador',
    }),
    { allowed: true }
  );

  const dashRes = await fetch(`${baseUrl}/api/app/referrals/dashboard`);
  assert.equal(dashRes.status, 401);
  const dashBody = await dashRes.json();
  assert.equal(dashBody.ok, false);

  const inviteRes = await fetch(`${baseUrl}/api/app/referrals/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      referredName: 'Novo Prestador',
      referredPhone: '(11) 98888-7777',
    }),
  });
  assert.equal(inviteRes.status, 401);
  const inviteBody = await inviteRes.json();
  assert.equal(inviteBody.ok, false);

  const applyRes = await fetch(`${baseUrl}/api/app/referrals/apply-days`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(applyRes.status, 401);
  const applyBody = await applyRes.json();
  assert.equal(applyBody.ok, false);
});

test('6. Autenticação rejeita token inválido sem vazar "Invalid Compact JWS" e prioriza cookie JWT', async () => {
  const validJwtCookie = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1LTEifQ.c2lnbmF0dXJlMTIzNDU2Nzg';
  assert.equal(isCompactJwt(validJwtCookie), true);
  assert.equal(isCompactJwt('pilot-token-123'), false);

  const prioritized = extractAuthTokenCandidates({
    headers: {
      authorization: 'Bearer pilot-token-123',
      cookie: `confiare_session=${encodeURIComponent(validJwtCookie)}`,
    },
  } as any);
  assert.deepEqual(prioritized, [validJwtCookie, 'pilot-token-123']);

  const ignoredGarbage = extractAuthTokenCandidates({
    headers: {
      authorization: 'Bearer undefined',
      cookie: 'confiare_session=null',
    },
  } as any);
  assert.deepEqual(ignoredGarbage, []);

  const taxRes = await fetch(
    `${baseUrl}/api/app/prestador/taxonomy?providerProfileId=prov-teste`,
    {
      headers: { Authorization: 'Bearer pilot-token-invalid' },
    }
  );
  assert.equal(taxRes.status, 401);
  const taxBody = await taxRes.json();
  assert.equal(taxBody.ok, false);
  assert.doesNotMatch(String(taxBody.error), /Compact JWS/i);
  assert.match(String(taxBody.error), /sessão expirou/i);

  const specRes = await fetch(`${baseUrl}/api/app/prestador/specialties`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer pilot-token-invalid',
    },
    body: JSON.stringify({
      categoryId: 'cat-eletrica',
      specialtyIds: ['spec-eletrica-1'],
    }),
  });
  assert.equal(specRes.status, 401);
  const specBody = await specRes.json();
  assert.equal(specBody.ok, false);
  assert.doesNotMatch(String(specBody.error), /Compact JWS/i);
});
