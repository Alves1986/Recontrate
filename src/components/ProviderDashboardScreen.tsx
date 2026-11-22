import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  MapPin,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  PlanTier,
  ProviderOpportunity,
  ProviderProfile,
  ProviderRealtimeNotification,
  ScreenId,
} from '../types/confiare';
import { INITIAL_PROVIDER_NOTIFICATIONS } from '../data/seedData';
import {
  calculateCompositeScore,
  createRealtimeNotification,
} from '../utils/marketplaceRules';
import {
  calculateAnnualMonthlyEquivalentCentavos,
  calculateAnnualSavingsCentavos,
  formatCentavosBRL,
} from '../utils/pricingCalculations';
import {
  DEFAULT_OFFICIAL_PLANS,
  formatCpfCnpjInput,
  getPlanAudienceLabel,
  getPlanBullets,
  getSubscriptionActionType,
  normalizeDigits,
  planTierToSlug,
  slugToPlanTier,
  type BillingCycleOption,
  type CommercialPlanDisplay,
  type LaunchOfferCardState,
} from './PlansPricingPage';
import { ProviderRealtimeNotifications } from './ProviderRealtimeNotifications';
import { GoogleModeratedAdSlot } from './GoogleModeratedAdSlot';
import { ProviderSpecialtiesManager } from './ProviderSpecialtiesManager';
import { BrandLogo } from './BrandLogo';
import { ReferralDashboardPanel } from './ReferralDashboardPanel';

interface ProviderDashboardScreenProps {
  activeProvider: ProviderProfile;
  opportunities: ProviderOpportunity[];
  providerEmail?: string;
  providerPhone?: string;
  authToken?: string;
  onAddRealtimeOpportunity?: (newOpp: ProviderOpportunity) => void;
  onUpdateOpportunityStatus: (
    oppId: string,
    status: ProviderOpportunity['status']
  ) => void;
  onChangeProviderPlan: (providerId: string, newPlan: PlanTier) => void;
  onToggleProviderAvailability: (providerId: string) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}


export const ProviderDashboardScreen: React.FC<ProviderDashboardScreenProps> = ({
  activeProvider,
  opportunities,
  providerEmail,
  providerPhone,
  authToken,
  onAddRealtimeOpportunity,
  onUpdateOpportunityStatus,
  onChangeProviderPlan,
  onToggleProviderAvailability,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<
    'oportunidades' | 'reputacao' | 'plano' | 'indicacoes'
  >('oportunidades');
  const [plansList, setPlansList] = useState<CommercialPlanDisplay[]>(
    DEFAULT_OFFICIAL_PLANS
  );
  const [subSummary, setSubSummary] = useState<any>(null);
  const [launchOffer, setLaunchOffer] = useState<LaunchOfferCardState | null>(
    null
  );
  const [billingCycle, setBillingCycle] =
    useState<BillingCycleOption>('mensal');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'boleto'>(
    'pix'
  );
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [billingPhone, setBillingPhone] = useState(
    providerPhone || activeProvider.whatsapp || ''
  );
  const [applyLaunchOffer, setApplyLaunchOffer] = useState(true);
  const [planSubmittingSlug, setPlanSubmittingSlug] = useState<string | null>(
    null
  );
  const [checkoutNotice, setCheckoutNotice] = useState<{
    type: 'success' | 'error';
    message: string;
    checkoutUrl?: string;
  } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [copiedQuoteTemplate, setCopiedQuoteTemplate] = useState(false);
  const [realtimeNotifications, setRealtimeNotifications] = useState<
    ProviderRealtimeNotification[]
  >(INITIAL_PROVIDER_NOTIFICATIONS);
  const [sponsoredAd, setSponsoredAd] = useState<any | null>(null);
  const [sessionBannersShown, setSessionBannersShown] = useState(0);
  const [adClickConfirmed, setAdClickConfirmed] = useState(false);

  const loadSubscriptionData = useCallback(async () => {
    const headers: Record<string, string> = {
      'x-provider-id': activeProvider.id,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };
    const eligQuery = new URLSearchParams({
      cycle: 'mensal',
      providerProfileId: activeProvider.id,
      ...(providerEmail ? { email: providerEmail } : {}),
      ...(providerPhone || activeProvider.whatsapp
        ? { phone: providerPhone || activeProvider.whatsapp }
        : {}),
    });

    const [pRes, sRes, eRes] = await Promise.all([
      fetch('/api/plans')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(
        `/api/providers/${encodeURIComponent(activeProvider.id)}/subscription`,
        {
          credentials: 'include',
          headers,
        }
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/promotions/launch-offer/eligibility?${eligQuery.toString()}`, {
        credentials: 'include',
        headers,
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    if (pRes?.ok && Array.isArray(pRes.plans) && pRes.plans.length > 0) {
      const loadedPlans: CommercialPlanDisplay[] = pRes.plans
        .filter(
          (p: CommercialPlanDisplay) => p.ativo !== false && p.slug !== 'padrinho'
        )
        .sort(
          (a: CommercialPlanDisplay, b: CommercialPlanDisplay) =>
            a.ordemExibicao - b.ordemExibicao
        );
      if (loadedPlans.length > 0) {
        setPlansList(loadedPlans);
      }
    }

    if (sRes?.ok) {
      setSubSummary(sRes);
      if (sRes.plan?.slug) {
        const backendTier = slugToPlanTier(sRes.plan.slug);
        if (backendTier !== activeProvider.plan) {
          onChangeProviderPlan(activeProvider.id, backendTier);
        }
      }
    }

    if (eRes?.ok) {
      setLaunchOffer({
        eligible: Boolean(eRes.eligible),
        resultado: eRes.resultado,
        reason: eRes.reason,
        discountPercent: eRes.discountPercent ?? 50,
        durationCycles: eRes.durationCycles ?? 3,
        promoPricesCentavos: eRes.promoPricesCentavos || {},
        fullPricesCentavos: eRes.fullPricesCentavos || {},
        fullPriceStartDate: eRes.fullPriceStartDate,
      });
    }
  }, [
    activeProvider.id,
    activeProvider.plan,
    activeProvider.whatsapp,
    authToken,
    onChangeProviderPlan,
    providerEmail,
    providerPhone,
  ]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  useEffect(() => {
    if (activeProvider.plan !== 'Gratuito') {
      setSponsoredAd(null);
      return;
    }
    if (sessionBannersShown >= 1) {
      return;
    }

    let cancelled = false;
    fetch(
      `/api/ads/provider-panel?surface=painel_prestador&providerProfileId=${encodeURIComponent(
        activeProvider.id
      )}&sessionBannersShown=${sessionBannersShown}`
    )
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body.ok && body.ad) {
          setSponsoredAd(body.ad);
          setSessionBannersShown(1);
        }
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [activeProvider.id, activeProvider.plan, sessionBannersShown]);

  const handleTrackAdClick = async () => {
    if (!sponsoredAd) return;
    setAdClickConfirmed(true);
    try {
      const res = await fetch(`/api/ads/${sponsoredAd.id}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerProfileId: activeProvider.id }),
      });
      const body = await res.json();
      if (body.ok && body.ad) {
        setSponsoredAd((prev: any) => (prev ? { ...prev, ...body.ad } : prev));
      }
    } catch {
      // Offline fallback
    }
  };

  const currentPlanConfig =
    plansList.find((p) => p.slug === planTierToSlug(activeProvider.plan)) ||
    plansList[0] ||
    DEFAULT_OFFICIAL_PLANS[0];

  const monthlyLimit =
    typeof subSummary?.usage?.limit === 'number'
      ? subSummary.usage.limit
      : currentPlanConfig.limiteOportunidadesMensal;
  const opportunitiesUsedInCycle =
    typeof subSummary?.usage?.used === 'number'
      ? subSummary.usage.used
      : Math.min(opportunities.length, monthlyLimit);
  const opportunitiesRemainingInCycle =
    typeof subSummary?.usage?.remaining === 'number'
      ? subSummary.usage.remaining
      : Math.max(0, monthlyLimit - opportunitiesUsedInCycle);

  const handleSelectPlanWithAsaas = async (
    planItem: CommercialPlanDisplay
  ) => {
    setCheckoutNotice(null);
    const actionType = getSubscriptionActionType({
      activeSubStatus: subSummary?.subscription?.status,
      activeSubCycle: subSummary?.subscription?.ciclo,
      currentPlan: currentPlanConfig,
      targetPlan: planItem,
      targetCycle: billingCycle,
    });

    if (actionType === 'current') return;

    const digitsDoc = normalizeDigits(cpfCnpj);
    const phoneToUse =
      billingPhone.trim() ||
      providerPhone ||
      activeProvider.whatsapp ||
      '(11) 99999-0000';
    const isFreeLaunchPromo =
      actionType === 'checkout' &&
      billingCycle === 'mensal' &&
      planItem.precoMensalCentavos > 0 &&
      applyLaunchOffer &&
      Boolean(launchOffer?.eligible) &&
      (launchOffer?.promoPricesCentavos?.[planItem.slug] ?? 0) === 0;

    if (
      actionType === 'checkout' &&
      planItem.precoMensalCentavos > 0 &&
      !isFreeLaunchPromo &&
      digitsDoc.length !== 11 &&
      digitsDoc.length !== 14
    ) {
      setCheckoutNotice({
        type: 'error',
        message:
          'Preencha seu CPF (11 dígitos) ou CNPJ (14 dígitos) acima antes de gerar a cobrança no Asaas.',
      });
      return;
    }

    setPlanSubmittingSlug(planItem.slug);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };

      if (actionType === 'upgrade' && subSummary?.subscription?.id) {
        const res = await fetch(
          `/api/subscriptions/${encodeURIComponent(
            subSummary.subscription.id
          )}/upgrade`,
          {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
              targetPlanSlug: planItem.slug,
              targetCycle: billingCycle,
              paymentMethod,
            }),
          }
        );
        const body = await res.json();
        if (!res.ok || !body.ok) {
          throw new Error(body.error || 'Erro ao realizar upgrade.');
        }
        onChangeProviderPlan(activeProvider.id, slugToPlanTier(planItem.slug));
        await loadSubscriptionData();
        setCheckoutNotice({
          type: 'success',
          message: `Upgrade imediato para ${planItem.nome} concluído!${
            body.proRataCents > 0
              ? ` Fatura pro-rata de ${formatCentavosBRL(body.proRataCents)} gerada.`
              : ''
          }`,
          checkoutUrl: body.proRataInvoice?.urlCheckout,
        });
        return;
      }

      if (actionType === 'downgrade' && subSummary?.subscription?.id) {
        const res = await fetch(
          `/api/subscriptions/${encodeURIComponent(
            subSummary.subscription.id
          )}/downgrade`,
          {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
              targetPlanSlug: planItem.slug,
            }),
          }
        );
        const body = await res.json();
        if (!res.ok || !body.ok) {
          throw new Error(body.error || 'Erro ao agendar mudança de plano.');
        }
        await loadSubscriptionData();
        const effDate = body.effectiveDate
          ? new Date(body.effectiveDate).toLocaleDateString('pt-BR')
          : 'próximo ciclo';
        setCheckoutNotice({
          type: 'success',
          message: `Mudança para ${planItem.nome} agendada para ${effDate}. Seu plano atual segue ativo até o fim do período pago.`,
        });
        return;
      }

      const usePromo =
        billingCycle === 'mensal' &&
        planItem.precoMensalCentavos > 0 &&
        applyLaunchOffer &&
        Boolean(launchOffer?.eligible);

      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          providerProfileId: activeProvider.id,
          providerName: activeProvider.name,
          providerEmail:
            providerEmail || `${activeProvider.id}@recontrate.com.br`,
          providerPhone: phoneToUse,
          cpfCnpj: digitsDoc || undefined,
          planSlug: planItem.slug,
          cycle: billingCycle,
          paymentMethod,
          applyLaunchOffer: usePromo,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error || 'Erro ao criar assinatura.');
      }
      onChangeProviderPlan(activeProvider.id, slugToPlanTier(planItem.slug));
      await loadSubscriptionData();
      const invoiceAmount = body.invoice?.valorCentavos ?? planItem.precoMensalCentavos;
      setCheckoutNotice({
        type: 'success',
        message:
          planItem.precoMensalCentavos === 0
            ? 'Plano Gratuito ativado com sucesso.'
            : isFreeLaunchPromo && invoiceAmount === 0
              ? `Promoção de 90 dias grátis ativada no plano ${planItem.nome}! Seus benefícios já estão liberados sem custo até ${
                  body.subscription?.fim
                    ? new Date(body.subscription.fim).toLocaleDateString('pt-BR')
                    : '90 dias'
                }.`
              : `Assinatura ${planItem.nome} (${billingCycle}) registrada via Asaas! Valor da fatura: ${formatCentavosBRL(
                  invoiceAmount
                )}.`,
        checkoutUrl: body.checkoutUrl || body.invoice?.urlCheckout,
      });
    } catch (err) {
      setCheckoutNotice({
        type: 'error',
        message:
          (err as Error).message || 'Não foi possível processar a assinatura.',
      });
    } finally {
      setPlanSubmittingSlug(null);
    }
  };

  const handleConfirmCancelSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subSummary?.subscription?.id) return;
    setCancelLoading(true);
    try {
      const res = await fetch(
        `/api/subscriptions/${encodeURIComponent(
          subSummary.subscription.id
        )}/cancel`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            reason:
              cancelReason.trim() ||
              'Cancelamento solicitado pelo prestador no painel',
          }),
        }
      );
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error || 'Falha ao cancelar assinatura.');
      }
      setShowCancelModal(false);
      setCancelReason('');
      await loadSubscriptionData();
      setCheckoutNotice({
        type: 'success',
        message:
          'Assinatura cancelada sem multa. Seus benefícios seguem ativos até o fim do período já pago e seu histórico de avaliações permanece intacto.',
      });
    } catch (err) {
      setCheckoutNotice({
        type: 'error',
        message:
          (err as Error).message || 'Não foi possível cancelar agora.',
      });
      setShowCancelModal(false);
    } finally {
      setCancelLoading(false);
    }
  };


  const scoreBreakdown = calculateCompositeScore(activeProvider);
  const hasCompositeData =
    activeProvider.reviewsCount > 0 &&
    activeProvider.ratingAvg > 0 &&
    activeProvider.responseTimeMinutes > 0 &&
    activeProvider.responseRatePercent > 0 &&
    activeProvider.profileCompletenessPercent > 0;
  const pendingCount = opportunities.filter((o) => o.status === 'pendente').length;
  const acceptedCount = opportunities.filter((o) => o.status === 'aceita').length;

  const handleCopyQuoteTemplate = () => {
    setCopiedQuoteTemplate(true);
    setTimeout(() => setCopiedQuoteTemplate(false), 3000);
  };

  const handleAcceptOpportunityWithNotification = (opp: ProviderOpportunity) => {
    onUpdateOpportunityStatus(opp.id, 'aceita');
    const acceptanceNotif = createRealtimeNotification({
      id: `notif-acc-${Date.now()}`,
      type: 'aceite_orcamento',
      title: 'Interesse confirmado e contato liberado para orçamento!',
      message: `Contato de ${opp.clientNameFull} liberado para "${opp.title}".`,
      clientName: opp.clientNameFull,
      neighborhood: `${opp.neighborhood} (${opp.distanceKm} km)`,
      urgencyOrScope: `Urgência: ${opp.urgency} · ${opp.preferredTime}`,
      timestamp: 'Agora mesmo',
      opportunityId: opp.id,
      clientWhatsapp: opp.clientWhatsapp,
    });
    setRealtimeNotifications((prev) => [acceptanceNotif, ...prev]);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header do Painel */}
      <div className="bg-brand-primary text-white rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-brand-accent-contrast font-semibold">
              <BrandLogo variant="light" size="sm" decorative />
              <span aria-hidden="true">·</span>
              <span>Tela 09 · Central de Comando do Prestador</span>
              <span aria-hidden="true">·</span>
              <span>Plano Atual: {activeProvider.plan}</span>
              <span aria-hidden="true">·</span>
              <span>Sem comissão à plataforma · Negociação direta com o cliente</span>
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">

              Painel do prestador — {activeProvider.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/80">
              Gerencie oportunidades compatíveis, acompanhe sua Nota Composta e configure sua assinatura mensal previsível.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleProviderAvailability(activeProvider.id)}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors text-center cursor-pointer ${
                activeProvider.availableToday
                  ? 'bg-brand-link text-white'
                  : 'bg-white/15 text-white/85'
              }`}
            >
              {activeProvider.availableToday
                ? 'Status: Disponível para Urgências'
                : 'Status: Modo Pausa / Agenda Programada'}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('perfil-prestador', activeProvider.id)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-white text-brand-ink text-xs font-semibold hover:bg-white/90 transition-colors text-center cursor-pointer"
            >
              Ver minha vitrine pública
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Strip */}
        <div className="mt-6 pt-6 border-t border-white/15 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-mono tabular-nums">
          <div className="bg-white/10 rounded-2xl p-3.5 sm:p-4 min-w-0">
            <p className="text-xs font-sans text-white/75">Oportunidades na fila</p>
            <p className="text-base sm:text-2xl font-bold text-white mt-1">
              {pendingCount} pendentes
            </p>
            <p className="text-[11px] font-sans text-brand-accent-contrast mt-0.5">
              {acceptedCount} contato(s) liberado(s) hoje
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-3.5 sm:p-4 min-w-0">
            <p className="text-xs font-sans text-white/75">Nota Composta</p>
            <p className="text-base sm:text-2xl font-bold text-white mt-1">
              {hasCompositeData ? `★ ${scoreBreakdown.totalScore.toFixed(2)}` : 'Em formação'}
            </p>
            <p className="text-[11px] font-sans text-white/70 mt-0.5">
              {activeProvider.reviewsCount > 0
                ? `${activeProvider.reviewsCount} avaliações registradas`
                : 'Nenhuma avaliação registrada'}
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-3.5 sm:p-4 min-w-0">
            <p className="text-xs font-sans text-white/75">Tempo de Resposta</p>
            <p className="text-base sm:text-2xl font-bold text-white mt-1">
              {activeProvider.responseTimeMinutes > 0
                ? `${activeProvider.responseTimeMinutes} min`
                : 'Sem dados'}
            </p>
            <p className="text-[11px] font-sans text-white/70 mt-0.5">
              {activeProvider.responseRatePercent > 0
                ? `Taxa de resposta: ${activeProvider.responseRatePercent}%`
                : 'Taxa de resposta sem dados'}
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-3.5 sm:p-4 min-w-0">
            <p className="text-xs font-sans text-white/75">Plano e Prioridade</p>
            <p className="text-base sm:text-2xl font-bold text-brand-accent-contrast mt-1">
              {activeProvider.plan}
            </p>
            <p className="text-[11px] font-sans text-white/70 mt-0.5">
              Assinatura fixa · Sem leilão
            </p>
          </div>
        </div>
      </div>

      {/* COMPONENTE DE NOTIFICAÇÕES DE STATUS EM TEMPO REAL */}
      <ProviderRealtimeNotifications
        activeProvider={activeProvider}
        notifications={realtimeNotifications}
        onUpdateNotifications={setRealtimeNotifications}
        onAddRealtimeOpportunity={(newOpp) => {
          if (onAddRealtimeOpportunity) {
            onAddRealtimeOpportunity(newOpp);
          }
        }}
        onFocusOpportunityTab={() => setActiveTab('oportunidades')}
      />

      {/* Sub-navigation Tabs for the 3 Core Pillars of Screen 9 */}
      <div className="w-full sm:w-fit flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-brand-primary/10">
        <button
          type="button"
          onClick={() => setActiveTab('oportunidades')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors text-center cursor-pointer ${
            activeTab === 'oportunidades'
              ? 'bg-brand-primary text-white'
              : 'text-brand-ink/75 hover:text-brand-ink'
          }`}
        >
          1. Oportunidades Recebidas ({opportunities.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reputacao')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors text-center cursor-pointer ${
            activeTab === 'reputacao'
              ? 'bg-brand-primary text-white'
              : 'text-brand-ink/75 hover:text-brand-ink'
          }`}
        >
          2. Reputação Composta & Posicionamento Digital
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('plano')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors text-center cursor-pointer ${
            activeTab === 'plano'
              ? 'bg-brand-primary text-white'
              : 'text-brand-ink/75 hover:text-brand-ink'
          }`}
        >
          3. Plano & Assinatura ({activeProvider.plan})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('indicacoes')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors text-center cursor-pointer ${
            activeTab === 'indicacoes'
              ? 'bg-brand-accent-strong text-white'
              : 'text-brand-ink/75 hover:text-brand-ink'
          }`}
        >
          4. Indique e Ganhe (+15 dias)
        </button>
      </div>

      {/* TAB 1: OPORTUNIDADES */}
      {activeTab === 'oportunidades' && (
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <article
              key={opp.id}
              className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 text-brand-link font-semibold">
                  <span>Origem: {opp.origin}</span>
                  {opp.referredByProviderName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Indicado por {opp.referredByProviderName}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="text-brand-accent-strong">Urgência: {opp.urgency}</span>
                </div>

                <span className="font-mono tabular-nums text-brand-ink/65">
                  Expira em {opp.expiresInMinutes} min · {opp.photosAttached} foto(s)
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-2">
                  <h2 className="font-display font-bold text-lg text-brand-ink">
                    {opp.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-brand-ink/80 leading-relaxed">
                    {opp.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-brand-ink/70 pt-1">
                    <span>
                      <strong>Bairro:</strong> {opp.neighborhood} ({opp.distanceKm} km)
                    </span>
                    <span>·</span>
                    <span>
                      <strong>Janela:</strong> {opp.preferredTime}
                    </span>
                    <span>·</span>
                    <span>
                      <strong>Cliente:</strong>{' '}
                      {opp.status === 'aceita'
                        ? `${opp.clientNameFull} — WhatsApp: ${opp.clientWhatsapp}`
                        : opp.clientNameMasked}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-2.5 lg:border-l lg:border-brand-primary/10 lg:pl-6">
                  {opp.status === 'aceita' ? (
                    <div className="p-4 rounded-2xl bg-brand-primary text-white space-y-1.5 text-xs">
                      <p className="text-brand-accent-contrast font-semibold">
                        ✓ Interesse confirmado — Contato liberado!
                      </p>
                      <p className="font-mono font-bold text-sm">
                        WhatsApp: {opp.clientWhatsapp}
                      </p>
                      <p className="text-white/75">
                        Chame {opp.clientNameFull} e envie seu modelo de orçamento.
                      </p>
                    </div>
                  ) : opp.status === 'substituto_indicado' ? (
                    <div className="p-4 rounded-2xl bg-brand-background text-brand-ink space-y-1.5 text-xs">
                      <p className="font-semibold text-brand-link">
                        ✓ Substituto indicado com sucesso
                      </p>
                      <p className="text-brand-ink/75">
                        Você encaminhou este cliente para colegas verificados da rede.
                      </p>
                    </div>
                  ) : opp.status === 'recusada' ? (
                    <div className="p-4 rounded-2xl bg-brand-background text-brand-ink/70 text-xs">
                      Oportunidade recusada dentro do prazo sem impacto na nota.
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAcceptOpportunityWithNotification(opp)}
                        className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Aceitar interesse e liberar WhatsApp
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateOpportunityStatus(opp.id, 'substituto_indicado');
                            onNavigate('indicacao-substituto', activeProvider.id);
                          }}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Indicar substituto
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateOpportunityStatus(opp.id, 'recusada')}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Recusar pedido
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* TAB 2: REPUTAÇÃO E POSICIONAMENTO DIGITAL */}
      {activeTab === 'reputacao' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-5">
            <div>
              <p className="text-xs font-semibold text-brand-accent-strong">
                Transparência Total no Matching
              </p>
              <h2 className="font-display font-bold text-xl text-brand-ink">
                {hasCompositeData
                  ? `Seu Score Composto: ★ ${scoreBreakdown.totalScore.toFixed(2)} / 5.00`
                  : 'Histórico insuficiente para calcular a nota'}
              </h2>
              <p className="text-xs text-brand-ink/70 mt-1">
                {hasCompositeData
                  ? 'Estrelas nunca podem ser compradas. Seu posicionamento depende da qualidade percebida pelo cliente e agilidade de resposta.'
                  : 'A pontuação será exibida quando houver avaliações e dados de atendimento suficientes.'}
              </p>
            </div>

            {hasCompositeData && (
            <div className="space-y-3 text-xs font-mono tabular-nums">
              <div className="p-3.5 rounded-2xl bg-brand-background/70 flex items-center justify-between">
                <span className="font-sans font-medium text-brand-ink">
                  1. Avaliações de clientes (peso 40%)
                </span>
                <span className="font-bold text-brand-ink">
                  +{scoreBreakdown.reviewsComponent.toFixed(2)} pts
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-brand-background/70 flex items-center justify-between">
                <span className="font-sans font-medium text-brand-ink">
                  2. Tempo médio de resposta ({activeProvider.responseTimeMinutes} min · peso 20%)
                </span>
                <span className="font-bold text-brand-ink">
                  +{scoreBreakdown.responseTimeComponent.toFixed(2)} pts
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-brand-background/70 flex items-center justify-between">
                <span className="font-sans font-medium text-brand-ink">
                  3. Taxa de resposta ({activeProvider.responseRatePercent}% · peso 20%)
                </span>
                <span className="font-bold text-brand-ink">
                  +{scoreBreakdown.responseRateComponent.toFixed(2)} pts
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-brand-background/70 flex items-center justify-between">
                <span className="font-sans font-medium text-brand-ink">
                  4. Atendimentos concluídos ({activeProvider.completedJobs} · peso 10%)
                </span>
                <span className="font-bold text-brand-ink">
                  +{scoreBreakdown.completedJobsComponent.toFixed(2)} pts
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-brand-background/70 flex items-center justify-between">
                <span className="font-sans font-medium text-brand-ink">
                  5. Verificações e completude do perfil (peso 10%)
                </span>
                <span className="font-bold text-brand-link">
                  +{scoreBreakdown.verificationComponent.toFixed(2)} pts
                </span>
              </div>
            </div>
            )}
          </div>

          <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-5">
            <div>
              <p className="text-xs font-semibold text-brand-link">
                Ferramentas de Posicionamento Digital para Autônomos
              </p>
              <h2 className="font-display font-bold text-xl text-brand-ink">
                Profissionalize seu atendimento no WhatsApp
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-brand-background space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-ink">
                  Modelo de resposta rápida para orçamento
                </span>
                <button
                  type="button"
                  onClick={handleCopyQuoteTemplate}
                  className="text-xs font-semibold text-brand-link inline-flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedQuoteTemplate ? 'Copiado!' : 'Copiar modelo'}</span>
                </button>
              </div>
              <p className="text-xs text-brand-ink/80 italic leading-relaxed">
                “Olá! Sou {activeProvider.name}, profissional cadastrado no Recontrate. Vi sua solicitação no bairro e tenho disponibilidade para avaliar e enviar o escopo detalhado sem compromisso.”
              </p>
            </div>

            <div className="space-y-2.5 text-xs text-brand-ink/85">
              <p className="font-semibold text-brand-ink">
                Checklist de Visibilidade Local:
              </p>
              <div className="flex items-center justify-between py-2 border-b border-brand-primary/10">
                <span>✓ Documentos e comprovante de residência verificados</span>
                <span className="font-mono text-brand-link">100%</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-brand-primary/10">
                <span>✓ Portfólio com fotos Antes/Depois atualizadas</span>
                <span className="font-mono text-brand-link">
                  {activeProvider.portfolio.length} trabalhos
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>✓ Link público otimizado para Google e WhatsApp</span>
                <span className="font-mono text-brand-accent-strong">Ativo</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12">
            <ProviderSpecialtiesManager providerProfileId={activeProvider.id} />
          </div>
        </div>
      )}

      {/* TAB 3: PLANOS E ASSINATURA */}
      {activeTab === 'plano' && (
        <div className="space-y-6">
          {/* Card Minha Assinatura Atual */}
          <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-brand-link">
                    Minha Assinatura Atual · Asaas Recorrente
                  </span>
                  {subSummary?.subscription?.status ? (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        subSummary.subscription.status === 'ativa'
                          ? 'bg-emerald-100 text-emerald-800'
                          : subSummary.subscription.status === 'inadimplente'
                            ? 'bg-amber-100 text-amber-900'
                            : subSummary.subscription.status === 'cancelada'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-brand-background text-brand-ink'
                      }`}
                    >
                      {subSummary.subscription.status}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-background text-brand-ink">
                      Plano Gratuito Ativo
                    </span>
                  )}
                  {subSummary?.activeLaunchOffer && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
                      Promoção 90 dias grátis ativa
                      {subSummary.activeLaunchOffer.dataRetornoPrecoCheio
                        ? ` (até ${new Date(
                            subSummary.activeLaunchOffer.dataRetornoPrecoCheio
                          ).toLocaleDateString('pt-BR')})`
                        : ''}
                    </span>
                  )}
                </div>
                <h2 className="font-display font-bold text-xl text-brand-ink">
                  {currentPlanConfig.nome}
                  {subSummary?.subscription?.ciclo &&
                  currentPlanConfig.precoMensalCentavos > 0
                    ? ` · Ciclo ${
                        subSummary.subscription.ciclo === 'anual'
                          ? 'Anual'
                          : 'Mensal'
                      }`
                    : ' · Sem custo fixo'}
                </h2>
                <p className="text-xs text-brand-ink/70">
                  {subSummary?.subscription?.proximaCobranca
                    ? `Próxima renovação: ${new Date(
                        subSummary.subscription.proximaCobranca
                      ).toLocaleDateString('pt-BR')}`
                    : subSummary?.subscription?.fim &&
                        subSummary.subscription.status === 'cancelada'
                      ? `Cancelamento agendado: benefícios mantidos até ${new Date(
                          subSummary.subscription.fim
                        ).toLocaleDateString('pt-BR')}`
                      : 'Estrelas nunca podem ser compradas · Você não paga comissão à plataforma — todo valor é negociado diretamente com o cliente, fora da plataforma.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {subSummary?.portalUrl && (
                  <a
                    href={subSummary.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <span>Portal de Cobrança Asaas</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {subSummary?.subscription &&
                  ['ativa', 'trial', 'inadimplente', 'pendente'].includes(
                    subSummary.subscription.status
                  ) &&
                  currentPlanConfig.precoMensalCentavos > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="px-3.5 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancelar assinatura</span>
                    </button>
                  )}
              </div>
            </div>

            {/* Barra de uso de oportunidades no ciclo */}
            <div className="p-4 rounded-2xl bg-brand-background/70 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-brand-ink">
                <span>Consumo de oportunidades neste ciclo</span>
                <span className="font-mono">
                  {opportunitiesUsedInCycle} / {monthlyLimit} utilizadas (
                  {opportunitiesRemainingInCycle} restantes)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-brand-primary/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    opportunitiesRemainingInCycle === 0
                      ? 'bg-amber-500'
                      : 'bg-brand-accent-strong'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (opportunitiesUsedInCycle / Math.max(1, monthlyLimit)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            {subSummary?.inGracePeriod && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <div>
                  <strong>Pagamento pendente (Tolerância de 7 dias ativa):</strong>{' '}
                  Regularize sua fatura em aberto abaixo até{' '}
                  {subSummary.subscription?.toleranciaAte
                    ? new Date(
                        subSummary.subscription.toleranciaAte
                      ).toLocaleDateString('pt-BR')
                    : 'o prazo informado'}{' '}
                  para evitar retorno automático ao plano Gratuito.
                </div>
              </div>
            )}

            {subSummary?.scheduledPlan && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs">
                <strong>Mudança agendada:</strong> Ao final do ciclo atual (
                {subSummary.subscription?.fim
                  ? new Date(subSummary.subscription.fim).toLocaleDateString(
                      'pt-BR'
                    )
                  : 'próxima renovação'}
                ), seu plano mudará automaticamente para{' '}
                <strong>{subSummary.scheduledPlan.nome}</strong>.
              </div>
            )}
          </div>

          {/* Controles de Faturamento + Dados Asaas */}
          <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-brand-ink">
                  Alterar plano ou escolher novo ciclo
                </h3>
                <p className="text-xs text-brand-ink/70">
                  Upgrades têm efeito imediato (pro-rata); downgrades passam a valer na próxima renovação.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBillingCycle('mensal')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    billingCycle === 'mensal'
                      ? 'bg-brand-primary text-white'
                      : 'bg-brand-background text-brand-ink'
                  }`}
                >
                  Ciclo Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('anual')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    billingCycle === 'anual'
                      ? 'bg-brand-accent-strong text-white'
                      : 'bg-brand-background text-brand-ink'
                  }`}
                >
                  Anual (2 meses grátis)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2 border-t border-brand-primary/10">
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  Forma de pagamento (Asaas)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'pix', label: 'Pix', icon: QrCode },
                      { id: 'cartao', label: 'Cartão', icon: CreditCard },
                      { id: 'boleto', label: 'Boleto', icon: FileText },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id)}
                      className={`py-2 px-2 rounded-xl border font-semibold inline-flex items-center justify-center gap-1 cursor-pointer ${
                        paymentMethod === id
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-brand-background/70 text-brand-ink border-brand-primary/15'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  CPF ou CNPJ do titular (Asaas)
                </label>
                <input
                  type="text"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCpfCnpjInput(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  WhatsApp para avisos de fatura
                </label>
                <input
                  type="text"
                  value={billingPhone}
                  onChange={(e) => setBillingPhone(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/15"
                />
              </div>
            </div>

            {billingCycle === 'mensal' && launchOffer?.eligible && (
              <label className="flex items-center gap-2 text-xs text-emerald-800 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyLaunchOffer}
                  onChange={(e) => setApplyLaunchOffer(e.target.checked)}
                />
                <span>
                  Aplicar Promoção de Lançamento (90 dias grátis nos 3 primeiros meses em novos checkouts mensais)
                </span>
              </label>
            )}
          </div>

          {checkoutNotice && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                checkoutNotice.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-900'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              }`}
            >
              <span>{checkoutNotice.message}</span>
              {checkoutNotice.checkoutUrl && (
                <a
                  href={checkoutNotice.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-semibold inline-flex items-center gap-1.5 shrink-0"
                >
                  <span>Abrir cobrança no Asaas</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {opportunitiesRemainingInCycle === 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>
                <strong>Limite mensal atingido ({monthlyLimit} oportunidades):</strong>{' '}
                Seu perfil público permanece visível, mas faça upgrade para continuar recebendo novas oportunidades neste ciclo.
              </span>
            </div>
          )}

          {/* Grid dos 4 Planos Reais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plansList.map((planItem) => {
              const actionType = getSubscriptionActionType({
                activeSubStatus: subSummary?.subscription?.status,
                activeSubCycle: subSummary?.subscription?.ciclo,
                currentPlan: currentPlanConfig,
                targetPlan: planItem,
                targetCycle: billingCycle,
              });
              const isCurrent = actionType === 'current';
              const showPromo =
                billingCycle === 'mensal' &&
                planItem.precoMensalCentavos > 0 &&
                launchOffer?.eligible &&
                applyLaunchOffer;
              const promoCents =
                launchOffer?.promoPricesCentavos?.[planItem.slug] ?? 0;
              const annualMonthlyEq = calculateAnnualMonthlyEquivalentCentavos(
                planItem.precoAnualCentavos
              );
              const annualSavings = calculateAnnualSavingsCentavos(
                planItem.precoMensalCentavos,
                planItem.precoAnualCentavos
              );
              const bullets = getPlanBullets(planItem);
              const isSubmitting = planSubmittingSlug === planItem.slug;

              return (
                <div
                  key={planItem.slug}
                  className={`rounded-3xl p-5 border flex flex-col justify-between gap-5 transition-all ${
                    isCurrent
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-brand-ink border-brand-primary/10'
                  }`}
                >
                  <div className="space-y-3">
                    <div>
                      <p
                        className={`text-[11px] font-semibold ${
                          isCurrent
                            ? 'text-brand-accent-contrast'
                            : 'text-brand-link'
                        }`}
                      >
                        {getPlanAudienceLabel(planItem.slug)}
                      </p>
                      <h3 className="font-display font-bold text-lg mt-0.5">
                        {planItem.nome}
                      </h3>
                      {planItem.selo && (
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isCurrent
                              ? 'bg-white/15 text-brand-accent-contrast'
                              : 'bg-brand-accent-strong/15 text-brand-accent-strong'
                          }`}
                        >
                          Selo: {planItem.selo}
                        </span>
                      )}

                      {billingCycle === 'mensal' ? (
                        showPromo && !isCurrent ? (
                          <div className="mt-2">
                            <p className="text-[11px] font-mono line-through opacity-60">
                              {formatCentavosBRL(planItem.precoMensalCentavos)}/mês
                            </p>
                            <p className="font-mono font-bold text-base text-emerald-700">
                              {promoCents === 0
                                ? 'R$ 0,00 / 90 dias'
                                : `${formatCentavosBRL(promoCents)}/mês`}
                            </p>
                            <p className="text-[10px] text-emerald-700 font-semibold">
                              Depois {formatCentavosBRL(planItem.precoMensalCentavos)}/mês
                            </p>
                          </div>
                        ) : (
                          <p className="font-mono font-bold text-base mt-2">
                            {planItem.precoMensalCentavos === 0
                              ? 'R$ 0,00/mês'
                              : `${formatCentavosBRL(planItem.precoMensalCentavos)}/mês`}
                          </p>
                        )
                      ) : (
                        <div className="mt-2">
                          <p className="font-mono font-bold text-base">
                            {planItem.precoAnualCentavos === 0
                              ? 'R$ 0,00/ano'
                              : `${formatCentavosBRL(planItem.precoAnualCentavos)}/ano`}
                          </p>
                          {planItem.precoAnualCentavos > 0 && (
                            <p
                              className={`text-[10px] ${
                                isCurrent ? 'text-white/80' : 'text-emerald-700'
                              }`}
                            >
                              {formatCentavosBRL(annualMonthlyEq)}/mês · Economize{' '}
                              {formatCentavosBRL(annualSavings)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <ul className="space-y-1.5 text-xs">
                      {bullets.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                              isCurrent
                                ? 'text-brand-accent-contrast'
                                : 'text-brand-link'
                            }`}
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={isCurrent || isSubmitting}
                    onClick={() => handleSelectPlanWithAsaas(planItem)}
                    className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-xs font-display font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-brand-accent-strong text-white cursor-default'
                        : 'bg-brand-background hover:bg-brand-surface-hover text-brand-ink cursor-pointer disabled:opacity-50'
                    }`}
                  >
                    {isSubmitting
                      ? 'Processando...'
                      : isCurrent
                        ? '✓ Plano Atual'
                        : actionType === 'upgrade'
                          ? `Fazer upgrade`
                          : actionType === 'downgrade'
                            ? `Agendar downgrade`
                            : `Assinar ${planItem.nome}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Histórico de Faturas */}
          <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4">
            <div>
              <h3 className="font-display font-bold text-lg text-brand-ink">
                Histórico de faturas
              </h3>
              <p className="text-xs text-brand-ink/70">
                Acompanhe cobranças, vencimentos e links de pagamento Asaas.
              </p>
            </div>

            {Array.isArray(subSummary?.invoices) &&
            subSummary.invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-brand-primary/10 text-brand-ink/70">
                      <th className="py-2.5 pr-4">Vencimento</th>
                      <th className="py-2.5 pr-4">Método</th>
                      <th className="py-2.5 pr-4">Valor</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5 pr-4">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-primary/10">
                    {subSummary.invoices.map((inv: any) => (
                      <tr key={inv.id}>
                        <td className="py-3 pr-4 font-mono">
                          {inv.vencimento
                            ? new Date(inv.vencimento).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td className="py-3 pr-4 uppercase font-semibold">
                          {inv.metodo || 'pix'}
                        </td>
                        <td className="py-3 pr-4 font-mono font-bold">
                          {formatCentavosBRL(inv.valorCentavos ?? 0)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              inv.status === 'paga'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'pendente'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {inv.urlCheckout &&
                          (inv.status === 'pendente' ||
                            inv.status === 'falhou') ? (
                            <a
                              href={inv.urlCheckout}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-brand-link font-semibold hover:underline"
                            >
                              <span>Pagar agora</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : inv.pagoEm ? (
                            <span className="text-brand-ink/60">
                              Pago em{' '}
                              {new Date(inv.pagoEm).toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-brand-ink/50">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-brand-ink/65">
                Nenhuma fatura registrada até o momento para esta conta.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação de cancelamento */}
      {showCancelModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cancelar assinatura"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <form
            onSubmit={handleConfirmCancelSubscription}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl border border-brand-primary/15"
          >
            <h3 className="font-display font-bold text-lg text-brand-ink">
              Confirmar cancelamento da assinatura
            </h3>
            <p className="text-brand-ink/80 leading-relaxed">
              Não cobramos multa nem fidelidade. Você mantém os benefícios do plano{' '}
              <strong>{currentPlanConfig.nome}</strong> até o final do período já pago e depois retorna automaticamente para o plano Gratuito sem perder suas avaliações.
            </p>
            <div className="space-y-1">
              <label className="font-semibold text-brand-ink block">
                Motivo do cancelamento (opcional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: pausa temporária na agenda..."
                className="w-full px-3 py-2 rounded-xl border border-brand-primary/15"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl bg-brand-background text-brand-ink font-semibold cursor-pointer"
              >
                Manter assinatura
              </button>
              <button
                type="submit"
                disabled={cancelLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer disabled:opacity-60"
              >
                {cancelLoading ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'indicacoes' && (
        <ReferralDashboardPanel
          authToken={authToken}
          userFullName={activeProvider.name}
          onDaysApplied={loadSubscriptionData}
          onNavigateUrl={(path) =>
            path === '/planos' ? setActiveTab('plano') : onNavigate('home')
          }
        />
      )}

      {/* ESPAÇO PUBLICITÁRIO MODERADO (DIRETO + GOOGLE ADSENSE) — EXIBIDO EXCLUSIVAMENTE NO PLANO GRATUITO NO PAINEL DO PRESTADOR */}
      {activeProvider.plan === 'Gratuito' && sponsoredAd && (
        <GoogleModeratedAdSlot
          sponsoredAd={sponsoredAd}
          adClickConfirmed={adClickConfirmed}
          onTrackClick={handleTrackAdClick}
          onUpgradeClick={() => setActiveTab('plano')}
        />
      )}
    </div>
  );
};
