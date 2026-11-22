import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  Link2,
  MessageSquare,
  MousePointerClick,
  Send,
  ShieldAlert,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { INITIAL_TAXONOMY_CATEGORIES } from '../data/taxonomySeed';

interface ReferralMetricsSummary {
  totalInvites: number;
  pendingInvites: number;
  registeredWaitingOnboarding: number;
  validatedReferrals: number;
  blockedReferrals: number;
  clicksCount: number;
  totalFreeDaysEarned: number;
  appliedFreeDays: number;
  availableFreeDays: number;
  pendingFreeDays: number;
  conversionRatePercent: number;
  rewardDaysPerProvider: number;
  referredWelcomeBonusDays?: number;
  receivedWelcomeBonusDays?: number;
  receivedWelcomeBonusAppliedDays?: number;
  receivedWelcomeBonusAvailableDays?: number;
}

interface ReceivedWelcomeBonus {
  id: string;
  code: string;
  status: 'convite_enviado' | 'cadastrado' | 'validado' | 'bloqueado';
  rewardDays: number;
  rewardStatus:
    | 'pendente'
    | 'disponivel'
    | 'aplicado_na_assinatura'
    | 'cancelado';
  appliedAt: string | null;
}

interface ReferralItem {
  id: string;
  referredName: string;
  referredEmail: string;
  referredPhone: string;
  referredCategory: string | null;
  status: 'convite_enviado' | 'cadastrado' | 'validado' | 'bloqueado';
  rewardDays: number;
  rewardStatus:
    | 'pendente'
    | 'disponivel'
    | 'aplicado_na_assinatura'
    | 'cancelado';
  appliedAt: string | null;
  createdAt: string;
  validatedAt: string | null;
}

function buildClientReferralShareUrl(code: string): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://recontrate.com.br';
  return `${origin}/criar-conta?role=prestador&ref=${encodeURIComponent(code)}`;
}

function buildClientWhatsAppInviteUrl(params: {
  phone?: string;
  referredName?: string;
  referrerName?: string;
  shareUrl: string;
  code: string;
}): string {
  const greeting = params.referredName
    ? `Olá ${params.referredName.trim()}!`
    : 'Olá!';
  const sender = params.referrerName ? ` Aqui é ${params.referrerName.trim()}.` : '';
  const text = `${greeting}${sender} Estou usando o Recontrate para receber solicitações de serviços locais sem pagar comissão à plataforma (todo valor é negociado diretamente com o cliente, fora da plataforma). Cadastre seu perfil de profissional pelo meu link para ganhar +10 dias grátis extras por indicação além dos 90 dias grátis de boas-vindas (código ${params.code}): ${params.shareUrl}`;

  const digits = (params.phone || '').replace(/\D/g, '');
  const intl =
    digits.length >= 10 && digits.length <= 11 && !digits.startsWith('55')
      ? `55${digits}`
      : digits;

  if (intl.length >= 12) {
    return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

const STATUS_BADGE: Record<
  ReferralItem['status'],
  { label: string; classes: string }
> = {
  validado: {
    label: 'Validado (+15 dias)',
    classes: 'bg-emerald-100 text-emerald-800',
  },
  cadastrado: {
    label: 'Cadastrado (aguardando onboarding)',
    classes: 'bg-amber-100 text-amber-900',
  },
  convite_enviado: {
    label: 'Convite enviado',
    classes: 'bg-brand-background text-brand-ink',
  },
  bloqueado: {
    label: 'Bloqueado (antifraude)',
    classes: 'bg-red-100 text-red-800',
  },
};

export const ReferralDashboardPanel: React.FC<{
  authToken?: string;
  userFullName?: string;
  onDaysApplied?: () => void;
  onNavigateUrl?: (path: string) => void;
}> = ({ authToken, userFullName, onDaysApplied, onNavigateUrl }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [metrics, setMetrics] = useState<ReferralMetricsSummary>({
    totalInvites: 0,
    pendingInvites: 0,
    registeredWaitingOnboarding: 0,
    validatedReferrals: 0,
    blockedReferrals: 0,
    clicksCount: 0,
    totalFreeDaysEarned: 0,
    appliedFreeDays: 0,
    availableFreeDays: 0,
    pendingFreeDays: 0,
    conversionRatePercent: 0,
    rewardDaysPerProvider: 15,
    referredWelcomeBonusDays: 10,
    receivedWelcomeBonusDays: 0,
    receivedWelcomeBonusAppliedDays: 0,
    receivedWelcomeBonusAvailableDays: 0,
  });
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [receivedWelcomeBonus, setReceivedWelcomeBonus] =
    useState<ReceivedWelcomeBonus | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<{
    id: string;
    planName: string;
    fim: string;
  } | null>(null);

  const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Formulário de convite direto
  const [referredName, setReferredName] = useState('');
  const [referredPhone, setReferredPhone] = useState('');
  const [referredEmail, setReferredEmail] = useState('');
  const [referredCategory, setReferredCategory] = useState(
    INITIAL_TAXONOMY_CATEGORIES[0]?.nome || 'Elétrica'
  );
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    whatsappUrl?: string;
  } | null>(null);
  const [applyingDays, setApplyingDays] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/app/referrals/dashboard', {
        credentials: 'include',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(
          body.error ||
            'Não foi possível carregar seu painel de indicações no momento.'
        );
      }
      setCode(body.referralCode?.code || '');
      if (body.metrics) setMetrics(body.metrics);
      setReferrals(Array.isArray(body.referrals) ? body.referrals : []);
      setReceivedWelcomeBonus(body.receivedWelcomeBonus || null);
      setActiveSubscription(body.activeSubscription || null);
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar indicações.');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const shareUrl = useMemo(
    () => (code ? buildClientReferralShareUrl(code) : ''),
    [code]
  );

  const generalWhatsAppUrl = useMemo(
    () =>
      code
        ? buildClientWhatsAppInviteUrl({
            referrerName: userFullName,
            shareUrl,
            code,
          })
        : '#',
    [code, shareUrl, userFullName]
  );

  const handleCopy = async (kind: 'link' | 'code', value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedType(kind);
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteFeedback(null);
    setInviteSubmitting(true);
    try {
      const res = await fetch('/api/app/referrals/invite', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          referredName,
          referredPhone,
          referredEmail: referredEmail.trim() || undefined,
          referredCategory,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error || 'Não foi possível registrar o convite.');
      }

      const inviteUrl = buildClientReferralShareUrl(body.code || code);
      const waUrl = buildClientWhatsAppInviteUrl({
        phone: referredPhone,
        referredName,
        referrerName: userFullName,
        shareUrl: inviteUrl,
        code: body.code || code,
      });

      setInviteFeedback({
        type: 'success',
        message: `Convite registrado para ${referredName}! Envie o link abaixo para o profissional concluir o cadastro — você ganha +15 dias grátis e ele ganha +10 dias grátis extras.`,
        whatsappUrl: waUrl,
      });
      setReferredName('');
      setReferredPhone('');
      setReferredEmail('');
      await loadDashboard();
    } catch (err) {
      setInviteFeedback({
        type: 'error',
        message:
          (err as Error).message || 'Erro ao registrar convite direto.',
      });
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleApplyAvailableDays = async () => {
    setApplyingDays(true);
    setInviteFeedback(null);
    try {
      const res = await fetch('/api/app/referrals/apply-days', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error || 'Não foi possível aplicar os dias agora.');
      }
      if (body.applied) {
        setInviteFeedback({
          type: 'success',
          message: `+${body.appliedDays} dias grátis aplicados à sua assinatura! Nova validade até ${new Date(
            body.newEndDate
          ).toLocaleDateString('pt-BR')}.`,
        });
        onDaysApplied?.();
      } else {
        setInviteFeedback({
          type: 'error',
          message:
            body.reason ||
            'Ative um plano pago ou os 90 dias grátis para aplicar seu saldo de dias.',
        });
      }
      await loadDashboard();
    } catch (err) {
      setInviteFeedback({
        type: 'error',
        message: (err as Error).message || 'Falha ao aplicar saldo.',
      });
    } finally {
      setApplyingDays(false);
    }
  };

  const filteredReferrals = useMemo(() => {
    if (statusFilter === 'todos') return referrals;
    return referrals.filter((r) => r.status === statusFilter);
  }, [referrals, statusFilter]);

  const funnelMax = Math.max(
    1,
    metrics.clicksCount,
    metrics.totalInvites,
    metrics.validatedReferrals
  );

  return (
    <div className="space-y-6">
      {/* Banner Principal + Link Exclusivo */}
      <section className="bg-brand-primary text-white rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-brand-accent-contrast">
              <Gift className="w-4 h-4" />
              <span>
                Programa Indique e Ganhe · +15 dias para você e +10 dias para o indicado
              </span>
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">
              Indique profissionais prestadores de serviço e ganhe +15 dias grátis
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              A cada profissional prestador de serviço que se cadastrar pelo seu link e concluir o onboarding oficial, você ganha{' '}
              <strong>+15 dias grátis extras</strong> na sua assinatura (cumulativos e sem limite) e quem se cadastra também recebe{' '}
              <strong>+10 dias grátis extras</strong> além da oferta de lançamento.
            </p>
          </div>
          {activeSubscription ? (
            <div className="bg-white/10 rounded-2xl p-4 text-xs shrink-0 space-y-1 border border-white/15">
              <p className="text-white/70">Assinatura vinculada para crédito</p>
              <p className="font-display font-bold text-sm text-brand-accent-contrast">
                {activeSubscription.planName}
              </p>
              <p className="font-mono text-[11px] text-white/85">
                Vigente até{' '}
                {new Date(activeSubscription.fim).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ) : (
            onNavigateUrl && (
              <button
                type="button"
                onClick={() => onNavigateUrl('/planos')}
                className="px-4 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white text-xs font-semibold shrink-0 cursor-pointer"
              >
                Escolher plano (90 dias grátis) →
              </button>
            )
          )}
        </div>

        {/* Código e Link de Indicação */}
        <div className="bg-white/10 border border-white/15 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] text-white/75 font-semibold uppercase tracking-wide">
                Seu código e link exclusivo de indicação
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-white text-brand-primary font-mono font-bold text-sm">
                  {code || (loading ? 'Gerando...' : 'Indisponível')}
                </span>
                <span className="text-xs font-mono text-white/90 truncate max-w-full">
                  {shareUrl}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
              <button
                type="button"
                disabled={!code}
                onClick={() => handleCopy('link', shareUrl)}
                className="px-3.5 py-2.5 rounded-xl bg-white text-brand-ink hover:bg-white/90 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{copiedType === 'link' ? 'Link copiado!' : 'Copiar link'}</span>
              </button>
              <button
                type="button"
                disabled={!code}
                onClick={() => handleCopy('code', code)}
                className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedType === 'code' ? 'Código copiado!' : 'Copiar código'}</span>
              </button>
              <a
                href={generalWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Compartilhar no WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
        >
          {error}
        </div>
      )}

      {receivedWelcomeBonus && (
        <section
          aria-label="Seu Bônus de Boas-Vindas por Indicação"
          className="p-4 sm:p-5 rounded-3xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="space-y-1">
            <p className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-emerald-700" />
              Bônus de cadastro por indicação (+{receivedWelcomeBonus.rewardDays} dias grátis · código {receivedWelcomeBonus.code})
            </p>
            <p className="text-emerald-800/90">
              {receivedWelcomeBonus.rewardStatus === 'aplicado_na_assinatura'
                ? `Seus +${receivedWelcomeBonus.rewardDays} dias grátis já foram aplicados automaticamente na sua assinatura.`
                : receivedWelcomeBonus.rewardStatus === 'disponivel'
                  ? `Você já tem +${receivedWelcomeBonus.rewardDays} dias grátis disponíveis para somar à sua assinatura.`
                  : 'Conclua seu onboarding de prestador para liberar automaticamente seus +10 dias grátis extras.'}
            </p>
          </div>
          {receivedWelcomeBonus.rewardStatus === 'disponivel' && (
            <button
              type="button"
              disabled={applyingDays}
              onClick={handleApplyAvailableDays}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0 cursor-pointer disabled:opacity-50"
            >
              {applyingDays
                ? 'Aplicando...'
                : `Aplicar +${receivedWelcomeBonus.rewardDays} dias na assinatura`}
            </button>
          )}
        </section>
      )}

      {/* KPIs de Métricas de Indicação */}
      <section aria-label="Métricas de Indicação" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-brand-primary/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-brand-ink/70">
            <span>Dias Grátis Ganhos</span>
            <Gift className="w-4 h-4 text-brand-accent-strong" />
          </div>
          <p className="font-mono font-bold text-2xl text-brand-primary">
            +{metrics.totalFreeDaysEarned} dias
          </p>
          <p className="text-[11px] text-brand-ink/70">
            {(metrics.receivedWelcomeBonusDays ?? 0) > 0
              ? `${metrics.validatedReferrals} indicação(ões) × 15d + ${metrics.receivedWelcomeBonusDays}d de boas-vindas`
              : `${metrics.validatedReferrals} profissional(is) validado(s) × 15 dias`}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-brand-primary/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-brand-ink/70">
            <span>Aplicados / Saldo</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-mono font-bold text-2xl text-emerald-700">
            {metrics.appliedFreeDays}d aplicados
          </p>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-brand-ink/75">
              Saldo disponível: <strong>{metrics.availableFreeDays}d</strong>
            </span>
            {metrics.availableFreeDays > 0 && (
              <button
                type="button"
                disabled={applyingDays}
                onClick={handleApplyAvailableDays}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                {applyingDays ? 'Aplicando...' : 'Aplicar agora'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-brand-primary/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-brand-ink/70">
            <span>Aguardando Validação</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-mono font-bold text-2xl text-amber-700">
            {metrics.registeredWaitingOnboarding} cadastro(s)
          </p>
          <p className="text-[11px] text-brand-ink/70">
            +{metrics.pendingFreeDays} dias pendentes após onboarding ·{' '}
            {metrics.pendingInvites} convite(s) aberto(s)
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-brand-primary/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-brand-ink/70">
            <span>Cliques & Conversão</span>
            <TrendingUp className="w-4 h-4 text-brand-link" />
          </div>
          <p className="font-mono font-bold text-2xl text-brand-ink">
            {metrics.conversionRatePercent}%
          </p>
          <p className="text-[11px] text-brand-ink/70">
            <MousePointerClick className="w-3 h-3 inline mr-1" />
            {metrics.clicksCount} cliques · {metrics.totalInvites} indicações registradas
          </p>
        </div>
      </section>

      {/* Funil de Conversão + Formulário de Convite Direto */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Funil Visual de Indicação */}
        <section className="lg:col-span-5 bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4 text-xs">
          <div>
            <p className="font-semibold text-brand-link">Métricas do Funil</p>
            <h3 className="font-display font-bold text-lg text-brand-ink">
              Acompanhamento de conversão
            </h3>
          </div>

          <div className="space-y-3.5">
            {(
              [
                {
                  label: '1. Cliques no seu link de indicação',
                  value: metrics.clicksCount,
                  color: 'bg-brand-primary/70',
                },
                {
                  label: '2. Convites / Cadastros iniciados',
                  value: metrics.totalInvites,
                  color: 'bg-brand-link',
                },
                {
                  label: '3. Profissionais validados (+15 dias cada)',
                  value: metrics.validatedReferrals,
                  color: 'bg-emerald-600',
                },
                {
                  label: '4. Dias aplicados na assinatura',
                  value: metrics.appliedFreeDays,
                  unit: 'dias',
                  max: Math.max(15, metrics.totalFreeDaysEarned || 15),
                  color: 'bg-brand-accent-strong',
                },
              ] as Array<{
                label: string;
                value: number;
                unit?: string;
                max?: number;
                color: string;
              }>
            ).map((step) => {
              const denom = step.max || funnelMax;
              const pct = Math.min(100, Math.round((step.value / denom) * 100));
              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex items-center justify-between font-medium text-brand-ink">
                    <span>{step.label}</span>
                    <span className="font-mono font-bold">
                      {step.value}
                      {step.unit ? ` ${step.unit}` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-brand-background overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${step.color}`}
                      style={{ width: `${step.value > 0 ? Math.max(6, pct) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {metrics.blockedReferrals > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                {metrics.blockedReferrals} tentativa(s) bloqueada(s) pela proteção contra autoindicação.
              </span>
            </div>
          )}
        </section>

        {/* Formulário de Convite Direto */}
        <section className="lg:col-span-7 bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4 text-xs">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-brand-accent-strong" />
            <div>
              <h3 className="font-display font-bold text-lg text-brand-ink">
                Convidar um profissional agora
              </h3>
              <p className="text-brand-ink/70">
                Registre o contato do colega para vincular a indicação ao telefone/e-mail e gerar o convite pronto no WhatsApp.
              </p>
            </div>
          </div>

          {inviteFeedback && (
            <div
              role="status"
              className={`p-3.5 rounded-2xl space-y-2 ${
                inviteFeedback.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-950'
              }`}
            >
              <p className="font-medium">{inviteFeedback.message}</p>
              {inviteFeedback.whatsappUrl && (
                <a
                  href={inviteFeedback.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Enviar convite pelo WhatsApp →</span>
                </a>
              )}
            </div>
          )}

          <form onSubmit={handleCreateInvite} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  Nome do profissional *
                </label>
                <input
                  type="text"
                  required
                  value={referredName}
                  onChange={(e) => setReferredName(e.target.value)}
                  placeholder="Ex: Marcos Oliveira"
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-primary/15"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  WhatsApp / Telefone *
                </label>
                <input
                  type="text"
                  required
                  value={referredPhone}
                  onChange={(e) => setReferredPhone(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-primary/15"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  Especialidade principal
                </label>
                <select
                  value={referredCategory}
                  onChange={(e) => setReferredCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-primary/15 bg-white"
                >
                  {INITIAL_TAXONOMY_CATEGORIES.map((cat) => (
                    <option key={cat.slug} value={cat.nome}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={referredEmail}
                  onChange={(e) => setReferredEmail(e.target.value)}
                  placeholder="profissional@email.com.br"
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-primary/15"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={inviteSubmitting}
              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>
                {inviteSubmitting
                  ? 'Registrando convite...'
                  : 'Registrar Indicação e Gerar Convite (+15 dias)'}
              </span>
            </button>
          </form>
        </section>
      </div>

      {/* Histórico de Indicações */}
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-link" />
            <div>
              <h3 className="font-display font-bold text-lg text-brand-ink">
                Histórico de profissionais indicados ({referrals.length})
              </h3>
              <p className="text-brand-ink/70">
                Acompanhe o status de cada profissional convidado e os créditos de +15 dias grátis.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['todos', 'Todos'],
                ['validado', 'Validados'],
                ['cadastrado', 'Cadastrados'],
                ['convite_enviado', 'Convidados'],
                ['bloqueado', 'Bloqueados'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
                  statusFilter === key
                    ? 'bg-brand-primary text-white'
                    : 'bg-brand-background text-brand-ink/80 hover:text-brand-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredReferrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-primary/10 text-brand-ink/70">
                  <th className="py-2.5 pr-4">Profissional</th>
                  <th className="py-2.5 pr-4">Categoria</th>
                  <th className="py-2.5 pr-4">Data</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4">Benefício</th>
                  <th className="py-2.5 pr-4">Situação do Crédito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-primary/10">
                {filteredReferrals.map((ref) => {
                  const badge = STATUS_BADGE[ref.status] || {
                    label: ref.status,
                    classes: 'bg-brand-background text-brand-ink',
                  };
                  return (
                    <tr key={ref.id}>
                      <td className="py-3 pr-4 font-semibold text-brand-ink">
                        <div>{ref.referredName || 'Profissional convidado'}</div>
                        <div className="text-[11px] font-normal text-brand-ink/60">
                          {ref.referredPhone || ref.referredEmail || 'Via link de indicação'}
                        </div>
                      </td>
                      <td className="py-3 pr-4">{ref.referredCategory || '—'}</td>
                      <td className="py-3 pr-4 font-mono">
                        {new Date(ref.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono font-bold text-brand-primary">
                        +{ref.rewardDays} dias grátis
                      </td>
                      <td className="py-3 pr-4">
                        {ref.rewardStatus === 'aplicado_na_assinatura' ? (
                          <span className="text-emerald-700 font-semibold">
                            Aplicado na assinatura
                            {ref.appliedAt
                              ? ` (${new Date(ref.appliedAt).toLocaleDateString('pt-BR')})`
                              : ''}
                          </span>
                        ) : ref.rewardStatus === 'disponivel' ? (
                          <span className="text-brand-link font-semibold">
                            Disponível no saldo
                          </span>
                        ) : ref.rewardStatus === 'cancelado' ? (
                          <span className="text-red-700">Cancelado</span>
                        ) : (
                          <span className="text-brand-ink/65">
                            Aguardando conclusão do cadastro
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-brand-background/50 text-center space-y-2">
            <p className="font-semibold text-brand-ink">
              Nenhuma indicação nesta categoria ainda.
            </p>
            <p className="text-brand-ink/70">
              Compartilhe seu link acima ou envie um convite direto para começar a acumular +15 dias grátis por profissional indicado!
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
