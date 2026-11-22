import { desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { Files } from 'files-sdk';
import { neon as neonStorageAdapter } from 'files-sdk/neon';
import { neon as neonAiModel } from '@neon/ai-sdk-provider';
import { generateText } from 'ai';
import { functionBaseUrl } from '@neon/env';
import { createRealtime } from '@neon/realtime/server';
import { drizzleAdapter } from '@neon/realtime-drizzle';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  db,
  ensureSchemaAndSeed,
  getDatabaseNameFromUrl,
  neonEnv,
  pool,
} from '../db/index';
import {
  plans,
  providerProfiles,
  realtimeNotifications,
  storageAssets,
} from '../db/schema';

// 1. Object Storage client via files-sdk/neon (reads AWS_* env vars automatically)
export const assetsFiles = new Files({
  adapter: neonStorageAdapter({ bucket: 'assets' }),
});

// 2. Neon Realtime server instance (seals queries & can subscribe in trusted backend code)
const dbName = getDatabaseNameFromUrl(neonEnv.postgres.databaseUrl);

export const realtimeServer = createRealtime({
  url: neonEnv.realtime.url,
  secret: neonEnv.realtime.secret,
  db: dbName,
  adapter: drizzleAdapter(),
});

export function providerNotificationsLiveQuery(providerId: string) {
  return db
    .select(getTableColumns(realtimeNotifications))
    .from(realtimeNotifications)
    .where(eq(realtimeNotifications.provider_id, providerId))
    .orderBy(desc(realtimeNotifications.created_at))
    .limit(20);
}

// 3. Neon Auth JWKS verifier
const authOrigin = new URL(neonEnv.auth.baseUrl).origin;
const jwks = createRemoteJWKSet(new URL(neonEnv.auth.jwksUrl));

export async function verifyNeonAuthJwt(token: string) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: authOrigin,
  });
  return payload;
}

// 4. Service operations
export async function testPostgresService() {
  await ensureSchemaAndSeed();
  const planRows = await db
    .select()
    .from(plans)
    .where(eq(plans.ativo, true))
    .orderBy(plans.ordemExibicao);
  const providerRows = await db.select().from(providerProfiles);
  const { rows } = await pool.query<{ db: string; version: string }>(
    "SELECT current_database() AS db, current_setting('server_version') AS version"
  );

  return {
    ok: planRows.length >= 4,
    database: rows[0]?.db || dbName,
    pgVersion: rows[0]?.version || '18',
    plansCount: planRows.length,
    plans: planRows.map((p) => ({
      slug: p.slug,
      nome: p.nome,
      precoMensalCentavos: p.precoMensalCentavos,
      limiteOportunidadesMensal: p.limiteOportunidadesMensal,
    })),
    providersCount: providerRows.length,
  };
}

export async function testAuthService() {
  const baseUrl = neonEnv.auth.baseUrl.replace(/\/$/, '');
  const jwksUrl = neonEnv.auth.jwksUrl;

  // 1. Fetch live JWKS from NEON_AUTH_JWKS_URL
  const jwksRes = await fetch(jwksUrl);
  if (!jwksRes.ok) {
    throw new Error(`Failed to fetch JWKS (${jwksRes.status})`);
  }
  const jwksData = (await jwksRes.json()) as { keys?: Array<{ kid?: string; kty?: string }> };

  // 2. Exercise Managed Better Auth sign-up / sign-in flow and token verification
  const testEmail = `prestador.confiare.${Date.now()}@example.com`;
  const testPassword = 'Confiare#2026!SecurePassword';
  const signUpRes = await fetch(`${baseUrl}/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000',
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: 'Prestador Teste Confiare',
    }),
  });

  const signUpBody = signUpRes.ok ? ((await signUpRes.json()) as any) : null;
  const setCookie = signUpRes.headers.get('set-cookie');

  let jwtVerified = false;
  let subject: string | undefined;

  if (setCookie) {
    const cookieHeader = setCookie
      .split(/,(?=\s*[a-zA-Z0-9_-]+=)/)
      .map((c) => c.split(';')[0].trim())
      .join('; ');

    const tokenRes = await fetch(`${baseUrl}/token`, {
      headers: {
        Cookie: cookieHeader,
        Origin: 'http://localhost:3000',
      },
    });
    if (tokenRes.ok) {
      const tokenJson = (await tokenRes.json()) as { token?: string };
      if (tokenJson.token) {
        const verified = await verifyNeonAuthJwt(tokenJson.token);
        jwtVerified = Boolean(verified.sub);
        subject = verified.sub;
      }
    }
  }

  return {
    ok: jwksRes.ok && signUpRes.ok,
    authBaseUrl: baseUrl,
    jwksKeysCount: jwksData.keys?.length ?? 0,
    signUpStatus: signUpRes.status,
    userId: signUpBody?.user?.id || subject || null,
    userEmail: signUpBody?.user?.email || testEmail,
    jwtVerifiedAgainstJwks: jwtVerified,
  };
}

export async function testObjectStorageService(customContent?: string) {
  await ensureSchemaAndSeed();
  const objectKey = `portfolio/prov-joao/laudo-${Date.now()}.json`;
  const payload = JSON.stringify({
    providerId: 'prov-joao',
    title: customContent || 'Laudo Técnico NBR 5410 — Confiare',
    branch: neonEnv.branch?.name || 'production',
    createdAt: new Date().toISOString(),
  });
  const bytes = Buffer.from(payload, 'utf-8');

  // Upload to Neon Object Storage bucket "assets" via files-sdk/neon
  await assetsFiles.upload(objectKey, bytes, {
    contentType: 'application/json',
  });

  // Pair object key with Postgres row on the same branch
  const assetId = `asset-${Date.now()}`;
  await db.insert(storageAssets).values({
    id: assetId,
    providerProfileId: 'prov-joao',
    bucket: 'assets',
    objectKey,
    contentType: 'application/json',
    label: 'Laudo Técnico NBR 5410',
    sizeBytes: bytes.byteLength,
  });

  // Download back & generate presigned URL
  const downloaded = await assetsFiles.download(objectKey);
  const downloadedText = await downloaded.text();
  const presignedUrl = await assetsFiles.url(objectKey, { expiresIn: 3600 });

  return {
    ok: downloadedText === payload && presignedUrl.startsWith('https://'),
    bucket: 'assets',
    endpoint: neonEnv.storage.endpoint,
    region: neonEnv.storage.region,
    objectKey,
    sizeBytes: bytes.byteLength,
    presignedUrlSample: `${presignedUrl.slice(0, 72)}...`,
    roundtripVerified: downloadedText === payload,
  };
}

export async function testAiGatewayService(promptText?: string) {
  const baseUrl = neonEnv.aiGateway.baseUrl.replace(/\/$/, '');
  const token = neonEnv.aiGateway.apiKey;

  const modelsRes = await fetch(`${baseUrl}/v1/models`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!modelsRes.ok) {
    throw new Error(`AI Gateway /v1/models failed with ${modelsRes.status}`);
  }

  const catalog = (await modelsRes.json()) as {
    object: string;
    data: Array<{
      id: string;
      name?: string;
      owned_by?: string;
      enabled?: boolean;
      unavailable_reason?: string;
      recovery_url?: string;
    }>;
  };

  const allModels = catalog.data || [];
  const enabledModels = allModels.filter((m) => m.enabled);

  let completionText: string | null = null;
  let completionStatus = 'catalog_verified_awaiting_prepaid_credits';

  if (enabledModels.length > 0) {
    const modelId = enabledModels[0].id;
    const { text } = await generateText({
      model: neonAiModel(modelId),
      prompt:
        promptText ||
        'Gere uma frase curta de orçamento profissional para um eletricista na Confiare.',
    });
    completionText = text;
    completionStatus = 'inference_succeeded';
  }

  return {
    ok: modelsRes.status === 200 && Array.isArray(allModels) && allModels.length > 0,
    gatewayBaseUrl: baseUrl,
    catalogModelsCount: allModels.length,
    enabledModelsCount: enabledModels.length,
    sampleModels: allModels.slice(0, 5).map((m) => ({
      id: m.id,
      provider: m.owned_by,
      enabled: Boolean(m.enabled),
      unavailableReason: m.unavailable_reason || null,
    })),
    completionStatus,
    completionText,
  };
}

export async function testFunctionsService() {
  const url = functionBaseUrl('hello');
  const res = await fetch(url);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await res.json()
    : await res.text();

  return {
    ok: res.ok,
    functionSlug: 'hello',
    invocationUrl: url,
    status: res.status,
    response: body,
  };
}

export async function sealProviderNotificationsQuery(providerId = 'prov-joao') {
  await ensureSchemaAndSeed();
  const query = providerNotificationsLiveQuery(providerId);
  return realtimeServer.seal({ query });
}

export async function testRealtimeService(providerId = 'prov-joao') {
  await ensureSchemaAndSeed();
  const query = providerNotificationsLiveQuery(providerId);
  const sealed = await realtimeServer.seal({ query });

  // Also subscribe via Neon Realtime Live SQL WebSocket and push a live row with txid
  const subscription = await realtimeServer.subscribe(query);

  try {
    const liveDataPromise = new Promise<{
      status: string;
      rowsCount: number;
    }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for Neon Realtime live snapshot'));
      }, 10000);

      const remove = subscription.onChange((snapshot) => {
        if (snapshot.status === 'live' && snapshot.data !== undefined) {
          clearTimeout(timeout);
          remove();
          resolve({
            status: snapshot.status,
            rowsCount: snapshot.data.length,
          });
        } else if (snapshot.status === 'error') {
          clearTimeout(timeout);
          remove();
          reject(new Error(snapshot.error.message));
        }
      });
    });

    const initialLive = await liveDataPromise;

    // Perform an optimistic/committed write returning pg_current_xact_id()::text per neon-realtime best practices
    const newId = `notif-rt-${Date.now()}`;
    const [inserted] = await db
      .insert(realtimeNotifications)
      .values({
        id: newId,
        provider_id: providerId,
        type: 'nova_oportunidade',
        title: 'Oportunidade em Tempo Real (Neon Realtime)',
        message: 'Revisão de quadro bifásico sincronizada via Live SQL',
        client_name: 'Cliente Live SQL',
        neighborhood: 'Pinheiros',
        urgency_or_scope: 'Urgência: Hoje',
        read: false,
      })
      .returning({
        id: realtimeNotifications.id,
        txid: sql<string>`pg_current_xact_id()::text`,
      });

    return {
      ok:
        Boolean(sealed.capability) &&
        initialLive.status === 'live' &&
        Boolean(inserted?.txid),
      realtimeUrl: neonEnv.realtime.url,
      sealedQueryFingerprint: sealed.queryFingerprint,
      sealedExpiresAt: sealed.expiresAt,
      liveSubscriptionStatus: initialLive.status,
      initialRowsCount: initialLive.rowsCount,
      committedWriteTxId: inserted?.txid || null,
      insertedNotificationId: inserted?.id || newId,
    };
  } finally {
    subscription.unsubscribe();
  }
}
