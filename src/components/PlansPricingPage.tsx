import React, { useEffect, useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
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
      'Perfil público básico, contato por WhatsApp e até 5 oportunidades por mês com anúncios moderados no painel.',
    precoMensalCentavos: 0,
    precoAnualCentavos: 0,
    limiteOportunidadesMensal: 5,
    prioridadeMatching: 0,
    prioridadeLabel: 'Baixa',
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
      'Perfil profissional completo, portfólio com até 10 fotos, prioridade leve, relatório mensal básico e sem anúncios.',
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
      'Prioridade média, destaque em buscas locais, portfólio ilimitado, estatísticas de resposta e selo Profissional Confiare.',
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
    selo: 'Profissional Confiare',
    exibeAnuncios: false,
    ordemExibicao: 3,
  },
  {
    id: 'plan-premium',
    slug: 'premium',
    nome: 'Premium',
    descricao:
      'Prioridade alta, destaque regional e por categoria, relatórios avançados, suporte prioritário e selo Top Confiare.',
    precoMensalCentavos: 9990,
    precoAnualCentavos: 99900,
    limiteOportunidadesMensal: 100,
    prioridadeMatching: 8,
    prioridadeLabel: 'Alta',
    permiteDestaque: true,
    permiteRelatoriosAvancados: true,
    permitePortfolioIlimitado: true,
    limiteFotosPortfolio: null,
    suportePrioritario: true,
    selo: 'Top Confiare',
    exibeAnuncios: false,
    ordemExibicao: 4,
  },
  {
    id: 'plan-padrinho',
    slug: 'padrinho',
    nome: 'Padrinho',
    descricao:
      'Todos os recursos do Premium, selo Padrinho Verificado e ferramentas de indicação e acompanhamento de apadrinhados.',
    precoMensalCentavos: 9990,
    precoAnualCentavos: 99900,
    limiteOportunidadesMensal: 100,
    prioridadeMatching: 9,
    prioridadeLabel: 'Alta',
    permiteDestaque: true,
    permiteRelatoriosAvancados: true,
    permitePortfolioIlimitado: true,
    limiteFotosPortfolio: null,
    suportePrioritario: true,
    selo: 'Padrinho Verificado',
    exibeAnuncios: false,
    ordemExibicao: 5,
  },
];

const PLAN_BULLETS: Record<string, string[]> = {
  gratuito: [
    'Até 5 oportunidades por mês',
    'Perfil público básico',
    'Contato por WhatsApp',
    'Avaliações visíveis',
    'Anúncios moderados no painel',
    'Sem prioridade',
  ],
  essencial: [
    'Até 15 oportunidades por mês',
    'Prioridade leve',
    'Perfil profissional completo',
    'Portfólio com até 10 fotos',
    'Relatório mensal básico',
    'Sem anúncios no próprio perfil',
  ],
  profissional: [
    'Até 40 oportunidades por mês',
    'Prioridade média',
    'Destaque em buscas locais',
    'Portfólio ilimitado',
    'Estatísticas de resposta e conversão',
    'Selo "Profissional Confiare"',
  ],
  premium: [
    'Até 100 oportunidades por mês',
    'Prioridade alta',
    'Destaque regional e por categoria',
    'Relatórios avançados',
    'Suporte prioritário',
    'Selo "Top Confiare"',
  ],
  padrinho: [
    'Até 100 oportunidades por mês',
    'Todos os recursos do Premium',
    'Selo "Padrinho Verificado"',
    'Ferramentas de indicação',
    'Acompanhamento de apadrinhados',
    'Painel de reputação das indicações',
  ],
};

const PLAN_CTA_LABELS: Record<string, string> = {
  gratuito: 'Começar grátis',
  essencial: 'Assinar Essencial',
  profissional: 'Assinar Profissional',
  premium: 'Assinar Premium',
  padrinho: 'Tornar-me Padrinho',
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
        className="inline-flex items-center p-1.5 rounded-2xl bg-[#0A2540]/5 border border-[#0A2540]/10"
      >
        <button
          type="button"
          onClick={() => onChange('mensal')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-display font-semibold transition-all cursor-pointer ${
            cycle === 'mensal'
              ? 'bg-[#0A2540] text-white shadow-sm'
              : 'text-[#0A2540]/75 hover:text-[#0A2540]'
          }`}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => onChange('anual')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-display font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            cycle === 'anual'
              ? 'bg-[#FF6A00] text-white shadow-sm'
              : 'text-[#0A2540]/75 hover:text-[#0A2540]'
          }`}
        >
          <span>Anual — economize 2 meses</span>
        </button>
      </div>

      {cycle === 'anual' ? (
        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full">
          Cobrança anual única equivalente a 10 meses — economize até{' '}
          {formatCentavosBRL(19980)} por ano
        </p>
      ) : (
        <p className="text-xs text-[#0A2540]/70">
          Pagamento mensal flexível — cancele a qualquer momento
        </p>
      )}
    </div>
  );
};

export const PlanCard: React.FC<{
  plan: PlanPricingDisplay;
  cycle: BillingCycleOption;
  onSelectPlan: (planSlug: string, cycle: BillingCycleOption) => void;
}> = ({ plan, cycle, onSelectPlan }) => {
  const isProfissional = plan.slug === 'profissional';
  const isPadrinho = plan.slug === 'padrinho';
  const monthlyEquivalent = calculateAnnualMonthlyEquivalentCentavos(
    plan.precoAnualCentavos
  );
  const annualSavings = calculateAnnualSavingsCentavos(
    plan.precoMensalCentavos,
    plan.precoAnualCentavos
  );
  const bullets = PLAN_BULLETS[plan.slug] || [];
  const ctaLabel = PLAN_CTA_LABELS[plan.slug] || `Assinar ${plan.nome}`;

  return (
    <div
      className={`rounded-3xl p-6 flex flex-col justify-between gap-5 border transition-all ${
        isProfissional
          ? 'bg-[#0A2540] text-white border-[#FF6A00] ring-2 ring-[#FF6A00]/30 shadow-lg'
          : 'bg-white text-[#0A2540] border-[#0A2540]/10'
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 min-h-[26px]">
          <h2 className="font-display font-bold text-lg">{plan.nome}</h2>
          {isProfissional && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF6A00] text-white text-[11px] font-bold">
              <Sparkles className="w-3 h-3" />
              Mais escolhido
            </span>
          )}
          {isPadrinho && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1D6FE0]/10 text-[#1D6FE0] text-[10px] font-bold">
              <Award className="w-3 h-3" />
              Opção avançada
            </span>
          )}
        </div>

        {/* Preço sempre visível */}
        <div className="space-y-1">
          {cycle === 'mensal' ? (
            <>
              <div className="flex items-baseline gap-1 font-mono tabular-nums">
                <span className="text-2xl sm:text-3xl font-bold">
                  {plan.precoMensalCentavos === 0
                    ? 'R$ 0'
                    : formatCentavosBRL(plan.precoMensalCentavos)}
                </span>
                <span
                  className={`text-xs ${
                    isProfissional ? 'text-white/70' : 'text-[#0A2540]/60'
                  }`}
                >
                  /mês
                </span>
              </div>
              <p
                className={`text-[11px] ${
                  isProfissional ? 'text-white/75' : 'text-[#0A2540]/65'
                }`}
              >
                {plan.precoMensalCentavos === 0
                  ? 'Sem cartão de crédito'
                  : 'Cancele a qualquer momento'}
              </p>
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
                    isProfissional ? 'text-white/70' : 'text-[#0A2540]/60'
                  }`}
                >
                  /ano
                </span>
              </div>
              {plan.precoAnualCentavos > 0 ? (
                <div className="space-y-0.5 text-[11px]">
                  <p
                    className={`font-semibold ${
                      isProfissional ? 'text-[#FF6A00]' : 'text-[#1D6FE0]'
                    }`}
                  >
                    Equivale a {formatCentavosBRL(monthlyEquivalent)}/mês
                  </p>
                  <p
                    className={`font-semibold ${
                      isProfissional ? 'text-emerald-300' : 'text-emerald-700'
                    }`}
                  >
                    Economize {formatCentavosBRL(annualSavings)} no ano
                  </p>
                </div>
              ) : (
                <p
                  className={`text-[11px] ${
                    isProfissional ? 'text-white/75' : 'text-[#0A2540]/65'
                  }`}
                >
                  Gratuito para sempre
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
                  isProfissional ? 'text-[#FF6A00]' : 'text-emerald-600'
                }`}
              />
              <span className={isProfissional ? 'text-white/90' : 'text-[#0A2540]/85'}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => onSelectPlan(plan.slug, cycle)}
        className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl font-display font-semibold text-xs transition-colors cursor-pointer ${
          isProfissional
            ? 'bg-[#FF6A00] hover:bg-[#e65f00] text-white'
            : plan.slug === 'gratuito'
              ? 'bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540]'
              : 'bg-[#0A2540] hover:bg-[#13385d] text-white'
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
      label: 'Oportunidades por mês',
      render: (p) => `${p.limiteOportunidadesMensal} / mês`,
    },
    {
      label: 'Prioridade no matching',
      render: (p) => p.prioridadeLabel || 'Baixa',
    },
    {
      label: 'Perfil profissional',
      render: (p) => (p.slug === 'gratuito' ? 'Básico' : 'Completo'),
    },
    {
      label: 'Portfólio',
      render: (p) =>
        p.permitePortfolioIlimitado
          ? 'Ilimitado'
          : `Até ${p.limiteFotosPortfolio ?? 5} fotos`,
    },
    {
      label: 'Destaque local',
      render: (p) => {
        if (!p.permiteDestaque) return '—';
        if (p.slug === 'profissional') return 'Buscas locais';
        return 'Regional e categoria';
      },
    },
    {
      label: 'Relatórios',
      render: (p) => {
        if (p.permiteRelatoriosAvancados) return 'Avançados';
        if (p.slug === 'profissional') return 'Resposta e conversão';
        if (p.slug === 'essencial') return 'Mensal básico';
        return '—';
      },
    },
    {
      label: 'Suporte',
      render: (p) => (p.suportePrioritario ? 'Prioritário' : 'Padrão'),
    },
    {
      label: 'Anúncios',
      render: (p) =>
        p.exibeAnuncios ? 'Moderados no painel' : 'Sem anúncios',
    },
    {
      label: 'Selo',
      render: (p) => p.selo || 'Nenhum',
    },
    {
      label: 'Ferramentas de indicação',
      render: (p) =>
        p.slug === 'padrinho' ? 'Indicação e apadrinhados' : '—',
    },
    {
      label: 'Preço mensal',
      render: (p) => formatCentavosBRL(p.precoMensalCentavos),
    },
    {
      label: 'Preço anual',
      render: (p) => formatCentavosBRL(p.precoAnualCentavos),
    },
  ];

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0A2540]/10 space-y-5">
      <div>
        <p className="text-xs font-semibold text-[#1D6FE0]">
          Transparência Total
        </p>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0A2540]">
          Comparativo completo de recursos
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#0A2540]/10 text-[#0A2540]">
              <th className="py-3 pr-4 font-display font-bold">Recurso</th>
              {plans.map((p) => (
                <th
                  key={p.slug}
                  className={`py-3 px-3 font-display font-bold whitespace-nowrap ${
                    p.slug === 'profissional' ? 'text-[#FF6A00]' : ''
                  }`}
                >
                  {p.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0A2540]/10">
            {rows.map((row) => (
              <tr key={row.label} className="hover:bg-[#F4F2EF]/40">
                <td className="py-3 pr-4 font-semibold text-[#0A2540] whitespace-nowrap">
                  {row.label}
                </td>
                {plans.map((p) => (
                  <td
                    key={`${row.label}-${p.slug}`}
                    className={`py-3 px-3 whitespace-nowrap ${
                      p.slug === 'profissional'
                        ? 'font-semibold text-[#0A2540]'
                        : 'text-[#0A2540]/80'
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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'boleto'>('pix');
  const [subSummary, setSubSummary] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    checkoutUrl?: string;
  } | null>(null);

  const loadSubscription = React.useCallback(async () => {
    if (!providerContext?.providerProfileId) return;
    try {
      const res = await fetch(
        `/api/providers/${encodeURIComponent(providerContext.providerProfileId)}/subscription`
      );
      if (res.ok) {
        const body = await res.json();
        if (body?.ok) {
          setSubSummary(body);
        }
      }
    } catch {
      // Ignore network hiccup
    }
  }, [providerContext?.providerProfileId]);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.ok && Array.isArray(body.plans) && body.plans.length > 0) {
          setPlans(body.plans);
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handleSelectPlan = async (
    planSlug: string,
    selectedCycle: BillingCycleOption
  ) => {
    if (!isLoggedProvider || !providerContext?.providerProfileId) {
      onNavigateUrl(
        `/criar-conta?role=prestador&plan=${encodeURIComponent(planSlug)}&cycle=${selectedCycle}`
      );
      return;
    }

    setActionLoading(true);
    setActionFeedback(null);
    try {
      const activeSub = subSummary?.subscription;
      const currentPlan = subSummary?.plan;

      // Se já tem assinatura paga ativa, decide entre Upgrade ou Downgrade
      if (
        activeSub &&
        activeSub.status === 'ativa' &&
        currentPlan &&
        currentPlan.slug !== 'gratuito'
      ) {
        const targetPlan = plans.find((p) => p.slug === planSlug);
        if (!targetPlan) return;

        if (targetPlan.slug === currentPlan.slug) {
          setActionFeedback({
            type: 'success',
            message: `Você já está no plano ${currentPlan.nome}.`,
          });
          return;
        }

        if (targetPlan.ordemExibicao > currentPlan.ordemExibicao) {
          const res = await fetch(`/api/subscriptions/${activeSub.id}/upgrade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetPlanSlug: planSlug,
              targetCycle: selectedCycle,
              paymentMethod,
            }),
          });
          const body = await res.json();
          if (!res.ok || !body.ok) {
            throw new Error(body.error || 'Falha ao realizar upgrade.');
          }
          setActionFeedback({
            type: 'success',
            message: `Upgrade para ${targetPlan.nome} aplicado! Diferença pro-rata: ${formatCentavosBRL(body.proRataCents || 0)}.`,
          });
          await loadSubscription();
          return;
        }

        const res = await fetch(`/api/subscriptions/${activeSub.id}/downgrade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPlanSlug: planSlug }),
        });
        const body = await res.json();
        if (!res.ok || !body.ok) {
          throw new Error(body.error || 'Falha ao agendar downgrade.');
        }
        setActionFeedback({
          type: 'success',
          message: `Downgrade para ${targetPlan.nome} agendado para a próxima renovação, mantendo seus benefícios atuais até lá.`,
        });
        await loadSubscription();
        return;
      }

      // Novo checkout no gateway Asaas (desacoplado via BillingProvider)
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerProfileId: providerContext.providerProfileId,
          providerName: providerContext.fullName,
          providerEmail: providerContext.email,
          providerPhone: providerContext.phone || '(11) 99000-0000',
          planSlug,
          cycle: selectedCycle,
          paymentMethod,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error || 'Não foi possível iniciar o checkout.');
      }
      setActionFeedback({
        type: 'success',
        message:
          planSlug === 'gratuito'
            ? 'Plano Gratuito ativado com sucesso!'
            : `Checkout ${planSlug.toUpperCase()} (${selectedCycle}) criado no gateway! Conclua o pagamento para ativar.`,
        checkoutUrl: body.checkoutUrl || body.invoice?.urlCheckout,
      });
      await loadSubscription();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: (err as Error).message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subSummary?.subscription?.id) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch(
        `/api/subscriptions/${subSummary.subscription.id}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Solicitado pelo prestador em /planos' }),
        }
      );
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error || 'Não foi possível cancelar a assinatura.');
      }
      setActionFeedback({
        type: 'success',
        message:
          'Assinatura cancelada. Seu acesso permanece ativo até o fim do período já pago.',
      });
      await loadSubscription();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: (err as Error).message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Cabeçalho + Toggle Visível Acima da Dobra */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#0A2540]/10 text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>A Confiare não cobra comissão sobre o valor do seu serviço.</span>
        </div>

        <div className="max-w-3xl mx-auto space-y-2">
          <h1 className="font-display font-bold text-2xl sm:text-4xl text-[#0A2540]">
            Escolha o plano ideal para crescer com a Confiare
          </h1>
          <p className="text-xs sm:text-base text-[#0A2540]/75">
            Receba oportunidades compatíveis, construa reputação e apareça para clientes da sua região.
          </p>
        </div>

        <BillingCycleToggle cycle={cycle} onChange={setCycle} />

        {isLoggedProvider && providerContext && (
          <div className="max-w-4xl mx-auto pt-3 border-t border-[#0A2540]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-left text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold text-[#0A2540]">
                Plano atual:{' '}
                <span className="text-[#FF6A00]">
                  {subSummary?.plan?.nome || 'Gratuito'}
                </span>{' '}
                ({subSummary?.subscription?.status || 'ativa'})
              </p>
              {subSummary?.usage && (
                <p className="text-[#0A2540]/70">
                  Oportunidades neste ciclo: {subSummary.usage.used}/
                  {subSummary.usage.limit} ({subSummary.usage.remaining}{' '}
                  restantes)
                  {subSummary?.subscription?.proximaCobranca
                    ? ` · Renovação: ${new Date(
                        subSummary.subscription.proximaCobranca
                      ).toLocaleDateString('pt-BR')}`
                    : ''}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="font-semibold text-[#0A2540]">Pagamento:</label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as 'pix' | 'cartao' | 'boleto')
                }
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-xl border border-[#0A2540]/15 bg-white font-semibold"
              >
                <option value="pix">PIX</option>
                <option value="cartao">Cartão de Crédito</option>
                <option value="boleto">Boleto</option>
              </select>

              {subSummary?.subscription?.status === 'ativa' &&
                subSummary?.plan?.slug !== 'gratuito' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleCancelSubscription}
                    className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 font-semibold cursor-pointer"
                  >
                    Cancelar assinatura
                  </button>
                )}
            </div>
          </div>
        )}

        {actionFeedback && (
          <div
            className={`max-w-3xl mx-auto p-3.5 rounded-2xl text-xs font-medium ${
              actionFeedback.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            }`}
          >
            <p>{actionFeedback.message}</p>
            {actionFeedback.checkoutUrl && (
              <a
                href={actionFeedback.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1.5 underline font-bold"
              >
                Abrir link de pagamento seguro →
              </a>
            )}
          </div>
        )}
      </section>

      {/* Cards dos 5 Planos (Gratuito -> Essencial -> Profissional -> Premium -> Padrinho) */}
      <section aria-label="Planos de Assinatura">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
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

      {/* Comparativo de Recursos (12 linhas) */}
      <PlansComparisonTable plans={plans} />

      {/* FAQ */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0A2540]/10 space-y-5">
        <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0A2540]">
          Perguntas frequentes sobre planos e cobrança
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-[#F4F2EF]/60 space-y-1.5">
            <h3 className="font-bold text-sm text-[#0A2540] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#FF6A00]" />
              Como funciona a cobrança mensal ou anual?
            </h3>
            <p className="text-[#0A2540]/75 leading-relaxed">
              No ciclo mensal você paga mês a mês e pode cancelar quando quiser. No ciclo anual você faz um único pagamento anual equivalente a 10 meses (2 meses grátis).
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#F4F2EF]/60 space-y-1.5">
            <h3 className="font-bold text-sm text-[#0A2540] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#FF6A00]" />
              Se eu cancelar, perco meu acesso na hora?
            </h3>
            <p className="text-[#0A2540]/75 leading-relaxed">
              Não. O cancelamento interrompe apenas a próxima renovação e mantém todos os benefícios do seu plano ativos até o fim do período já pago.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#F4F2EF]/60 space-y-1.5">
            <h3 className="font-bold text-sm text-[#0A2540] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#FF6A00]" />
              O que acontece ao atingir o limite de oportunidades do mês?
            </h3>
            <p className="text-[#0A2540]/75 leading-relaxed">
              Seu perfil nunca é excluído. Você continua visível para recontratações e o contador reinicia automaticamente no próximo ciclo — ou você pode fazer upgrade imediato.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#F4F2EF]/60 space-y-1.5">
            <h3 className="font-bold text-sm text-[#0A2540] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#FF6A00]" />
              Onde os anúncios são exibidos?
            </h3>
            <p className="text-[#0A2540]/75 leading-relaxed">
              Apenas no painel interno de prestadores do plano Gratuito, de forma moderada. Clientes nunca veem anúncios e planos pagos são 100% livres de publicidade.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
