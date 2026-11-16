import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './index';
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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await pool.end();
});

test('1. Lakebase Postgres: migrates via direct URL and queries 5 Confiare plans via pooled URL', async () => {
  const res = await fetch(`${baseUrl}/api/neon/postgres`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  console.log('[E2E Postgres]', JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.equal(body.plansCount, 5);
  assert.deepEqual(
    body.plans.map((p: any) => p.slug),
    ['gratuito', 'essencial', 'profissional', 'premium', 'padrinho']
  );
});

test('2. Neon Auth (Managed Better Auth): signs up user, mints JWT and verifies against NEON_AUTH_JWKS_URL', async () => {
  const res = await fetch(`${baseUrl}/api/neon/auth`, { method: 'POST' });
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Olá Confiare' }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  console.log('[E2E AI Gateway]', JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.ok(body.catalogModelsCount > 0);
});

test('5. Neon Functions: resolves functionBaseUrl("hello") and invokes deployed function', async () => {
  const res = await fetch(`${baseUrl}/api/neon/functions`);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId: 'prov-joao' }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  console.log('[E2E Neon Realtime]', JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.equal(body.liveSubscriptionStatus, 'live');
  assert.ok(body.committedWriteTxId);
});
