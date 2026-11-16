import React, { useState } from 'react';
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
  audience: string;
  priceMonthly: string;
  limitLabel: string;
  features: string[];
}[] = [
  {
    tier: 'Essencial',
    audience: 'Para iniciantes na plataforma',
    priceMonthly: 'R$ 49/mês',
    limitLabel: 'Até 10 oportunidades/mês',
    features: [
      'Perfil público otimizado para busca local',
      'Notificações de pedidos no WhatsApp',
      'Avaliações verificadas e área de cobertura',
    ],
  },
  {
    tier: 'Profissional',
    audience: 'Para prestadores ativos',
    priceMonthly: 'R$ 89/mês',
    limitLabel: 'Até 40 oportunidades/mês',
    features: [
      'Prioridade média justa no raio de cobertura',
      'Portfólio ampliado com Antes / Depois',
      'Estatísticas de resposta e recontratação',
    ],
  },
  {
    tier: 'Premium',
    audience: 'Para profissionais estabelecidos',
    priceMonthly: 'R$ 139/mês',
    limitLabel: 'Oportunidades ilimitadas no raio',
    features: [
      'Prioridade alta combinada com reputação',
      'Destaque regional e relatórios avançados',
      'Suporte prioritário e modelos de orçamento',
    ],
  },
  {
    tier: 'Padrinho',
    audience: 'Mestres com nota ≥ 4.6 e 6+ meses',
    priceMonthly: 'R$ 109/mês (Desconto Mentor)',
    limitLabel: 'Ilimitado + Rede de Apadrinhamento',
    features: [
      'Todos os recursos do plano Premium',
      'Selo Padrinho Verificado na vitrine pública',
      'Ferramentas para indicar e acompanhar iniciantes',
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
  const [copiedQuoteTemplate, setCopiedQuoteTemplate] = useState(false);
  const [realtimeNotifications, setRealtimeNotifications] = useState<
    ProviderRealtimeNotification[]
  >(INITIAL_PROVIDER_NOTIFICATIONS);

  const scoreBreakdown = calculateCompositeScore(activeProvider);
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
      <div className="bg-[#0A2540] text-white rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#FF6A00] font-semibold">
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
                  ? 'bg-[#1D6FE0] text-white'
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
              className="min-h-[42px] px-4 py-2 rounded-xl bg-white text-[#0A2540] text-xs font-semibold hover:bg-white/90 transition-colors text-center cursor-pointer"
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
            <p className="text-[11px] font-sans text-[#FF6A00] mt-0.5">
              {acceptedCount} contato(s) liberado(s) hoje
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-3.5 sm:p-4 min-w-0">
            <p className="text-xs font-sans text-white/75">Nota Composta</p>
            <p className="text-base sm:text-2xl font-bold text-white mt-1">
              ★ {scoreBreakdown.totalScore.toFixed(2)}
            </p>
            <p className="text-[11px] font-sans text-white/70 mt-0.5">
              {activeProvider.reviewsCount} avaliações reais
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-3.5 sm:p-4 min-w-0">
            <p className="text-xs font-sans text-white/75">Tempo de Resposta</p>
            <p className="text-base sm:text-2xl font-bold text-white mt-1">
              {activeProvider.responseTimeMinutes} min
            </p>
            <p className="text-[11px] font-sans text-white/70 mt-0.5">
              Taxa de resposta: {activeProvider.responseRatePercent}%
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-3.5 sm:p-4 min-w-0">
            <p className="text-xs font-sans text-white/75">Plano e Prioridade</p>
            <p className="text-base sm:text-2xl font-bold text-[#FF6A00] mt-1">
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
      <div className="w-full sm:w-fit flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[#0A2540]/10">
        <button
          type="button"
          onClick={() => setActiveTab('oportunidades')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors text-center cursor-pointer ${
            activeTab === 'oportunidades'
              ? 'bg-[#0A2540] text-white'
              : 'text-[#0A2540]/75 hover:text-[#0A2540]'
          }`}
        >
          1. Oportunidades Recebidas ({opportunities.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reputacao')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors text-center cursor-pointer ${
            activeTab === 'reputacao'
              ? 'bg-[#0A2540] text-white'
              : 'text-[#0A2540]/75 hover:text-[#0A2540]'
          }`}
        >
          2. Reputação Composta & Posicionamento Digital
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('plano')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors text-center cursor-pointer ${
            activeTab === 'plano'
              ? 'bg-[#0A2540] text-white'
              : 'text-[#0A2540]/75 hover:text-[#0A2540]'
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
              className="bg-white rounded-3xl p-6 border border-[#0A2540]/10 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 text-[#1D6FE0] font-semibold">
                  <span>Origem: {opp.origin}</span>
                  {opp.referredByProviderName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Indicado por {opp.referredByProviderName}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="text-[#FF6A00]">Urgência: {opp.urgency}</span>
                </div>

                <span className="font-mono tabular-nums text-[#0A2540]/65">
                  Expira em {opp.expiresInMinutes} min · {opp.photosAttached} foto(s)
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-2">
                  <h2 className="font-display font-bold text-lg text-[#0A2540]">
                    {opp.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#0A2540]/80 leading-relaxed">
                    {opp.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#0A2540]/70 pt-1">
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

                <div className="lg:col-span-4 flex flex-col gap-2.5 lg:border-l lg:border-[#0A2540]/10 lg:pl-6">
                  {opp.status === 'aceita' ? (
                    <div className="p-4 rounded-2xl bg-[#0A2540] text-white space-y-1.5 text-xs">
                      <p className="text-[#FF6A00] font-semibold">
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
                    <div className="p-4 rounded-2xl bg-[#F4F2EF] text-[#0A2540] space-y-1.5 text-xs">
                      <p className="font-semibold text-[#1D6FE0]">
                        ✓ Substituto indicado com sucesso
                      </p>
                      <p className="text-[#0A2540]/75">
                        Você encaminhou este cliente para colegas verificados da rede.
                      </p>
                    </div>
                  ) : opp.status === 'recusada' ? (
                    <div className="p-4 rounded-2xl bg-[#F4F2EF] text-[#0A2540]/70 text-xs">
                      Oportunidade recusada dentro do prazo sem impacto na nota.
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAcceptOpportunityWithNotification(opp)}
                        className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-xs transition-colors cursor-pointer"
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
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-[#0A2540] hover:bg-[#13385c] text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Indicar substituto
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateOpportunityStatus(opp.id, 'recusada')}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540] text-xs font-semibold transition-colors cursor-pointer"
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
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#0A2540]/10 space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#FF6A00]">
                Transparência Total no Matching
              </p>
              <h2 className="font-display font-bold text-xl text-[#0A2540]">
                Seu Score Composto: ★ {scoreBreakdown.totalScore.toFixed(2)} / 5.00
              </h2>
              <p className="text-xs text-[#0A2540]/70 mt-1">
                Estrelas nunca podem ser compradas. Seu posicionamento depende da qualidade percebida pelo cliente e agilidade de resposta.
              </p>
            </div>

            <div className="space-y-3 text-xs font-mono tabular-nums">
              <div className="p-3.5 rounded-2xl bg-[#F4F2EF]/70 flex items-center justify-between">
                <span className="font-sans font-medium text-[#0A2540]">
                  1. Avaliações de clientes (peso 40%)
                </span>
                <span className="font-bold text-[#0A2540]">
                  +{scoreBreakdown.reviewsComponent.toFixed(2)} pts
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F4F2EF]/70 flex items-center justify-between">
                <span className="font-sans font-medium text-[#0A2540]">
                  2. Tempo médio de resposta ({activeProvider.responseTimeMinutes} min · peso 20%)
                </span>
                <span className="font-bold text-[#0A2540]">
                  +{scoreBreakdown.responseTimeComponent.toFixed(2)} pts
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F4F2EF]/70 flex items-center justify-between">
                <span className="font-sans font-medium text-[#0A2540]">
                  3. Taxa de resposta ({activeProvider.responseRatePercent}% · peso 20%)
                </span>
                <span className="font-bold text-[#0A2540]">
                  +{scoreBreakdown.responseRateComponent.toFixed(2)} pts
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F4F2EF]/70 flex items-center justify-between">
                <span className="font-sans font-medium text-[#0A2540]">
                  4. Atendimentos concluídos ({activeProvider.completedJobs} · peso 10%)
                </span>
                <span className="font-bold text-[#0A2540]">
                  +{scoreBreakdown.completedJobsComponent.toFixed(2)} pts
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F4F2EF]/70 flex items-center justify-between">
                <span className="font-sans font-medium text-[#0A2540]">
                  5. Verificações e completude do perfil (peso 10%)
                </span>
                <span className="font-bold text-[#1D6FE0]">
                  +{scoreBreakdown.verificationComponent.toFixed(2)} pts
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#0A2540]/10 space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#1D6FE0]">
                Ferramentas de Posicionamento Digital para Autônomos
              </p>
              <h2 className="font-display font-bold text-xl text-[#0A2540]">
                Profissionalize seu atendimento no WhatsApp
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4F2EF] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0A2540]">
                  Modelo de resposta rápida para orçamento
                </span>
                <button
                  type="button"
                  onClick={handleCopyQuoteTemplate}
                  className="text-xs font-semibold text-[#1D6FE0] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedQuoteTemplate ? 'Copiado!' : 'Copiar modelo'}</span>
                </button>
              </div>
              <p className="text-xs text-[#0A2540]/80 italic leading-relaxed">
                “Olá! Sou {activeProvider.name}, profissional verificado na rede Confiare (Nota ★ {scoreBreakdown.totalScore.toFixed(2)}). Vi sua solicitação no bairro e tenho disponibilidade para avaliar e enviar o escopo detalhado sem compromisso.”
              </p>
            </div>

            <div className="space-y-2.5 text-xs text-[#0A2540]/85">
              <p className="font-semibold text-[#0A2540]">
                Checklist de Visibilidade Local:
              </p>
              <div className="flex items-center justify-between py-2 border-b border-[#0A2540]/10">
                <span>✓ Documentos e comprovante de residência verificados</span>
                <span className="font-mono text-[#1D6FE0]">100%</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#0A2540]/10">
                <span>✓ Portfólio com fotos Antes/Depois atualizadas</span>
                <span className="font-mono text-[#1D6FE0]">
                  {activeProvider.portfolio.length} trabalhos
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>✓ Link público otimizado para Google e WhatsApp</span>
                <span className="font-mono text-[#FF6A00]">Ativo</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLANOS E ASSINATURA */}
      {activeTab === 'plano' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#0A2540]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#1D6FE0]">
                Previsibilidade de Custo Mensal · Cancelamento Livre sem Multa
              </p>
              <h2 className="font-display font-bold text-xl text-[#0A2540]">
                Planos de assinatura para o prestador
              </h2>
              <p className="text-xs text-[#0A2540]/70 mt-1">
                A plataforma garante oportunidades compatíveis, ferramentas e visibilidade — sem cobrar comissão sobre os serviços fechados.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#0A2540] bg-[#F4F2EF] px-3.5 py-2 rounded-xl shrink-0">
              Plano Ativo: {activeProvider.plan}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS_CONFIG.map((planItem) => {
              const isCurrent = activeProvider.plan === planItem.tier;
              return (
                <div
                  key={planItem.tier}
                  className={`rounded-3xl p-6 border flex flex-col justify-between gap-6 transition-all ${
                    isCurrent
                      ? 'bg-[#0A2540] text-white border-[#0A2540]'
                      : 'bg-white text-[#0A2540] border-[#0A2540]/10'
                  }`}
                >
                  <div className="space-y-4">
                    <div>
                      <p
                        className={`text-xs font-semibold ${
                          isCurrent ? 'text-[#FF6A00]' : 'text-[#1D6FE0]'
                        }`}
                      >
                        {planItem.audience}
                      </p>
                      <h3 className="font-display font-bold text-xl mt-1">
                        {planItem.tier}
                      </h3>
                      <p className="font-mono font-bold text-lg mt-2">
                        {planItem.priceMonthly}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isCurrent ? 'text-white/80' : 'text-[#0A2540]/70'
                        }`}
                      >
                        {planItem.limitLabel}
                      </p>
                    </div>

                    <ul className="space-y-2.5 text-xs">
                      {planItem.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isCurrent ? 'text-[#FF6A00]' : 'text-[#1D6FE0]'
                            }`}
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onChangeProviderPlan(activeProvider.id, planItem.tier)
                    }
                    className={`w-full min-h-[42px] px-4 py-2 rounded-xl text-xs font-display font-semibold transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#FF6A00] text-white'
                        : 'bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540]'
                    }`}
                  >
                    {isCurrent
                      ? '✓ Plano Atual Selecionado'
                      : `Mudar para ${planItem.tier}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
