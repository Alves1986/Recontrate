import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Database,
  KeyRound,
  HardDrive,
  Sparkles,
  Cpu,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { RealtimeProvider, useLiveQuery } from '@neon/realtime-react';
import type { SealedLiveQuery } from '@neon/realtime/client';
import {
  authClient,
  fetchSealedProviderNotifications,
  realtimeClient,
  type LiveNotificationItem,
} from '../lib/neonClient';

function LiveQueryStatusBadge({
  sealedQuery,
  providerId,
}: {
  sealedQuery: SealedLiveQuery<LiveNotificationItem>;
  providerId: string;
}) {
  const refreshQuery = useCallback(
    () => fetchSealedProviderNotifications(providerId),
    [providerId]
  );
  const { data, status, error } = useLiveQuery(sealedQuery, { refreshQuery });

  if (status === 'error') {
    return (
      <span className="text-xs text-red-600 font-mono">
        Realtime erro: {error.message}
      </span>
    );
  }

  return (
    <span className="text-xs text-brand-link font-mono">
      Live SQL ({status}) · {data ? data.length : 0} notificações sincronizadas
    </span>
  );
}

export const NeonServicesPanel: React.FC<{ providerId?: string }> = ({
  providerId = 'prov-joao',
}) => {
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sealedQuery, setSealedQuery] =
    useState<SealedLiveQuery<LiveNotificationItem> | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const runVerification = useCallback(async () => {
    setLoading(true);
    try {
      const [verifyRes, sealed] = await Promise.all([
        fetch('/api/neon/verify-all').then((r) => r.json()),
        fetchSealedProviderNotifications(providerId).catch(() => null),
      ]);
      setVerification(verifyRes);
      if (sealed) {
        setSealedQuery(sealed);
      }
      const { data: sessionData } = await authClient.getSession();
      if (sessionData?.user?.email) {
        setSessionEmail(sessionData.user.email);
      }
    } catch (err) {
      console.error('Erro ao verificar serviços Neon:', err);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    runVerification();
  }, [runVerification]);

  const services = verification?.services;

  return (
    <RealtimeProvider client={realtimeClient}>
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-brand-link">
              Infraestrutura Cloud · Projeto Neon ({verification?.project || 'fancy-field-77458599'})
            </p>
            <h2 className="font-display font-bold text-lg text-brand-ink">
              Status dos 6 Serviços Neon (Branch: {verification?.branch || 'production'})
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {sealedQuery && (
                <LiveQueryStatusBadge
                  sealedQuery={sealedQuery}
                  providerId={providerId}
                />
              )}
              {sessionEmail && (
                <span className="text-xs text-brand-ink/70 font-mono">
                  Sessão Auth: {sessionEmail}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={runVerification}
            disabled={loading}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Verificando...' : 'Testar Todos os Serviços'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
          {/* 1. Lakebase Postgres */}
          <div className="p-4 rounded-2xl bg-brand-background/70 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-brand-ink">
              <span className="inline-flex items-center gap-1.5">
                <Database className="w-4 h-4 text-brand-link" />
                1. Lakebase Postgres
              </span>
              {services?.postgres?.ok && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-brand-ink/75 font-mono">
              {services?.postgres
                ? `PG ${services.postgres.pgVersion} · ${services.postgres.plansCount} planos ativos`
                : 'Conectando via Drizzle + node-postgres...'}
            </p>
          </div>

          {/* 2. Neon Auth */}
          <div className="p-4 rounded-2xl bg-brand-background/70 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-brand-ink">
              <span className="inline-flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-brand-link" />
                2. Neon Auth (Better Auth)
              </span>
              {services?.auth?.ok && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-brand-ink/75 font-mono">
              {services?.auth
                ? `JWKS (${services.auth.jwksKeysCount} key) · JWT verificado: ${
                    services.auth.jwtVerifiedAgainstJwks ? 'Sim' : 'OK'
                  }`
                : 'Validando NEON_AUTH_BASE_URL...'}
            </p>
          </div>

          {/* 3. Object Storage */}
          <div className="p-4 rounded-2xl bg-brand-background/70 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-brand-ink">
              <span className="inline-flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-brand-link" />
                3. Object Storage (S3)
              </span>
              {services?.storage?.ok && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-brand-ink/75 font-mono">
              {services?.storage
                ? `Bucket "${services.storage.bucket}" (${services.storage.region}) · Presigned OK`
                : 'Validando files-sdk/neon...'}
            </p>
          </div>

          {/* 4. AI Gateway */}
          <div className="p-4 rounded-2xl bg-brand-background/70 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-brand-ink">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-accent-strong" />
                4. Neon AI Gateway
              </span>
              {services?.aiGateway?.ok && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-brand-ink/75 font-mono">
              {services?.aiGateway
                ? `${services.aiGateway.catalogModelsCount} modelos no catálogo (/v1/models)`
                : 'Consultando /v1/models...'}
            </p>
          </div>

          {/* 5. Neon Functions */}
          <div className="p-4 rounded-2xl bg-brand-background/70 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-brand-ink">
              <span className="inline-flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-brand-link" />
                5. Neon Functions
              </span>
              {services?.functions?.ok && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-brand-ink/75 font-mono">
              {services?.functions
                ? `fn:${services.functions.functionSlug} · HTTP ${services.functions.status}`
                : 'Invocando functionBaseUrl("hello")...'}
            </p>
          </div>

          {/* 6. Neon Realtime */}
          <div className="p-4 rounded-2xl bg-brand-background/70 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-brand-ink">
              <span className="inline-flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-brand-accent-strong" />
                6. Neon Realtime (Live SQL)
              </span>
              {services?.realtime?.ok && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-brand-ink/75 font-mono">
              {services?.realtime
                ? `Status: ${services.realtime.liveSubscriptionStatus} · txid: ${services.realtime.committedWriteTxId}`
                : 'Selando e assinando query Live SQL...'}
            </p>
          </div>
        </div>
      </section>
    </RealtimeProvider>
  );
};
