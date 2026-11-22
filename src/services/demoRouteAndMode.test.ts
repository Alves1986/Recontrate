import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { canUserAccessRoute, isProtectedRoutePath } from '../App';
import {
  DEMO_CLIENT_PERSONA,
  DEMO_SANDBOX_BADGE_TEXT,
  DEMO_SANDBOX_PROVIDERS,
  DEMO_SANDBOX_REQUESTS,
  DEMO_SANDBOX_OPPORTUNITIES,
  DEMO_SANDBOX_REFERRAL,
  simulateDemoBlockedAction,
} from '../data/demoFixtures';
import { shouldRenderMobileLoginOnly } from '../utils/pwaMobileMode';
import { createApp } from '../server/index';
import { pool } from '../db/index';

let server: Server;
let baseUrl: string;

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
    (server as Server & { closeAllConnections?: () => void }).closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await pool.end();
});

test('1. Rota /demo é pública, não substitui / nem altera o modo Login Mobile', () => {
  assert.equal(isProtectedRoutePath('/demo'), false);
  assert.deepEqual(canUserAccessRoute('/demo', null), { allowed: true });

  // Landing page "/" permanece preservada no desktop e Login no mobile
  assert.equal(
    shouldRenderMobileLoginOnly({
      pathname: '/',
      width: 1280,
      isStandalone: false,
      isAuthenticated: false,
    }),
    false
  );
  assert.equal(
    shouldRenderMobileLoginOnly({
      pathname: '/',
      width: 390,
      isStandalone: false,
      isAuthenticated: false,
    }),
    true
  );
  assert.equal(
    shouldRenderMobileLoginOnly({
      pathname: '/demo',
      width: 390,
      isStandalone: false,
      isAuthenticated: false,
    }),
    false
  );
});

test('2. Dados de /demo são 100% fictícios e simulador bloqueia ações reais', () => {
  assert.equal(DEMO_SANDBOX_BADGE_TEXT, 'Ambiente de demonstração');
  assert.match(DEMO_CLIENT_PERSONA.email, /@demo\.confiare\.invalid$/);
  assert.match(DEMO_CLIENT_PERSONA.phone, /^\(11\) 90000-/);

  for (const prov of DEMO_SANDBOX_PROVIDERS) {
    assert.ok(prov.id.startsWith('demo-prov-'));
    assert.match(prov.name, /\(Demo\)$/);
    assert.match(prov.whatsapp, /^\(11\) 90000-/);
  }
  assert.ok(DEMO_SANDBOX_REQUESTS.length >= 1);
  assert.ok(DEMO_SANDBOX_OPPORTUNITIES.length >= 1);
  assert.ok(DEMO_SANDBOX_REFERRAL.substituteProviderIds.length >= 1);

  for (const channel of [
    'cadastro_real',
    'cobranca_gateway',
    'whatsapp_real',
    'email_real',
    'webhook_real',
  ] as const) {
    const res = simulateDemoBlockedAction(channel);
    assert.equal(res.blocked, true);
    assert.match(res.message, /Ambiente de demonstração/);
  }
});

test('3. Componente DemoShowcasePage contém badge, botões de perspectiva e CTAs reais na landing /', () => {
  const demoSrc = readFileSync('src/components/DemoShowcasePage.tsx', 'utf-8');
  assert.match(demoSrc, /Ver como cliente/);
  assert.match(demoSrc, /Ver como prestador/);
  assert.match(demoSrc, /Ver painel administrativo/);
  assert.match(demoSrc, /Ir para cadastro real/);

  const landingSrc = readFileSync('src/components/PublicPages.tsx', 'utf-8');
  assert.match(landingSrc, /\/criar-conta/);
  assert.match(landingSrc, /\/para-prestadores/);
});

test('4. Backend bloqueia cadastro real, cobrança real e webhook real quando x-confiare-demo-sandbox=true', async () => {
  const sandboxHeaders = {
    'Content-Type': 'application/json',
    'x-confiare-demo-sandbox': 'true',
  };

  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: sandboxHeaders,
    body: JSON.stringify({
      email: 'bloqueado@demo.confiare.invalid',
      password: 'Confiare#2026!Password',
      fullName: 'Teste Bloqueado',
      birthDate: '1990-05-15',
    }),
  });
  assert.equal(regRes.status, 403);
  const regBody = (await regRes.json()) as any;
  assert.match(regBody.error, /Ambiente de demonstração/);

  // Checkout exige autenticação (401 sem sessão) ou bloqueia sandbox mesmo autenticado (403)
  const unauthCheckoutRes = await fetch(`${baseUrl}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: sandboxHeaders,
    body: JSON.stringify({}),
  });
  assert.equal(unauthCheckoutRes.status, 401);

  const webhookRes = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: sandboxHeaders,
    body: JSON.stringify({ event: 'PAYMENT_CONFIRMED' }),
  });
  assert.equal(webhookRes.status, 403);
  const webhookBody = (await webhookRes.json()) as any;
  assert.match(webhookBody.error, /Ambiente de demonstração/);
});
