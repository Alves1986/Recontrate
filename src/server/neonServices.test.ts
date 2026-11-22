import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './index';
import { ensureSchemaAndSeed, pool } from '../db/index';
import { setEmailDeliveryObserverForTests } from '../services/essentialIntegrations';

let server: Server;
let baseUrl: string;
let adminToken = '';

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

  const email = `neon.admin.${Date.now()}@example.com`;
  const password = 'Confiare#2026!Password';
  let capturedVfyToken = '';
  setEmailDeliveryObserverForTests((delivery) => {
    if (delivery.to === email && delivery.variables.verificationToken) {
      capturedVfyToken = delivery.variables.verificationToken;
    }
  });
  try {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        fullName: 'Neon Admin Verifier',
        role: 'cliente',
        lgpdConsent: true,
      }),
    });
    const regBody = (await regRes.json()) as any;
    await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationToken: capturedVfyToken }),
    });
    await pool.query(
      `UPDATE users SET roles = ARRAY['admin']::TEXT[], active_role = 'admin', onboarding_completed = true WHERE id = $1::uuid`,
      [regBody.user.userId]
    );
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    adminToken = ((await loginRes.json()) as any).token;
  } finally {
    setEmailDeliveryObserverForTests(null);
  }
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await pool.end();
});

test('1. Lakebase Postgres: bloqueia x-user-role bypass e consulta 4 planos com JWT admin real', async () => {
  const spoofRes = await fetch(`${baseUrl}/api/neon/postgres`, {
    headers: { 'x-user-role': 'admin' },
  });
  assert.equal(spoofRes.status, 401);

  const res = await fetch(`${baseUrl}/api/neon/postgres`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  console.log('[E2E Postgres]', JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.equal(body.plansCount, 4);
  assert.deepEqual(
    body.plans.map((p: any) => p.slug),
    ['gratuito', 'essencial', 'profissional', 'premium']
  );
});

test('2. Neon Auth (Managed Better Auth): signs up user, mints JWT and verifies against NEON_AUTH_JWKS_URL', async () => {
  const res = await fetch(`${baseUrl}/api/neon/auth`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  console.log('[E2E Neon Auth]', JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.ok(body.jwksKeysCount >= 1);
  assert.equal(body.jwtVerifiedAgainstJwks, true);
});

test('3. Neon Object Storage: uploads object via files-sdk/neon, records key in Postgres, downloads & presigns URL', async () => {
  const res = await fetch(`${baseUrl}/api/neon/storage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ title: 'Teste E2E Confiare Object Storage' }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  console.log('[E2E Object Storage]', JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.equal(body.bucket, 'assets');
  assert.equal(body.roundtripVerified, true);
});

test('4. Neon AI Gateway: authenticates with NEON_AI_GATEWAY_TOKEN and lists branch model catalog (/v1/models)', async () => {
  const res = await fetch(`${baseUrl}/api/neon/ai-gateway`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ prompt: 'Olá Confiare' }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  console.log('[E2E AI Gateway]', JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.ok(body.catalogModelsCount > 0);
});

test('5. Neon Functions: resolves functionBaseUrl("hello") and invokes deployed function', async () => {
  const res = await fetch(`${baseUrl}/api/neon/functions`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  console.log('[E2E Neon Functions]', JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.equal(body.status, 200);
  assert.equal(body.response?.service, 'neon-functions');
});

test('6. Neon Realtime: seals Drizzle query, subscribes over Live SQL WebSocket, and commits row with txid', async () => {
  const res = await fetch(`${baseUrl}/api/neon/realtime/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ providerId: 'prov-joao' }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  console.log('[E2E Neon Realtime]', JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.equal(body.liveSubscriptionStatus, 'live');
  assert.ok(body.committedWriteTxId);
});
