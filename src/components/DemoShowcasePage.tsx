import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  MessageSquareOff,
  PhoneOff,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import {
  DEMO_CLIENT_PERSONA,
  DEMO_INITIAL_SUGGESTIONS,
  DEMO_SANDBOX_BADGE_TEXT,
  DEMO_SANDBOX_OPPORTUNITIES,
  DEMO_SANDBOX_PROVIDERS,
  DEMO_SANDBOX_REFERRAL,
  DEMO_SANDBOX_REQUESTS,
  simulateDemoBlockedAction,
  type DemoBlockedChannel,
  type DemoPendingSuggestion,
  type DemoSandboxBlockResult,
} from '../data/demoFixtures';
import { calculateCompositeScore } from '../utils/marketplaceRules';
import type {
  CategoryName,
  ProviderOpportunity,
  ProviderProfile,
  ServiceRequest,
  SubstituteReferral,
} from '../types/confiare';

type DemoPerspective = 'cliente' | 'prestador' | 'admin';

export const DemoShowcasePage: React.FC<{
  onNavigateUrl: (path: string) => void;
}> = ({ onNavigateUrl }) => {
  const [perspective, setPerspective] = useState<DemoPerspective>('cliente');
  const [providers, setProviders] = useState<ProviderProfile[]>(
    DEMO_SANDBOX_PROVIDERS
  );
  const [requests, setRequests] = useState<ServiceRequest[]>(
    DEMO_SANDBOX_REQUESTS
  );
  const [opportunities, setOpportunities] = useState<ProviderOpportunity[]>(
    DEMO_SANDBOX_OPPORTUNITIES
  );
  const [referral, setReferral] = useState<SubstituteReferral>(
    DEMO_SANDBOX_REFERRAL
  );
  const [suggestions, setSuggestions] = useState<DemoPendingSuggestion[]>(
    DEMO_INITIAL_SUGGESTIONS
  );
  const [blockedLog, setBlockedLog] = useState<DemoSandboxBlockResult[]>([]);

  // Form states (purely in-memory)
  const [reqCategory, setReqCategory] = useState<CategoryName>('Eletricista');
  const [reqTitle, setReqTitle] = useState(
    'Instalação de chuveiro 220V e revisão de disjuntor'
  );
  const [reqNeighborhood, setReqNeighborhood] = useState('Pinheiros');
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewComment, setReviewComment] = useState(
    'Atendimento fictício pontual, orçamento claro antes de iniciar e limpeza total.'
  );
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const registerBlockedEvent = (channel: DemoBlockedChannel) => {
    const result = simulateDemoBlockedAction(channel);
    setBlockedLog((prev) => [result, ...prev].slice(0, 6));
  };

  const rankedProviders = useMemo(() => {
    return [...providers].sort(
      (a, b) =>
        calculateCompositeScore(b).totalScore -
        calculateCompositeScore(a).totalScore
    );
  }, [providers]);

  const handleCreateDemoRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `demo-req-${Date.now()}`;
    const nextReq: ServiceRequest = {
      id: newId,
      category: reqCategory,
      problemTitle: `[DEMO] ${reqTitle.trim() || 'Serviço residencial'}`,
      description:
        'Solicitação criada no sandbox /demo (sem gravação em banco ou envio real).',
      neighborhood: reqNeighborhood.trim() || 'Pinheiros',
      city: 'São Paulo, SP',
      urgency: 'Hoje',
      preferredTime: 'Tarde (13h–18h)',
      estimatedBudget: 'R$ 200 – R$ 350',
      lgpdContactConsent: true,
      photosCount: 0,
      createdAt: 'Agora · Simulação Demo',
      status: 'oportunidades_enviadas',
    };
    const matched =
      providers.find((p) => p.category === reqCategory) || providers[0];
    const nextOpp: ProviderOpportunity = {
      id: `demo-opp-${Date.now()}`,
      category: reqCategory,
      title: nextReq.problemTitle,
      description: `${nextReq.description} (${matched.name})`,
      neighborhood: nextReq.neighborhood,
      distanceKm: 1.4,
      urgency: 'Hoje',
      preferredTime: 'Tarde (13h–18h)',
      clientNameMasked: DEMO_CLIENT_PERSONA.maskedName,
      clientNameFull: DEMO_CLIENT_PERSONA.name,
      clientWhatsapp: DEMO_CLIENT_PERSONA.phone,
      origin: 'Matching Local',
      photosAttached: 0,
      expiresInMinutes: 30,
      status: 'pendente',
    };
    setRequests((prev) => [nextReq, ...prev]);
    setOpportunities((prev) => [nextOpp, ...prev]);
    registerBlockedEvent('whatsapp_real');
  };

  const handleAcceptDemoOpportunity = (oppId: string) => {
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === oppId
          ? {
              ...o,
              status: 'aceita',
            }
          : o
      )
    );
    registerBlockedEvent('email_real');
  };

  const handleReferSubstituteOpportunity = (oppId: string) => {
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === oppId
          ? {
              ...o,
              status: 'substituto_indicado',
            }
          : o
      )
    );
  };

  const handleSubmitDemoReview = (e: React.FormEvent) => {
    e.preventDefault();
    setProviders((prev) =>
      prev.map((p, idx) =>
        idx === 0
          ? {
              ...p,
              reviewsCount: p.reviewsCount + 1,
              completedJobs: p.completedJobs + 1,
              ratingAvg: Number(
                ((p.ratingAvg * p.reviewsCount + reviewScore) /
                  (p.reviewsCount + 1)).toFixed(2)
              ),
              reviews: [
                {
                  id: `demo-rev-${Date.now()}`,
                  clientName: DEMO_CLIENT_PERSONA.maskedName,
                  neighborhood: 'Pinheiros',
                  date: 'Agora · Demo',
                  serviceTitle: requests[0]?.problemTitle || '[DEMO] Serviço',
                  rating: reviewScore,
                  criteria: {
                    qualidade: reviewScore,
                    pontualidade: reviewScore,
                    comunicacao: reviewScore,
                    organizacao: reviewScore,
                  },
                  wouldRecommend: reviewScore >= 4,
                  comment: reviewComment,
                },
                ...p.reviews,
              ],
            }
          : p
      )
    );
    setReviewSubmitted(true);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* CABEÇALHO DO SANDBOX /DEMO */}
      <section className="bg-brand-primary text-white rounded-3xl p-6 sm:p-8 shadow-lg space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400 text-brand-ink font-display font-bold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{DEMO_SANDBOX_BADGE_TEXT}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateUrl('/criar-conta')}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-display font-semibold text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Ir para cadastro real</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2 max-w-3xl">
          <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight">
            Explore o Recontrate sem criar conta
          </h1>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Simulação interativa 100% em memória com{' '}
            <strong>dados fictícios</strong> (<code>@demo.confiare.invalid</code>{' '}
            e telefones <code>(11) 90000-...</code>). Nenhuma cobrança real,
            WhatsApp, e-mail ou webhook é disparado nesta página.
          </p>
        </div>

        {/* BOTÕES DE TROCA DE VISÃO */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setPerspective('cliente')}
            className={`min-h-[42px] px-4 py-2 rounded-xl font-display font-semibold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors ${
              perspective === 'cliente'
                ? 'bg-brand-accent-strong text-white shadow'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Ver como cliente</span>
          </button>

          <button
            type="button"
            onClick={() => setPerspective('prestador')}
            className={`min-h-[42px] px-4 py-2 rounded-xl font-display font-semibold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors ${
              perspective === 'prestador'
                ? 'bg-brand-accent-strong text-white shadow'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Ver como prestador</span>
          </button>

          <button
            type="button"
            onClick={() => setPerspective('admin')}
            className={`min-h-[42px] px-4 py-2 rounded-xl font-display font-semibold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors ${
              perspective === 'admin'
                ? 'bg-brand-accent-strong text-white shadow'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Ver painel administrativo</span>
          </button>
        </div>
      </section>

      {/* FAIXA DE PROTEÇÕES ATIVAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-white rounded-2xl p-3.5 border border-brand-primary/10 flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-brand-ink">Cadastro real</p>
            <p className="text-[11px] text-brand-ink/65">Bloqueado no sandbox</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-3.5 border border-brand-primary/10 flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-brand-ink">Cobrança / Gateway</p>
            <p className="text-[11px] text-brand-ink/65">Desabilitado no demo</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-3.5 border border-brand-primary/10 flex items-center gap-2.5">
          <PhoneOff className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-brand-ink">WhatsApp & E-mail</p>
            <p className="text-[11px] text-brand-ink/65">Envio real suprimido</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-3.5 border border-brand-primary/10 flex items-center gap-2.5">
          <MessageSquareOff className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-brand-ink">Webhooks reais</p>
            <p className="text-[11px] text-brand-ink/65">Bloqueados no demo</p>
          </div>
        </div>
      </div>

      {/* VISÃO 1: CLIENTE */}
      {perspective === 'cliente' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Nova Solicitação + Avaliação */}
          <div className="lg:col-span-5 space-y-6">
            <form
              onSubmit={handleCreateDemoRequest}
              className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-brand-ink">
                  1. Solicitar Serviço (Demo)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-[11px]">
                  Fictício
                </span>
              </div>
              <p className="text-brand-ink/70">
                Logado simbolicamente como <strong>{DEMO_CLIENT_PERSONA.name}</strong>{' '}
                (<code>{DEMO_CLIENT_PERSONA.email}</code>).
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-brand-ink">Categoria</label>
                <select
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value as CategoryName)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 bg-white text-sm"
                >
                  <option value="Eletricista">Elétrica (Eletricista)</option>
                  <option value="Diarista">Diarista e limpeza</option>
                  <option value="Encanador">Hidráulica</option>
                  <option value="Pintor">Pintura</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-brand-ink">
                  O que precisa resolver?
                </label>
                <input
                  type="text"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-brand-ink">Bairro</label>
                <input
                  type="text"
                  value={reqNeighborhood}
                  onChange={(e) => setReqNeighborhood(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[42px] px-4 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold cursor-pointer"
              >
                Simular solicitação e gerar matching
              </button>
            </form>

            {/* Avaliação simulada */}
            <form
              onSubmit={handleSubmitDemoReview}
              className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-3 text-xs"
            >
              <h3 className="font-display font-bold text-base text-brand-ink">
                4. Avaliar Atendimento (Demo)
              </h3>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-brand-ink">Nota geral:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReviewScore(n)}
                    className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                      reviewScore === n
                        ? 'bg-brand-accent-strong text-white'
                        : 'bg-brand-background text-brand-ink'
                    }`}
                  >
                    {n}★
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/15 text-xs"
              />
              <button
                type="submit"
                className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-brand-primary text-white font-semibold cursor-pointer"
              >
                Enviar avaliação simulada
              </button>
              {reviewSubmitted && (
                <p className="text-emerald-700 font-medium">
                  Avaliação fictícia aplicada em memória! Confira a atualização no ranking ao lado.
                </p>
              )}
            </form>
          </div>

          {/* Matching + Indicação de Substituto */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display font-bold text-base text-brand-ink">
                  2. Matching por Reputação (Sem Leilão · Dados Fictícios)
                </h2>
                <span className="text-xs font-mono text-brand-ink/60">
                  {requests.length} solicitação(ões) demo
                </span>
              </div>

              <div className="space-y-3">
                {rankedProviders.map((prov) => (
                  <div
                    key={prov.id}
                    className="p-4 rounded-2xl bg-brand-background/70 border border-brand-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-bold text-sm text-brand-ink">
                          {prov.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white text-[11px] font-semibold text-brand-ink">
                          {prov.plan}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          {prov.ratingAvg} ({prov.reviewsCount})
                        </span>
                      </div>
                      <p className="text-xs text-brand-ink/75">{prov.bio}</p>
                      <p className="text-[11px] font-mono text-brand-ink/60">
                        Especialidades: {prov.specialties.join(' · ')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-block px-3 py-1 rounded-xl bg-brand-primary text-white font-mono text-xs">
                        Score {calculateCompositeScore(prov).totalScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Indicação de Substituto */}
            <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-brand-ink">
                  5. Indicação Rastreável de Substituto (Demo)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-semibold">
                  {referral.clientAcceptedProviderId ? 'Aceita (Demo)' : 'Aguardando cliente'}
                </span>
              </div>
              <p className="text-brand-ink/75">
                <strong>João Batista (Demo)</strong> não tem agenda para{' '}
                <em>{referral.serviceContext}</em> e indicou{' '}
                <strong>Carlos Mendes (Demo)</strong>: "{referral.customNote}"
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setReferral((prev) => ({
                      ...prev,
                      clientAcceptedProviderId: 'demo-prov-carlos',
                    }))
                  }
                  className="px-4 py-2 rounded-xl bg-brand-link text-white font-semibold cursor-pointer"
                >
                  Aceitar substituto fictício (1 clique)
                </button>
                <button
                  type="button"
                  onClick={() => registerBlockedEvent('cadastro_real')}
                  className="px-4 py-2 rounded-xl border border-brand-primary/20 text-brand-ink font-semibold cursor-pointer"
                >
                  Testar bloqueio de cadastro real
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISÃO 2: PRESTADOR */}
      {perspective === 'prestador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-primary text-white font-display font-bold flex items-center justify-center">
                JB
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-brand-ink">
                  João Batista (Demo)
                </h2>
                <p className="text-brand-ink/65">
                  Plano Premium (Fictício) · Pinheiros
                </p>
              </div>
            </div>
            <p className="text-brand-ink/75">
              Painel simulado mostrando oportunidades sem leilão, proteção LGPD
              de contato e bloqueio de cobrança/WhatsApp real.
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => registerBlockedEvent('cobranca_gateway')}
                className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold cursor-pointer"
              >
                Simular tentativa de assinatura/cobrança (bloqueado)
              </button>
              <button
                type="button"
                onClick={() => registerBlockedEvent('whatsapp_real')}
                className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold cursor-pointer"
              >
                Simular disparo de WhatsApp real (bloqueado)
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4">
            <h2 className="font-display font-bold text-base text-brand-ink">
              3. Oportunidades Recebidas no Painel do Prestador (Demo)
            </h2>
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="p-4 rounded-2xl bg-brand-background/75 border border-brand-primary/10 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-brand-ink">{opp.title}</strong>
                    <span className="px-2.5 py-0.5 rounded-full bg-white font-mono text-[11px] text-brand-ink">
                      Status: {opp.status}
                    </span>
                  </div>
                  <p className="text-brand-ink/75">{opp.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-brand-ink/70">
                    <span>Bairro: {opp.neighborhood}</span>
                    <span>
                      Cliente:{' '}
                      {opp.status === 'aceita'
                        ? `${opp.clientNameFull} · ${opp.clientWhatsapp}`
                        : `${opp.clientNameMasked} (contato oculto até aceite LGPD)`}
                    </span>
                  </div>
                  {opp.status === 'pendente' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAcceptDemoOpportunity(opp.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold cursor-pointer"
                      >
                        Aceitar oportunidade e liberar contato demo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReferSubstituteOpportunity(opp.id)}
                        className="px-4 py-2 rounded-xl bg-white border border-brand-primary/15 text-brand-ink font-semibold cursor-pointer"
                      >
                        Indicar substituto (Carlos Demo)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VISÃO 3: ADMINISTRADOR */}
      {perspective === 'admin' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-white rounded-2xl p-5 border border-brand-primary/10">
              <p className="text-brand-ink/60">[DEMO] Prestadores Fictícios</p>
              <p className="font-display font-bold text-2xl text-brand-ink mt-1">
                {providers.length}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-brand-primary/10">
              <p className="text-brand-ink/60">[DEMO] Solicitações Simuladas</p>
              <p className="font-display font-bold text-2xl text-brand-ink mt-1">
                {requests.length}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-brand-primary/10">
              <p className="text-brand-ink/60">[DEMO] Promoção 90 Dias Grátis</p>
              <p className="font-display font-bold text-2xl text-brand-accent-strong mt-1">
                R$ 0,00 (3 primeiros meses)
              </p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-brand-primary/10">
              <p className="text-brand-ink/60">[DEMO] Cobranças Reais</p>
              <p className="font-display font-bold text-2xl text-emerald-700 mt-1">
                0 (Bloqueadas)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4 text-xs">
              <h2 className="font-display font-bold text-base text-brand-ink">
                Moderação de Especialidades Sugeridas (Sandbox)
              </h2>
              <div className="space-y-3">
                {suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-3.5 rounded-2xl bg-brand-background/75 border border-brand-primary/10 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-brand-ink">
                        {sug.suggestedName}
                      </p>
                      <p className="text-[11px] text-brand-ink/65">
                        {sug.categoryName} · {sug.providerName} · Status:{' '}
                        <strong>{sug.status}</strong>
                      </p>
                    </div>
                    {sug.status === 'pendente' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSuggestions((prev) =>
                              prev.map((item) =>
                                item.id === sug.id
                                  ? { ...item, status: 'aprovada' }
                                  : item
                              )
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSuggestions((prev) =>
                              prev.map((item) =>
                                item.id === sug.id
                                  ? { ...item, status: 'reprovada' }
                                  : item
                              )
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold cursor-pointer"
                        >
                          Reprovar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4 text-xs">
              <h2 className="font-display font-bold text-base text-brand-ink">
                Simulador de Bloqueios Obrigatórios (/demo)
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => registerBlockedEvent('cadastro_real')}
                  className="px-3 py-1.5 rounded-xl bg-brand-background hover:bg-brand-surface-hover font-semibold cursor-pointer"
                >
                  Testar Cadastro Real
                </button>
                <button
                  type="button"
                  onClick={() => registerBlockedEvent('cobranca_gateway')}
                  className="px-3 py-1.5 rounded-xl bg-brand-background hover:bg-brand-surface-hover font-semibold cursor-pointer"
                >
                  Testar Cobrança Asaas
                </button>
                <button
                  type="button"
                  onClick={() => registerBlockedEvent('whatsapp_real')}
                  className="px-3 py-1.5 rounded-xl bg-brand-background hover:bg-brand-surface-hover font-semibold cursor-pointer"
                >
                  Testar WhatsApp Real
                </button>
                <button
                  type="button"
                  onClick={() => registerBlockedEvent('webhook_real')}
                  className="px-3 py-1.5 rounded-xl bg-brand-background hover:bg-brand-surface-hover font-semibold cursor-pointer"
                >
                  Testar Webhook Real
                </button>
              </div>
              <p className="text-brand-ink/65">
                Todas as integrações externas reais permanecem bloqueadas no backend e no frontend durante a demonstração.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LOG LOCAL DE BLOQUEIOS EXECUTADOS */}
      {blockedLog.length > 0 && (
        <div
          role="region"
          aria-label="Registro de bloqueios do modo demonstração"
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs text-amber-950"
        >
          <p className="font-display font-bold flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-700" />
            <span>Ações reais bloqueadas na sessão de demonstração:</span>
          </p>
          <ul className="space-y-1">
            {blockedLog.map((entry, idx) => (
              <li key={`${entry.channel}-${idx}`} className="font-mono text-[11px]">
                [{entry.timestamp}] ({entry.channel}) {entry.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
