import React, { useState } from 'react';
import {
  ShieldCheck,
  Star,
  Clock,
  CheckCircle2,
  Share2,
  MessageSquare,
  RotateCcw,
  Award,
  MapPin,
  ArrowRight,
  UserCheck,
  Calendar,
} from 'lucide-react';
import {
  ProviderProfile,
  RepeatServiceRequest,
  ScreenId,
} from '../types/confiare';
import { calculateCompositeScore } from '../utils/marketplaceRules';
import { PortfolioVisualGraphic } from './ConfiareLogo';

interface ProviderProfileScreenProps {
  provider: ProviderProfile;
  allProviders: ProviderProfile[];
  onSelectProvider: (id: string) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

export const ProviderProfileScreen: React.FC<ProviderProfileScreenProps> = ({
  provider,
  allProviders,
  onSelectProvider,
  onNavigate,
}) => {
  const [whatsappUnlocked, setWhatsappUnlocked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [publicOfficialSpecs, setPublicOfficialSpecs] = useState<string[] | null>(null);
  const [publicApprovedTags, setPublicApprovedTags] = useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/providers/${encodeURIComponent(provider.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body?.ok || !body.provider) return;
        const specs = Array.isArray(body.provider.officialSpecialties)
          ? body.provider.officialSpecialties.map((s: any) => s.nome)
          : null;
        if (specs && specs.length > 0) {
          setPublicOfficialSpecs(specs);
        } else {
          setPublicOfficialSpecs(null);
        }
        const tags = Array.isArray(body.provider.approvedTags)
          ? body.provider.approvedTags.map((t: any) => t.tag)
          : [];
        setPublicApprovedTags(tags);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [provider.id]);

  const displayedSpecialties =
    publicOfficialSpecs && publicOfficialSpecs.length > 0
      ? publicOfficialSpecs
      : provider.specialties;

  const scoreBreakdown = calculateCompositeScore(provider);

  const handleCopyShareLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Bar to switch between providers for easy evaluation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0A2540]/10 pb-5">
        <div>
          <p className="text-xs font-semibold text-[#1D6FE0]">
            Tela 05 · Vitrine Pública Otimizada para Busca Local
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0A2540] mt-1">
            Perfil do prestador com avaliações, selo verificado e portfólio
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto min-w-0">
          <label
            htmlFor="switch-provider-select"
            className="text-xs font-medium text-[#0A2540]/70 whitespace-nowrap"
          >
            Alternar profissional:
          </label>
          <select
            id="switch-provider-select"
            value={provider.id}
            onChange={(e) => {
              setWhatsappUnlocked(false);
              onSelectProvider(e.target.value);
            }}
            className="w-full sm:w-auto max-w-full px-3 py-2 rounded-xl bg-white border border-[#0A2540]/15 text-xs font-semibold text-[#0A2540] truncate"
          >
            {allProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <section className="bg-[#0A2540] text-white rounded-3xl p-5 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#1D6FE0] text-white font-display font-bold text-2xl flex items-center justify-center shrink-0">
                {provider.initials}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#FF6A00] font-semibold">
                  <span>{provider.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{provider.yearsExperience} anos de experiência</span>
                  <span aria-hidden="true">·</span>
                  <span>{provider.city}</span>
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-white break-words">
                  {provider.name}
                </h2>
                {/* Clean unboxed trust seals */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/90 pt-1">
                  {provider.isVerified && (
                    <span className="font-semibold text-[#60A5FA]">
                      ✓ Selo Verificado (Identidade + Endereço)
                    </span>
                  )}
                  {provider.isTopRegion && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Top na região</span>
                    </>
                  )}
                  {provider.isMentor && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#FF6A00] font-semibold">
                        Padrinho Verificado na Rede
                      </span>
                    </>
                  )}
                  {provider.mentorName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#FF6A00] font-semibold">
                        Indicado por {provider.mentorName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-white/85 leading-relaxed max-w-3xl">
              {provider.bio}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/75 font-mono tabular-nums">
              <span>★ Nota Composta: {scoreBreakdown.totalScore.toFixed(2)}</span>
              <span>·</span>
              <span>{provider.completedJobs} atendimentos concluídos</span>
              <span>·</span>
              <span>Tempo médio de resposta: {provider.responseTimeMinutes} min</span>
              <span>·</span>
              <span>Comparecimento: {provider.attendanceRatePercent}%</span>
            </div>
          </div>

          {/* Right CTAs */}
          <div className="lg:col-span-4 bg-white text-[#0A2540] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0A2540]/10 pb-3">
              <span className="text-xs font-semibold text-[#0A2540]/70">
                Negociação direta sem taxa
              </span>
              <span className="text-xs font-mono font-semibold text-[#1D6FE0]">
                {provider.availableToday ? 'Disponível hoje' : 'Agenda sob consulta'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setWhatsappUnlocked(true)}
              className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 text-center cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>
                {whatsappUnlocked
                  ? `Falar no WhatsApp: ${provider.whatsapp}`
                  : 'Solicitar orçamento no WhatsApp'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('solicitar-novamente', provider.id)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#13385c] text-white font-display font-semibold text-xs transition-colors flex items-center justify-center gap-2 text-center cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Solicitar novamente este profissional</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('avaliacao-pos-atendimento', provider.id)}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540] text-xs font-medium transition-colors cursor-pointer"
              >
                Avaliar serviço
              </button>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540] text-xs font-medium transition-colors inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span>{copiedLink ? 'Link copiado!' : 'Compartilhar'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Especialidades, Área de Atendimento e Composição da Nota */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-[#0A2540]/10 space-y-5">
          <div>
            <p className="text-xs font-semibold text-[#1D6FE0]">
              Cobertura Local e Especialidades
            </p>
            <h3 className="font-display font-bold text-lg text-[#0A2540]">
              O que {provider.name} resolve na sua região
            </h3>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#0A2540]/70">
              Especialidades técnicas oficiais:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedSpecialties.map((spec) => (
                <li
                  key={spec}
                  className="flex items-center gap-2 text-xs text-[#0A2540] bg-[#F4F2EF]/60 px-3.5 py-2.5 rounded-xl"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#1D6FE0] shrink-0" />
                  <span>{spec}</span>
                </li>
              ))}
            </ul>
            {publicApprovedTags.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#0A2540]/65">
                  Atuação complementar:
                </span>
                {publicApprovedTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full bg-[#F4F2EF] text-[11px] text-[#0A2540]/80"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#0A2540]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#0A2540]/75">
            <span>
              <strong>Bairros atendidos:</strong> {provider.neighborhoods.join(', ')}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('indicacao-substituto', provider.id)}
              className="text-left text-[#1D6FE0] font-semibold hover:underline cursor-pointer"
            >
              Ver rede de substitutos deste profissional →
            </button>
          </div>
        </div>

        {/* Transparência da Nota Composta */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-[#0A2540]/10 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[#FF6A00]">
                Auditoria de Reputação Confiare
              </p>
              <h3 className="font-display font-bold text-lg text-[#0A2540]">
                Nota Composta: ★ {scoreBreakdown.totalScore.toFixed(2)}
              </h3>
            </div>
            <span className="text-xs font-mono text-[#0A2540]/60 shrink-0">
              Imune a compra
            </span>
          </div>

          <p className="text-xs text-[#0A2540]/70 leading-relaxed">
            A reputação na Confiare não é uma média simples nem pode ser comprada por planos pagos. Veja a composição exata:
          </p>

          <div className="space-y-2.5 text-xs font-mono tabular-nums">
            <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#0A2540]/10">
              <span className="font-sans text-[#0A2540]">
                Avaliações de clientes (peso 40%)
              </span>
              <span className="font-semibold text-[#0A2540] shrink-0">
                +{scoreBreakdown.reviewsComponent.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#0A2540]/10">
              <span className="font-sans text-[#0A2540]">
                Tempo médio de resposta ({provider.responseTimeMinutes}m · 20%)
              </span>
              <span className="font-semibold text-[#0A2540] shrink-0">
                +{scoreBreakdown.responseTimeComponent.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#0A2540]/10">
              <span className="font-sans text-[#0A2540]">
                Taxa de resposta ({provider.responseRatePercent}% · 20%)
              </span>
              <span className="font-semibold text-[#0A2540] shrink-0">
                +{scoreBreakdown.responseRateComponent.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#0A2540]/10">
              <span className="font-sans text-[#0A2540]">
                Atendimentos concluídos ({provider.completedJobs} · 10%)
              </span>
              <span className="font-semibold text-[#0A2540] shrink-0">
                +{scoreBreakdown.completedJobsComponent.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="font-sans text-[#0A2540]">
                Verificação documental e perfil (10%)
              </span>
              <span className="font-semibold text-[#1D6FE0] shrink-0">
                +{scoreBreakdown.verificationComponent.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PORTFÓLIO VISUAL */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#1D6FE0]">
              Trabalhos reais registrados
            </p>
            <h3 className="font-display font-bold text-xl text-[#0A2540]">
              Portfólio e Antes / Depois ({provider.portfolio.length})
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {provider.portfolio.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-[#0A2540]/10 flex flex-col justify-between gap-4 min-w-0"
            >
              <div className="space-y-3">
                <PortfolioVisualGraphic
                  visualType={item.visualType}
                  title={item.title}
                />
                <div className="flex items-center justify-between text-xs text-[#0A2540]/60">
                  <span>{item.neighborhood}</span>
                  <span>
                    {item.date} · {item.duration}
                  </span>
                </div>
                <h4 className="font-display font-bold text-sm text-[#0A2540]">
                  {item.title}
                </h4>
                <p className="text-xs text-[#0A2540]/75 leading-relaxed">
                  {item.description}
                </p>
              </div>
              <p className="text-[11px] font-semibold text-[#1D6FE0] pt-2 border-t border-[#0A2540]/10">
                {item.beforeAfterLabel}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* AVALIAÇÕES AUDITADAS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#1D6FE0]">
              Vinculadas exclusivamente a solicitações reais
            </p>
            <h3 className="font-display font-bold text-xl text-[#0A2540]">
              Avaliações verificadas de clientes ({provider.reviews.length} em destaque)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('avaliacao-pos-atendimento', provider.id)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white text-xs font-semibold transition-colors cursor-pointer self-start"
          >
            Registrar nova avaliação pós-atendimento
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {provider.reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-[#0A2540]/10 space-y-3 min-w-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-[#0A2540]">
                    {rev.clientName}
                  </p>
                  <p className="text-xs text-[#0A2540]/60">
                    {rev.neighborhood} · {rev.date} · {rev.serviceTitle}
                  </p>
                </div>
                <span className="font-mono tabular-nums text-sm font-bold text-[#0A2540] shrink-0">
                  ★ {rev.rating.toFixed(1)}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#0A2540]/85 leading-relaxed">
                “{rev.comment}”
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#0A2540]/65 font-mono tabular-nums pt-1">
                <span>Qualidade: {rev.criteria.qualidade}/5</span>
                <span>·</span>
                <span>Pontualidade: {rev.criteria.pontualidade}/5</span>
                <span>·</span>
                <span>Comunicação: {rev.criteria.comunicacao}/5</span>
                <span>·</span>
                <span>Organização: {rev.criteria.organizacao}/5</span>
              </div>

              {rev.providerReply && (
                <div className="p-3.5 rounded-xl bg-[#F4F2EF] text-xs text-[#0A2540]/80 space-y-1">
                  <p className="font-semibold text-[#0A2540]">
                    Resposta pública de {provider.name}:
                  </p>
                  <p>{rev.providerReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

interface RepeatRequestScreenProps {
  providers: ProviderProfile[];
  selectedProviderId: string;
  repeatRequests: RepeatServiceRequest[];
  onCreateRepeatRequest: (req: RepeatServiceRequest) => void;
  onTriggerSubstituteFlow: (providerId: string, serviceSummary: string) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

export const RepeatRequestScreen: React.FC<RepeatRequestScreenProps> = ({
  providers,
  selectedProviderId,
  repeatRequests,
  onCreateRepeatRequest,
  onTriggerSubstituteFlow,
  onNavigate,
}) => {
  const trustedProviders = providers.filter((p) => p.previouslyHiredByCurrentUser);
  const [chosenProviderId, setChosenProviderId] = useState<string>(
    trustedProviders.some((p) => p.id === selectedProviderId)
      ? selectedProviderId
      : trustedProviders[0]?.id || providers[0].id
  );

  const activeProvider =
    providers.find((p) => p.id === chosenProviderId) || providers[0];

  const [serviceType, setServiceType] = useState(
    'Instalação de tomada dupla 20A e revisão preventiva do quadro'
  );
  const [desiredDate, setDesiredDate] = useState('Sexta-feira, 14h00');
  const [urgency, setUrgency] = useState<'Hoje' | 'Amanhã' | 'Esta semana' | 'Flexível'>(
    'Esta semana'
  );
  const [notes, setNotes] = useState(
    'Mesmo endereço do último atendimento em Pinheiros. Portaria já autorizada.'
  );
  const [lgpdShareConsent, setLgpdShareConsent] = useState(true);
  const [confirmationMode, setConfirmationMode] = useState<
    'idle' | 'accepted' | 'unavailable'
  >('idle');

  const handleDirectRepeatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType.trim()) return;

    const newRepeat: RepeatServiceRequest = {
      id: `rep-${Date.now()}`,
      providerId: activeProvider.id,
      category: activeProvider.category,
      serviceType: serviceType.trim(),
      desiredDate,
      urgency,
      notes,
      lgpdShareConsent,
      status: 'aceito',
      createdAt: 'Agora mesmo',
    };
    onCreateRepeatRequest(newRepeat);
    setConfirmationMode('accepted');
  };

  const handleSimulateUnavailableWithSubstitute = () => {
    onTriggerSubstituteFlow(activeProvider.id, serviceType);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#0A2540]/10 pb-6">
        <div>
          <p className="text-xs font-semibold text-[#FF6A00]">
            Tela 06 · Retenção e Continuidade com Quem Você Já Conhece
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0A2540] mt-1">
            Solicitar novamente
          </h1>
          <p className="text-sm text-[#0A2540]/75 mt-1">
            Recontrate facilmente um profissional da sua lista “Meus profissionais de confiança” preservando o histórico do atendimento anterior.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('indicacao-substituto', activeProvider.id)}
          className="text-left text-xs font-semibold text-[#1D6FE0] hover:text-[#0A2540] underline underline-offset-4 sm:whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          E se ele não puder atender? Ver Indicação de Substituto →
        </button>
      </div>

      {/* Lista Meus Profissionais de Confiança */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-base text-[#0A2540]">
          1. Selecione em “Meus profissionais de confiança”
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trustedProviders.map((tp) => {
            const isSelected = tp.id === activeProvider.id;
            return (
              <button
                key={tp.id}
                type="button"
                onClick={() => {
                  setChosenProviderId(tp.id);
                  setConfirmationMode('idle');
                }}
                className={`text-left p-5 rounded-2xl border transition-all cursor-pointer min-w-0 ${
                  isSelected
                    ? 'bg-[#0A2540] text-white border-[#0A2540]'
                    : 'bg-white text-[#0A2540] border-[#0A2540]/10 hover:border-[#1D6FE0]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-bold text-base truncate">
                    {tp.name}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#FF6A00] shrink-0">
                    ★ {tp.ratingAvg.toFixed(2)}
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 ${
                    isSelected ? 'text-white/80' : 'text-[#0A2540]/70'
                  }`}
                >
                  {tp.category} · Último serviço: {tp.lastServiceDate}
                </p>
                <p
                  className={`text-xs mt-2 line-clamp-2 ${
                    isSelected ? 'text-white/90' : 'text-[#0A2540]/80'
                  }`}
                >
                  Histórico: “{tp.lastServiceSummary}”
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Formulário de Pedido Direto */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleDirectRepeatSubmit}
          className="lg:col-span-8 bg-white rounded-3xl p-5 sm:p-8 border border-[#0A2540]/10 space-y-6"
        >
          <div className="p-4 rounded-2xl bg-[#F4F2EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#1D6FE0]">
                Histórico preservado do último atendimento com {activeProvider.name}
              </p>
              <p className="text-xs text-[#0A2540]/80 mt-0.5">
                {activeProvider.lastServiceDate} — {activeProvider.lastServiceSummary}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('perfil-prestador', activeProvider.id)}
              className="text-left text-xs font-semibold text-[#0A2540] underline whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              Ver ficha técnica
            </button>
          </div>

          {confirmationMode === 'accepted' && (
            <div
              role="status"
              className="p-5 rounded-2xl bg-[#0A2540] text-white space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#FF6A00]">
                  Solicitação direta aceita pelo profissional!
                </span>
                <span className="text-xs font-mono">WhatsApp Liberado</span>
              </div>
              <p className="text-sm font-display font-semibold">
                {activeProvider.name} confirmou disponibilidade para {desiredDate}.
              </p>
              <p className="text-xs text-white/80">
                Contato direto liberado: <strong>{activeProvider.whatsapp}</strong>
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('avaliacao-pos-atendimento', activeProvider.id)
                  }
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#FF6A00] text-white text-xs font-semibold cursor-pointer"
                >
                  Simular conclusão e avaliar serviço →
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="repeat-service-type"
                className="block text-xs font-semibold text-[#0A2540] mb-1.5"
              >
                O que você precisa que {activeProvider.name} faça desta vez? *
              </label>
              <input
                id="repeat-service-type"
                type="text"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="repeat-date"
                  className="block text-xs font-semibold text-[#0A2540] mb-1.5"
                >
                  Data e horário desejados
                </label>
                <input
                  id="repeat-date"
                  type="text"
                  value={desiredDate}
                  onChange={(e) => setDesiredDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540]"
                />
              </div>

              <div>
                <label
                  htmlFor="repeat-urgency"
                  className="block text-xs font-semibold text-[#0A2540] mb-1.5"
                >
                  Urgência
                </label>
                <select
                  id="repeat-urgency"
                  value={urgency}
                  onChange={(e) =>
                    setUrgency(
                      e.target.value as 'Hoje' | 'Amanhã' | 'Esta semana' | 'Flexível'
                    )
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540]"
                >
                  <option value="Hoje">Hoje</option>
                  <option value="Amanhã">Amanhã</option>
                  <option value="Esta semana">Esta semana</option>
                  <option value="Flexível">Flexível</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="repeat-notes"
                className="block text-xs font-semibold text-[#0A2540] mb-1.5"
              >
                Observações ou referência do serviço anterior
              </label>
              <textarea
                id="repeat-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540]"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer p-3.5 rounded-xl bg-[#F4F2EF]/70">
            <input
              type="checkbox"
              checked={lgpdShareConsent}
              onChange={(e) => setLgpdShareConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#1D6FE0]"
            />
            <span className="text-xs text-[#0A2540]">
              Caso {activeProvider.name} esteja indisponível na data escolhida, autorizo que ele me envie até 2 indicações de substitutos verificados da sua rede de confiança.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-xs sm:text-sm transition-colors inline-flex items-center justify-center gap-2 text-center cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Enviar solicitação direta a {activeProvider.name}</span>
            </button>

            <button
              type="button"
              onClick={handleSimulateUnavailableWithSubstitute}
              className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl bg-[#0A2540] hover:bg-[#13385c] text-white font-display font-semibold text-xs sm:text-sm transition-colors text-center cursor-pointer"
            >
              Simular profissional ocupado → Receber Substituto
            </button>
          </div>
        </form>

        {/* Right Column: Histórico de Recompras */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-[#0A2540]/10 space-y-4">
            <h3 className="font-display font-bold text-base text-[#0A2540]">
              Histórico de recontratações ({repeatRequests.length})
            </h3>
            {repeatRequests.length === 0 ? (
              <p className="text-xs text-[#0A2540]/65">
                Nenhuma solicitação enviada nesta sessão ainda. Clique em “Enviar solicitação direta” para testar.
              </p>
            ) : (
              <div className="space-y-3">
                {repeatRequests.map((item) => {
                  const prov = providers.find((p) => p.id === item.providerId);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-[#F4F2EF] space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-[#0A2540]">
                        <span>{prov?.name}</span>
                        <span className="text-[#1D6FE0]">{item.createdAt}</span>
                      </div>
                      <p className="text-[#0A2540]/80">{item.serviceType}</p>
                      <p className="text-[#0A2540]/60">Data: {item.desiredDate}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
