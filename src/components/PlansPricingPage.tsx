import React, { useEffect, useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  calculateAnnualMonthlyEquivalentCentavos,
  calculateAnnualSavingsCentavos,
  formatCentavosBRL,
  type PlanPricingDisplay,
} from '../utils/pricingCalculations';

export type BillingCycleOption = 'mensal' | 'anual';

const DEFAULT_OFFICIAL_PLANS: PlanPricingDisplay[] = [
  {
    id: 'plan-gratuito',
    slug: 'gratuito',
    nome: 'Gratuito',
    descricao:
      'Perfil público básico, contato por WhatsApp e limite explícito de até 5 oportunidades por mês com anúncios moderados no painel.',
    precoMensalCentavos: 0,
    precoAnualCentavos: 0,
    limiteOportunidadesMensal: 5,
    prioridadeMatching: 0,
    prioridadeLabel: 'Padrão',
    permiteDestaque: false,
    permiteRelatoriosAvancados: false,
    permitePortfolioIlimitado: false,
    limiteFotosPortfolio: 5,
    suportePrioritario: false,
    selo: null,
    exibeAnuncios: true,
    ordemExibicao: 1,
  },
  {
    id: 'plan-essencial',
    slug: 'essencial',
    nome: 'Essencial',
    descricao:
      'Plano inicial com perfil profissional completo, portfólio com até 10 fotos, até 15 oportunidades por mês e painel sem anúncios.',
    precoMensalCentavos: 2990,
    precoAnualCentavos: 29900,
    limiteOportunidadesMensal: 15,
    prioridadeMatching: 2,
    prioridadeLabel: 'Leve',
    permiteDestaque: false,
    permiteRelatoriosAvancados: false,
    permitePortfolioIlimitado: false,
    limiteFotosPortfolio: 10,
    suportePrioritario: false,
    selo: 'Essencial',
    exibeAnuncios: false,
    ordemExibicao: 2,
  },
  {
    id: 'plan-profissional',
    slug: 'profissional',
    nome: 'Profissional',
    descricao:
      'Plano principal sugerido: portfólio ilimitado, até 40 oportunidades por mês, estatísticas de resposta/conversão e selo Profissional Recontrate.',
    precoMensalCentavos: 5990,
    precoAnualCentavos: 59900,
    limiteOportunidadesMensal: 40,
    prioridadeMatching: 5,
    prioridadeLabel: 'Média',
    permiteDestaque: true,
    permiteRelatoriosAvancados: false,
    permitePortfolioIlimitado: true,
    limiteFotosPortfolio: null,
    suportePrioritario: false,
    selo: 'Profissional Recontrate',
    exibeAnuncios: false,
    ordemExibicao: 3,
  },
  {
    id: 'plan-premium',
    slug: 'premium',
    nome: 'Premium',
    descricao:
      'Em definição: reservado para entregáveis premium mensuráveis (gestão avançada e relatórios dedicados de divulgação) antes da liberação.',
    precoMensalCentavos: 9990,
    precoAnualCentavos: 99900,
    limiteOportunidadesMensal: 100,
    prioridadeMatching: 8,
    prioridadeLabel: 'Em definição',
    permiteDestaque: true,
    permiteRelatoriosAvancados: true,
    permitePortfolioIlimitado: true,
    limiteFotosPortfolio: null,
    suportePrioritario: true,
    selo: 'Em definição',
    exibeAnuncios: false,
    ordemExibicao: 4,
  },
];

const PLAN_BULLETS: Record<string, string[]> = {
  gratuito: [
    'Limite explícito: até 5 oportunidades/mês',
    'Perfil público básico com especialidades',
    'Contato direto por WhatsApp',
    'Histórico de recontratação e avaliações visíveis',
    'Exibição moderada de anúncios no painel interno',
    'Sem promessa de destaque ou volume de pedidos',
  ],
  essencial: [
    'Limite explícito: até 15 oportunidades/mês',
    'Perfil profissional completo',
    'Portfólio com até 10 fotos de serviços',
    'Relatório mensal básico no painel',
    'Painel interno sem anúncios',
    '0% comissão sobre serviços e R$ 0 por lead',
  ],
  profissional: [
    'Limite explícito: até 40 oportunidades/mês',
    'Portfólio ilimitado de serviços realizados',
    'Estatísticas de tempo de resposta e conversão',
    'Ferramenta de indicação de substituto com histórico',
    'Selo de identificação "Profissional Recontrate"',
    'Elegível ao piloto gratuito de 60 a 90 dias',
  ],
  premium: [
    'Status atual: Em definição (não comercializado no piloto)',
    'Preço de referência planejado: R$ 99,90/mês',
    'Escopo em validação: gestão avançada e relatórios',
    'Sem promessa de "mais leads" sem evidência operacional',
    'Aguardando validação de entregáveis mensuráveis',
  ],
};

const PLAN_CTA_LABELS: Record<string, string> = {
  gratuito: 'Começar no Gratuito',
  essencial: 'Solicitar vaga no Piloto (Essencial)',
  profissional: 'Solicitar vaga no Piloto (Profissional)',
  premium: 'Plano em definição',
};

export const BillingCycleToggle: React.FC<{
  cycle: BillingCycleOption;
  onChange: (cycle: BillingCycleOption) => void;
}> = ({ cycle, onChange }) => {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        role="group"
        aria-label="Ciclo de cobrança"
        className="inline-flex items-center p-1.5 rounded-2xl bg-brand-primary/5 border border-brand-primary/10"
      >
        <button
          type="button"
          onClick={() => onChange('mensal')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-display font-semibold transition-all cursor-pointer ${
            cycle === 'mensal'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-brand-ink/75 hover:text-brand-ink'
          }`}
        >
          Ciclo Mensal (Referência)
        </button>
        <button
          type="button"
          onClick={() => onChange('anual')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-display font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            cycle === 'anual'
              ? 'bg-brand-accent-strong text-white shadow-sm'
              : 'text-brand-ink/75 hover:text-brand-ink'
          }`}
        >
          <span>Ciclo Anual (Equivalente a 10 meses)</span>
        </button>
      </div>

      <p className="text-xs text-brand-ink/75">
        Proposta de preço de teste pré-lançamento · Checkout desativado durante o piloto controlado
      </p>
    </div>
  );
};

export interface LaunchOfferCardState {
  eligible: boolean;
  promoPricesCentavos: Record<string, number>;
  fullPricesCentavos: Record<string, number>;
  durationCycles: number;
  fullPriceStartDate?: string;
}

export const PlanCard: React.FC<{
  plan: PlanPricingDisplay;
  cycle: BillingCycleOption;
  launchOffer?: LaunchOfferCardState | null;
  onSelectPlan: (planSlug: string, cycle: BillingCycleOption) => void;
}> = ({ plan, cycle, onSelectPlan }) => {
  const isProfissional = plan.slug === 'profissional';
  const isPremium = plan.slug === 'premium';
  const monthlyEquivalent = calculateAnnualMonthlyEquivalentCentavos(
    plan.precoAnualCentavos
  );
  const annualSavings = calculateAnnualSavingsCentavos(
    plan.precoMensalCentavos,
    plan.precoAnualCentavos
  );
  const bullets = PLAN_BULLETS[plan.slug] || [];
  const ctaLabel =
    PLAN_CTA_LABELS[plan.slug] || `Participar do Piloto (${plan.nome})`;

  return (
    <div
      className={`rounded-3xl p-6 flex flex-col justify-between gap-5 border transition-all ${
        isProfissional
          ? 'bg-brand-primary text-white border-brand-accent-strong ring-2 ring-brand-accent-strong/30 shadow-lg'
          : isPremium
            ? 'bg-brand-background/70 text-brand-ink border-brand-primary/15 border-dashed'
            : 'bg-white text-brand-ink border-brand-primary/10'
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 min-h-[26px]">
          <h2 className="font-display font-bold text-lg">{plan.nome}</h2>
          {isProfissional && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-accent-strong text-white text-[11px] font-bold">
              <Sparkles className="w-3 h-3" />
              Plano principal sugerido
            </span>
          )}
          {isPremium && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
              <Clock className="w-3 h-3" />
              Em definição
            </span>
          )}
        </div>

        {/* Preço cheio e regras de piloto sempre visíveis */}
        <div className="space-y-1">
          {cycle === 'mensal' ? (
            <>
              <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                <span className="text-2xl sm:text-3xl font-bold whitespace-nowrap">
                  {plan.precoMensalCentavos === 0
                    ? 'R$ 0'
                    : formatCentavosBRL(plan.precoMensalCentavos)}
                </span>
                <span
                  className={`text-xs whitespace-nowrap ${
                    isProfissional ? 'text-white/75' : 'text-brand-ink/65'
                  }`}
                >
                  /mês
                </span>
              </div>
              <p
                className={`text-[11px] font-semibold ${
                  isProfissional
                    ? 'text-brand-accent-contrast'
                    : 'text-brand-link'
                }`}
              >
                {plan.precoMensalCentavos === 0
                  ? 'Sem cartão · Uso contínuo dentro do limite'
                  : isPremium
                    ? 'Preço cheio de referência · Escopo em definição'
                    : 'Piloto: 60 a 90 dias grátis · Sem conversão automática'}
              </p>
              {plan.precoMensalCentavos > 0 && !isPremium && (
                <p
                  className={`text-[11px] ${
                    isProfissional ? 'text-white/80' : 'text-brand-ink/70'
                  }`}
                >
                  Após o piloto, adesão opcional por{' '}
                  {formatCentavosBRL(plan.precoMensalCentavos)}/mês · Cancelamento
                  livre sem taxa adicional
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1 font-mono tabular-nums">
                <span className="text-2xl sm:text-3xl font-bold">
                  {plan.precoAnualCentavos === 0
                    ? 'R$ 0'
                    : formatCentavosBRL(plan.precoAnualCentavos)}
                </span>
                <span
                  className={`text-xs ${
                    isProfissional ? 'text-white/70' : 'text-brand-ink/60'
                  }`}
                >
                  /ano
                </span>
              </div>
              {plan.precoAnualCentavos > 0 ? (
                <div className="space-y-0.5 text-[11px]">
                  <p
                    className={`font-semibold ${
                      isProfissional
                        ? 'text-brand-accent-contrast'
                        : 'text-brand-link'
                    }`}
                  >
                    Equivale a {formatCentavosBRL(monthlyEquivalent)}/mês (economize{' '}
                    {formatCentavosBRL(annualSavings)}/ano)
                  </p>
                  <p
                    className={
                      isProfissional ? 'text-white/80' : 'text-brand-ink/70'
                    }
                  >
                    Preço de teste pré-lançamento · Sem cobrança ativa no preview
                  </p>
                </div>
              ) : (
                <p
                  className={`text-[11px] ${
                    isProfissional ? 'text-white/75' : 'text-brand-ink/65'
                  }`}
                >
                  Sem custo fixo
                </p>
              )}
            </>
          )}
        </div>

        <ul className="space-y-2.5 text-xs pt-2 border-t border-current/10">
          {bullets.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isProfissional
                    ? 'text-brand-accent-contrast'
                    : 'text-emerald-600'
                }`}
              />
              <span
                className={
                  isProfissional ? 'text-white/90' : 'text-brand-ink/85'
                }
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        disabled={isPremium}
        onClick={() => onSelectPlan(plan.slug, cycle)}
        className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl font-display font-semibold text-xs transition-colors ${
          isPremium
            ? 'bg-brand-primary/10 text-brand-ink/50 cursor-not-allowed'
            : isProfissional
              ? 'bg-brand-accent-strong hover:bg-brand-accent-hover text-white cursor-pointer'
              : plan.slug === 'gratuito'
                ? 'bg-brand-background hover:bg-brand-surface-hover text-brand-ink cursor-pointer'
                : 'bg-brand-primary hover:bg-brand-primary-hover text-white cursor-pointer'
        }`}
      >
        {ctaLabel}
      </button>
    </div>
  );
};

export const PlansComparisonTable: React.FC<{
  plans: PlanPricingDisplay[];
}> = ({ plans }) => {
  const rows: Array<{
    label: string;
    render: (p: PlanPricingDisplay) => string;
  }> = [
    {
      label: 'Status na fase atual',
      render: (p) =>
        p.slug === 'premium' ? 'Em definição' : 'Disponível no piloto',
    },
    {
      label: 'Limite de oportunidades/mês',
      render: (p) =>
        p.slug === 'premium'
          ? 'Em definição'
          : `Até ${p.limiteOportunidadesMensal} / mês`,
    },
    {
      label: 'Comissão sobre serviços / custo por lead',
      render: () => '0% comissão · R$ 0 por lead',
    },
    {
      label: 'Perfil profissional',
      render: (p) => (p.slug === 'gratuito' ? 'Básico' : 'Completo'),
    },
    {
      label: 'Portfólio de fotos',
      render: (p) =>
        p.permitePortfolioIlimitado
          ? 'Ilimitado'
          : `Até ${p.limiteFotosPortfolio ?? 5} fotos`,
    },
    {
      label: 'Relatórios e métricas no painel',
      render: (p) => {
        if (p.slug === 'premium') return 'Em definição';
        if (p.slug === 'profissional') return 'Resposta e conversão';
        if (p.slug === 'essencial') return 'Mensal básico';
        return 'Básico';
      },
    },
    {
      label: 'Anúncios no painel do prestador',
      render: (p) =>
        p.exibeAnuncios ? 'Moderados no painel' : 'Sem anúncios',
    },
    {
      label: 'Selo de perfil',
      render: (p) => p.selo || 'Nenhum',
    },
    {
      label: 'Preço cheio mensal (referência)',
      render: (p) => formatCentavosBRL(p.precoMensalCentavos),
    },
    {
      label: 'Conversão após o piloto (60–90 dias)',
      render: (p) =>
        p.precoMensalCentavos === 0
          ? 'Permanece gratuito'
          : 'Sem conversão automática (escolha consciente)',
    },
  ];

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-5">
      <div>
        <p className="text-xs font-semibold text-brand-link">
          Transparência Total · Estrutura Pré-Lançamento
        </p>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
          Comparativo de recursos e limites reais
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-brand-primary/10 text-brand-ink">
              <th className="py-3 pr-4 font-display font-bold">Critério</th>
              {plans.map((p) => (
                <th
                  key={p.slug}
                  className={`py-3 px-3 font-display font-bold whitespace-nowrap ${
                    p.slug === 'profissional' ? 'text-brand-accent-strong' : ''
                  }`}
                >
                  {p.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-primary/10">
            {rows.map((row) => (
              <tr key={row.label} className="hover:bg-brand-background/40">
                <td className="py-3 pr-4 font-semibold text-brand-ink whitespace-nowrap">
                  {row.label}
                </td>
                {plans.map((p) => (
                  <td
                    key={`${row.label}-${p.slug}`}
                    className={`py-3 px-3 whitespace-nowrap ${
                      p.slug === 'profissional'
                        ? 'font-semibold text-brand-ink'
                        : 'text-brand-ink/80'
                    }`}
                  >
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export interface LoggedProviderContext {
  providerProfileId: string;
  fullName: string;
  email: string;
  phone?: string;
}

export const PlansPricingPage: React.FC<{
  onNavigateUrl: (path: string) => void;
  isLoggedProvider?: boolean;
  providerContext?: LoggedProviderContext | null;
}> = ({ onNavigateUrl, isLoggedProvider, providerContext }) => {
  const [plans, setPlans] = useState<PlanPricingDisplay[]>(
    DEFAULT_OFFICIAL_PLANS
  );
  const [cycle, setCycle] = useState<BillingCycleOption>('mensal');
  const [subSummary, setSubSummary] = useState<any>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.ok && Array.isArray(body.plans) && body.plans.length > 0) {
          // Filtra "padrinho" da lista de planos pagos para apresentá-lo como Programa separado
          const filtered = body.plans
            .filter((plan: PlanPricingDisplay) => plan.slug !== 'padrinho')
            .map((plan: PlanPricingDisplay) => ({
              ...plan,
              descricao:
                plan.slug === 'premium'
                  ? 'Em definição: reservado para entregáveis premium mensuráveis antes da liberação.'
                  : plan.descricao.replace(/Confiare/g, 'Recontrate'),
              selo:
                plan.slug === 'premium'
                  ? 'Em definição'
                  : (plan.selo?.replace(/Confiare/g, 'Recontrate') ?? null),
            }));
          if (filtered.length > 0) {
            setPlans(filtered);
          }
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!providerContext?.providerProfileId) return;
    fetch(
      `/api/providers/${encodeURIComponent(providerContext.providerProfileId)}/subscription`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.ok) {
          setSubSummary(body);
        }
      })
      .catch(() => null);
  }, [providerContext?.providerProfileId]);

  const handleSelectPlan = (
    planSlug: string,
    selectedCycle: BillingCycleOption
  ) => {
    if (planSlug === 'premium') {
      setActionFeedback({
        type: 'error',
        message:
          'O plano Premium (R$ 99,90/mês) está em definição e bloqueado para adesão até a validação dos entregáveis.',
      });
      return;
    }

    if (!isLoggedProvider || !providerContext?.providerProfileId) {
      onNavigateUrl(
        `/criar-conta?role=prestador&plan=${encodeURIComponent(planSlug)}&cycle=${selectedCycle}`
      );
      return;
    }

    setActionFeedback({
      type: 'success',
      message:
        planSlug === 'gratuito'
          ? 'Plano Gratuito selecionado no ambiente de preview (sem custo fixo).'
          : `Interesse no plano ${planSlug.toUpperCase()} (${selectedCycle}) registrado em modo Piloto Controlado (60 a 90 dias gratuitos, sem cartão e sem cobrança automática no preview).`,
    });
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Cabeçalho + Oferta de Piloto Controlado */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-brand-primary/10 text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>
            Proposta pré-lançamento (preços de teste) · 0% comissão sobre serviços e R$ 0 por lead
          </span>
        </div>

        <div className="max-w-3xl mx-auto space-y-2">
          <h1 className="font-display font-bold text-2xl sm:text-4xl text-brand-ink">
            Planos transparentes e Piloto Controlado sem conversão automática
          </h1>
          <p className="text-xs sm:text-base text-brand-ink/75">
            Os valores abaixo representam a estrutura provisória para configurar o produto. Nesta fase de validação, o checkout financeiro está desativado e a turma inicial participa do piloto gratuito.
          </p>
        </div>

        <BillingCycleToggle cycle={cycle} onChange={setCycle} />

        {/* Oferta de Piloto Controlado (substitui desconto automático de 50%) */}
        <div className="max-w-4xl mx-auto p-5 rounded-2xl bg-brand-background/80 border border-brand-primary/15 text-left space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-display font-bold text-sm text-brand-primary">
              <Sparkles className="w-4 h-4 text-brand-accent-strong" />
              Oferta de Piloto Controlado (Turma Inicial de Profissionais)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-primary font-semibold">
              60 a 90 dias gratuitos · Sem cartão
            </span>
          </div>
          <p className="text-brand-ink/80 leading-relaxed">
            Em vez de promoções com cobrança automática escondida, oferecemos de <strong>60 a 90 dias de acesso gratuito</strong> para uma turma inicial controlada de profissionais, sem exigir cartão de crédito e <strong>sem conversão automática para assinatura paga</strong>. Ao fim do piloto, você escolhe conscientemente se deseja assinar pelo preço cheio informado ou continuar no plano Gratuito.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-brand-primary/10 text-[11px] text-brand-ink/75">
            <div>
              <strong>Ciclo e cobrança:</strong> Mensal (ou anual opcional), informada antes da adesão.
            </div>
            <div>
              <strong>Após o piloto:</strong> Escolha manual do profissional; nunca debitamos automaticamente.
            </div>
            <div>
              <strong>Cancelamento:</strong> Simples a qualquer momento no painel, sem multa ou fidelidade.
            </div>
            <div>
              <strong>Taxas extras:</strong> Ausência total de taxa adicional, comissão ou venda de lead.
            </div>
          </div>
        </div>

        {isLoggedProvider && providerContext && (
          <div className="max-w-4xl mx-auto pt-3 border-t border-brand-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-left text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold text-brand-ink">
                Configuração atual no preview:{' '}
                <span className="text-brand-accent-strong">
                  {subSummary?.plan?.nome || 'Gratuito'}
                </span>{' '}
                (Checkout real desativado no ambiente de preview)
              </p>
            </div>
          </div>
        )}

        {actionFeedback && (
          <div
            role="status"
            className={`max-w-3xl mx-auto p-3.5 rounded-2xl text-xs font-medium ${
              actionFeedback.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            }`}
          >
            <p>{actionFeedback.message}</p>
          </div>
        )}
      </section>

      {/* Cards dos 4 Planos (Gratuito -> Essencial -> Profissional -> Premium [Em definição]) */}
      <section aria-label="Planos de Assinatura">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              cycle={cycle}
              onSelectPlan={handleSelectPlan}
            />
          ))}
        </div>
      </section>

      {/* PROGRAMA PADRINHO — APRESENTADO COMO PROGRAMA SEPARADO, NÃO PLANO PAGO DUPLICADO */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold">
              <Award className="w-4 h-4 text-brand-accent-strong" />
              <span>Programa Institucional Separado · Sem Cobrança de Plano Extra</span>
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
              Programa Padrinho Recontrate (Mentoria e Indicação de Confiança)
            </h2>
            <p className="text-xs sm:text-sm text-brand-ink/75 leading-relaxed">
              O papel de <strong>Padrinho</strong> não é um plano pago separado pelo preço do Premium. Trata-se de um programa de reconhecimento e responsabilidade comunitária para profissionais verificados que acumulam histórico consistente de bons atendimentos e desejam apadrinhar novos colegas na plataforma.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateUrl('/demo')}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink text-xs font-semibold shrink-0 cursor-pointer"
          >
            Ver funcionamento na demonstração →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1">
            <p className="font-bold text-brand-ink">Elegibilidade por mérito</p>
            <p className="text-brand-ink/75">
              Concedido a profissionais com histórico validado, avaliações consistentes e compromisso técnico — nunca vendido como upgrade financeiro avulso.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1">
            <p className="font-bold text-brand-ink">Código de Mentoria e Vínculo Transparente</p>
            <p className="text-brand-ink/75">
              O profissional apadrinhado exibe quem o indicou, facilitando o início na rede com supervisão e corresponsabilidade reputacional.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1">
            <p className="font-bold text-brand-ink">Continuidade em Substituições</p>
            <p className="text-brand-ink/75">
              Facilita a indicação de colegas de confiança quando a agenda do titular está lotada, sempre com decisão final do cliente.
            </p>
          </div>
        </div>
      </section>

      {/* Comparativo de Recursos */}
      <PlansComparisonTable plans={plans} />

      {/* FAQ de Cobrança e Piloto */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-5">
        <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
          Perguntas frequentes sobre planos, piloto e cancelamento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-accent-strong" />
              Como funciona o piloto de 60 a 90 dias sem conversão automática?
            </h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Profissionais participantes da turma inicial utilizam os recursos sem cadastrar cartão de crédito. Ao final do piloto, nenhuma cobrança é gerada automaticamente: você decide se quer assinar ou seguir no plano Gratuito.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-accent-strong" />
              Se eu cancelar uma assinatura futura, perco meu acesso na hora?
            </h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Não. O cancelamento interrompe apenas a próxima renovação mensal, sem multa, mantendo os recursos contratados até o último dia do período já pago e preservando seu histórico de clientes para recontratação.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-accent-strong" />
              Por que o plano Premium aparece como "Em definição"?
            </h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Porque não comercializamos planos superiores sem entregáveis operacionais validados. O plano Premium permanecerá bloqueado até que ferramentas avançadas de gestão e relatórios dedicados estejam prontas e testadas.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-accent-strong" />
              Onde os anúncios são exibidos?
            </h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Apenas no painel interno de prestadores do plano Gratuito, de forma moderada. Clientes nunca veem anúncios e os planos Essencial e Profissional são livres de publicidade no painel.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
