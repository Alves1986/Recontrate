import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Award,
  Copy,
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
import { ProviderRealtimeNotifications } from './ProviderRealtimeNotifications';
import { GoogleModeratedAdSlot } from './GoogleModeratedAdSlot';
import { ProviderSpecialtiesManager } from './ProviderSpecialtiesManager';
import { BrandLogo } from './BrandLogo';

interface ProviderDashboardScreenProps {
  activeProvider: ProviderProfile;
  opportunities: ProviderOpportunity[];
  onAddRealtimeOpportunity?: (newOpp: ProviderOpportunity) => void;
  onUpdateOpportunityStatus: (
    oppId: string,
    status: ProviderOpportunity['status']
  ) => void;
  onChangeProviderPlan: (providerId: string, newPlan: PlanTier) => void;
  onToggleProviderAvailability: (providerId: string) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

const PLANS_CONFIG: {
  tier: PlanTier;
  slug: string;
  audience: string;
  priceMonthly: string;
  priceAnnual: string;
  monthlyLimit: number;
  limitLabel: string;
  badge?: string;
  showsAds: boolean;
  features: string[];
}[] = [
  {
    tier: 'Gratuito',
    slug: 'gratuito',
    audience: 'Entrada sem custo fixo',
    priceMonthly: 'R$ 0,00/mês',
    priceAnnual: 'R$ 0,00/ano',
    monthlyLimit: 5,
    limitLabel: 'Até 5 oportunidades/mês',
    showsAds: true,
    features: [
      'Perfil público básico e contato por WhatsApp',
      'Avaliações visíveis para clientes',
      'Exibição moderada de anúncios relevantes no painel',
    ],
  },
  {
    tier: 'Essencial',
    slug: 'essencial',
    audience: 'Para iniciantes na plataforma',
    priceMonthly: 'R$ 29,90/mês',
    priceAnnual: 'R$ 299,00/ano',
    monthlyLimit: 15,
    limitLabel: 'Até 15 oportunidades/mês',
    showsAds: false,
    features: [
      'Prioridade leve justa no matching (+2 pts)',
      'Perfil profissional completo e portfólio até 10 fotos',
      'Relatório mensal básico e painel sem anúncios',
    ],
  },
  {
    tier: 'Profissional',
    slug: 'profissional',
    audience: 'Para prestadores ativos',
    priceMonthly: 'R$ 59,90/mês',
    priceAnnual: 'R$ 599,00/ano',
    monthlyLimit: 40,
    limitLabel: 'Até 40 oportunidades/mês',
    badge: 'Profissional Recontrate',
    showsAds: false,
    features: [
      'Prioridade média justa no matching (+5 pts)',
      'Destaque em buscas locais e portfólio ilimitado',
      'Estatísticas de conversão e selo Profissional Recontrate',
    ],
  },
  {
    tier: 'Premium',
    slug: 'premium',
    audience: 'Em definição para lançamento',
    priceMonthly: 'R$ 99,90/mês (Em definição)',
    priceAnnual: 'R$ 999,00/ano (Em definição)',
    monthlyLimit: 100,
    limitLabel: 'Escopo premium em definição',
    badge: 'Em definição',
    showsAds: false,
    features: [
      'Aguardando validação de entregáveis mensuráveis',
      'Gestão avançada e relatórios dedicados em desenho',
      'Sem comercialização ativa durante o piloto inicial',
    ],
  },
];


export const ProviderDashboardScreen: React.FC<ProviderDashboardScreenProps> = ({
  activeProvider,
  opportunities,
  onAddRealtimeOpportunity,
  onUpdateOpportunityStatus,
  onChangeProviderPlan,
  onToggleProviderAvailability,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<
    'oportunidades' | 'reputacao' | 'plano'
  >('oportunidades');
  const [billingCycle, setBillingCycle] = useState<'mensal' | 'anual'>('mensal');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'boleto'>('pix');
  const [checkoutNotice, setCheckoutNotice] = useState<string>('');
  const [copiedQuoteTemplate, setCopiedQuoteTemplate] = useState(false);
  const [realtimeNotifications, setRealtimeNotifications] = useState<
    ProviderRealtimeNotification[]
  >(INITIAL_PROVIDER_NOTIFICATIONS);
  const [sponsoredAd, setSponsoredAd] = useState<any | null>(null);
  const [sessionBannersShown, setSessionBannersShown] = useState(0);
  const [adClickConfirmed, setAdClickConfirmed] = useState(false);

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
      // Offline preview fallback
    }
  };

  const currentPlanConfig =
    PLANS_CONFIG.find((p) => p.tier === activeProvider.plan) || PLANS_CONFIG[0];
  const opportunitiesUsedInCycle = Math.min(
    opportunities.length,
    currentPlanConfig.monthlyLimit
  );
  const opportunitiesRemainingInCycle = Math.max(
    0,
    currentPlanConfig.monthlyLimit - opportunitiesUsedInCycle
  );

  const handleSelectPlanWithAsaas = async (planItem: (typeof PLANS_CONFIG)[number]) => {
    if (planItem.slug === 'premium') {
      setCheckoutNotice(
        'O plano Premium está em definição e permanece bloqueado durante a fase de piloto.'
      );
      return;
    }
    onChangeProviderPlan(activeProvider.id, planItem.tier);
    setCheckoutNotice(
      `Plano ${planItem.tier} (${billingCycle}) selecionado em modo Piloto Controlado (60 a 90 dias gratuitos, sem cobrança real e sem conversão automática neste preview).`
    );
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
              <span>0% comissão sobre serviços</span>
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
          <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-brand-link">
                Previsibilidade de Custo Mensal · Asaas Recorrente (Pix, Cartão, Boleto) · Cancelamento Livre sem Multa
              </p>
              <h2 className="font-display font-bold text-xl text-brand-ink">
                Planos de assinatura para o prestador (0% comissão)
              </h2>
              <p className="text-xs text-brand-ink/70">
                Consumo no ciclo atual: <strong>{opportunitiesUsedInCycle} utilizada(s)</strong> de{' '}
                <strong>{currentPlanConfig.monthlyLimit}</strong> ({opportunitiesRemainingInCycle} restante(s)). Estrelas e reputação nunca podem ser compradas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              <select
                aria-label="Método de pagamento Asaas"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as 'pix' | 'cartao' | 'boleto'
                  )
                }
                className="px-3 py-2 rounded-xl border border-brand-primary/15 text-xs font-semibold bg-white text-brand-ink"
              >
                <option value="pix">Pagamento: Pix</option>
                <option value="cartao">Pagamento: Cartão</option>
                <option value="boleto">Pagamento: Boleto</option>
              </select>
            </div>
          </div>

          {checkoutNotice && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
              ✓ {checkoutNotice}
            </div>
          )}

          {opportunitiesRemainingInCycle === 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>
                <strong>Limite mensal atingido ({currentPlanConfig.monthlyLimit} oportunidades):</strong> Seu perfil público permanece visível, mas faça upgrade para continuar recebendo novas oportunidades neste ciclo.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {PLANS_CONFIG.map((planItem) => {
              const isCurrent = activeProvider.plan === planItem.tier;
              return (
                <div
                  key={planItem.tier}
                  className={`rounded-3xl p-5 border flex flex-col justify-between gap-5 transition-all ${
                    isCurrent
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-brand-ink border-brand-primary/10'
                  }`}
                >
                  <div className="space-y-3.5">
                    <div>
                      <p
                        className={`text-[11px] font-semibold ${
                          isCurrent ? 'text-brand-accent-strong' : 'text-brand-link'
                        }`}
                      >
                        {planItem.audience}
                      </p>
                      <h3 className="font-display font-bold text-lg mt-1">
                        {planItem.tier}
                      </h3>
                      {planItem.badge && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-brand-accent-strong/20 text-brand-accent-strong text-[10px] font-bold">
                          Selo: {planItem.badge}
                        </span>
                      )}
                      <p className="font-mono font-bold text-base mt-2">
                        {billingCycle === 'anual'
                          ? planItem.priceAnnual
                          : planItem.priceMonthly}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isCurrent ? 'text-white/80' : 'text-brand-ink/70'
                        }`}
                      >
                        {planItem.limitLabel}
                      </p>
                    </div>

                    <ul className="space-y-2 text-xs">
                      {planItem.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isCurrent ? 'text-brand-accent-strong' : 'text-brand-link'
                            }`}
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPlanWithAsaas(planItem)}
                    className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-xs font-display font-semibold transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-brand-accent-strong text-white'
                        : 'bg-brand-background hover:bg-brand-surface-hover text-brand-ink'
                    }`}
                  >
                    {isCurrent
                      ? '✓ Plano Atual'
                      : `Assinar ${planItem.tier}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
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
