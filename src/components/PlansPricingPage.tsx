import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Gift,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  calculateAnnualMonthlyEquivalentCentavos,
  calculateAnnualSavingsCentavos,
  formatCentavosBRL,
  type PlanPricingDisplay,
} from '../utils/pricingCalculations';
import type { PlanSlug, PlanTier } from '../types/confiare';

export type BillingCycleOption = 'mensal' | 'anual';
export type PaymentMethodOption = 'pix' | 'cartao' | 'boleto';

export interface CommercialPlanDisplay extends PlanPricingDisplay {
  ativo?: boolean;
}

export const DEFAULT_OFFICIAL_PLANS: CommercialPlanDisplay[] = [
  {
    id: 'plan-gratuito',
    slug: 'gratuito',
    nome: 'Gratuito',
    descricao:
      'Perfil público básico, contato por WhatsApp, avaliações visíveis e até 5 oportunidades por mês com anúncios moderados no painel.',
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
    ativo: true,
    ordemExibicao: 1,
  },
  {
    id: 'plan-essencial',
    slug: 'essencial',
    nome: 'Essencial',
    descricao:
      'Perfil profissional completo, portfólio com até 10 fotos, prioridade leve no matching, relatório mensal básico e sem anúncios.',
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
    ativo: true,
    ordemExibicao: 2,
  },
  {
    id: 'plan-profissional',
    slug: 'profissional',
    nome: 'Profissional',
    descricao:
      'Prioridade média no matching, destaque em buscas locais, portfólio ilimitado, estatísticas de resposta e conversão e selo Profissional Recontrate.',
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
    ativo: true,
    ordemExibicao: 3,
  },
  {
    id: 'plan-premium',
    slug: 'premium',
    nome: 'Premium',
    descricao:
      'Prioridade alta no matching, destaque regional e por categoria, relatórios avançados, portfólio ilimitado, suporte prioritário e selo Top Recontrate.',
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
    selo: 'Top Recontrate',
    exibeAnuncios: false,
    ativo: true,
    ordemExibicao: 4,
  },
];

const DEFAULT_LAUNCH_PROMO_CENTAVOS: Record<string, number> = {
  essencial: 0,
  profissional: 0,
  premium: 0,
};

export function slugToPlanTier(slug?: string | null): PlanTier {
  switch ((slug || '').toLowerCase()) {
    case 'essencial':
      return 'Essencial';
    case 'profissional':
      return 'Profissional';
    case 'premium':
      return 'Premium';
    default:
      return 'Gratuito';
  }
}

export function planTierToSlug(tier?: PlanTier | string | null): PlanSlug {
  switch ((tier || '').toLowerCase()) {
    case 'essencial':
      return 'essencial';
    case 'profissional':
      return 'profissional';
    case 'premium':
      return 'premium';
    default:
      return 'gratuito';
  }
}

export function normalizeDigits(val: string): string {
  return val.replace(/\D/g, '');
}

export function formatCpfCnpjInput(val: string): string {
  const digits = normalizeDigits(val).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function getPlanBullets(plan: PlanPricingDisplay): string[] {
  const bullets: string[] = [
    `Até ${plan.limiteOportunidadesMensal} oportunidades por mês`,
    plan.prioridadeMatching > 0
      ? `Prioridade ${plan.prioridadeLabel.toLowerCase()} no matching (+${plan.prioridadeMatching} pts)`
      : 'Visibilidade padrão no matching local',
    plan.permitePortfolioIlimitado
      ? 'Portfólio ilimitado de serviços realizados'
      : `Portfólio com até ${plan.limiteFotosPortfolio ?? 5} fotos`,
  ];

  if (plan.permiteDestaque) {
    bullets.push(
      plan.slug === 'premium'
        ? 'Destaque regional e por categoria nas buscas'
        : 'Destaque em buscas locais do seu bairro'
    );
  } else {
    bullets.push('Perfil profissional com contato direto no WhatsApp');
  }

  if (plan.permiteRelatoriosAvancados) {
    bullets.push('Relatórios avançados de conversão e funil');
  } else if (plan.slug === 'profissional') {
    bullets.push('Estatísticas de tempo de resposta e conversão');
  } else if (plan.slug === 'essencial') {
    bullets.push('Relatório mensal básico no painel');
  }

  if (plan.suportePrioritario) {
    bullets.push('Suporte prioritário para atendimento');
  }

  bullets.push(
    plan.exibeAnuncios
      ? 'Anúncios moderados exclusivos no painel interno'
      : 'Painel 100% livre de anúncios · Sem comissão para a plataforma'
  );

  return bullets;
}

export function getPlanAudienceLabel(slug: string): string {
  switch (slug) {
    case 'gratuito':
      return 'Entrada sem custo fixo';
    case 'essencial':
      return 'Para começar com consistência';
    case 'profissional':
      return 'Mais escolhido pelos autônomos';
    case 'premium':
      return 'Máxima visibilidade e inteligência';
    default:
      return 'Plano comercial Recontrate';
  }
}

export function getSubscriptionActionType(params: {
  activeSubStatus?: string | null;
  activeSubCycle?: string | null;
  currentPlan?: PlanPricingDisplay | null;
  targetPlan: PlanPricingDisplay;
  targetCycle: BillingCycleOption;
}): 'current' | 'upgrade' | 'downgrade' | 'checkout' {
  const { activeSubStatus, activeSubCycle, currentPlan, targetPlan, targetCycle } =
    params;

  const hasPaidSubscription =
    Boolean(activeSubStatus) &&
    ['ativa', 'trial', 'inadimplente'].includes(String(activeSubStatus)) &&
    Boolean(currentPlan && currentPlan.precoMensalCentavos > 0);

  if (!hasPaidSubscription) {
    if (
      currentPlan?.slug === targetPlan.slug &&
      targetPlan.precoMensalCentavos === 0
    ) {
      return 'current';
    }
    return 'checkout';
  }

  if (currentPlan && currentPlan.slug === targetPlan.slug) {
    if ((activeSubCycle || 'mensal') === targetCycle) {
      return 'current';
    }
    if (activeSubCycle === 'mensal' && targetCycle === 'anual') {
      return 'upgrade';
    }
    return 'checkout';
  }

  if (currentPlan && targetPlan.ordemExibicao > currentPlan.ordemExibicao) {
    return 'upgrade';
  }

  if (currentPlan && targetPlan.ordemExibicao < currentPlan.ordemExibicao) {
    return 'downgrade';
  }

  return 'checkout';
}

export interface LaunchOfferCardState {
  eligible: boolean;
  resultado?: 'elegivel' | 'inelegivel' | 'bloqueado';
  reason?: string;
  discountPercent: number;
  durationCycles: number;
  promoPricesCentavos: Record<string, number>;
  fullPricesCentavos: Record<string, number>;
  fullPriceStartDate?: string;
}

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
          Ciclo Mensal (90 dias grátis)
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
          <span>Ciclo Anual</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              cycle === 'anual'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            2 meses grátis
          </span>
        </button>
      </div>
    </div>
  );
};

export const PlanCard: React.FC<{
  plan: CommercialPlanDisplay;
  cycle: BillingCycleOption;
  launchOffer?: LaunchOfferCardState | null;
  actionType?: 'current' | 'upgrade' | 'downgrade' | 'checkout';
  onSelectPlan: (planSlug: string, cycle: BillingCycleOption) => void;
}> = ({
  plan,
  cycle,
  launchOffer,
  actionType = 'checkout',
  onSelectPlan,
}) => {
  const isProfissional = plan.slug === 'profissional';
  const isCurrent = actionType === 'current';
  const monthlyEquivalent = calculateAnnualMonthlyEquivalentCentavos(
    plan.precoAnualCentavos
  );
  const annualSavings = calculateAnnualSavingsCentavos(
    plan.precoMensalCentavos,
    plan.precoAnualCentavos
  );
  const bullets = getPlanBullets(plan);

  const showLaunchPromo =
    cycle === 'mensal' &&
    plan.precoMensalCentavos > 0 &&
    (launchOffer ? launchOffer.eligible : true);
  const promoCentavos =
    launchOffer?.promoPricesCentavos?.[plan.slug] ??
    DEFAULT_LAUNCH_PROMO_CENTAVOS[plan.slug] ??
    0;

  const ctaLabel = isCurrent
    ? '✓ Plano Atual'
    : actionType === 'upgrade'
      ? `Fazer upgrade para ${plan.nome}`
      : actionType === 'downgrade'
        ? `Agendar ${plan.nome}`
        : plan.precoMensalCentavos === 0
          ? 'Começar grátis'
          : showLaunchPromo
            ? 'Ativar 90 dias grátis'
            : `Assinar ${plan.nome}`;

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-5 border transition-all ${
        isProfissional
          ? 'bg-brand-primary text-white border-brand-accent-strong ring-2 ring-brand-accent-strong/30 shadow-lg'
          : 'bg-white text-brand-ink border-brand-primary/10'
      }`}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 min-h-[24px]">
            <span
              className={`text-[11px] font-semibold ${
                isProfissional ? 'text-brand-accent-contrast' : 'text-brand-link'
              }`}
            >
              {getPlanAudienceLabel(plan.slug)}
            </span>
            {isProfissional && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-accent-strong text-white text-[10px] font-bold">
                <Sparkles className="w-3 h-3" />
                Mais escolhido
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-lg">{plan.nome}</h2>
            {plan.selo && (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  isProfissional
                    ? 'bg-white/15 text-brand-accent-contrast'
                    : 'bg-brand-background text-brand-primary'
                }`}
              >
                {plan.selo}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          {cycle === 'mensal' ? (
            showLaunchPromo ? (
              <>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span
                    className={`line-through ${
                      isProfissional ? 'text-white/75' : 'text-brand-ink/70'
                    }`}
                  >
                    {formatCentavosBRL(plan.precoMensalCentavos)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                    90 dias grátis
                  </span>
                </div>
                <div className="flex items-baseline gap-1 font-mono tabular-nums">
                  <span className="text-2xl sm:text-3xl font-bold whitespace-nowrap">
                    {promoCentavos === 0
                      ? 'R$ 0,00'
                      : formatCentavosBRL(promoCentavos)}
                  </span>
                  <span
                    className={`text-xs whitespace-nowrap ${
                      isProfissional ? 'text-white/75' : 'text-brand-ink/65'
                    }`}
                  >
                    / 90 dias
                  </span>
                </div>
                <p
                  className={`text-[11px] leading-snug ${
                    isProfissional
                      ? 'text-brand-accent-contrast'
                      : 'text-emerald-700 font-medium'
                  }`}
                >
                  3 primeiros meses grátis · Depois{' '}
                  {formatCentavosBRL(plan.precoMensalCentavos)}/mês
                </p>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1 font-mono tabular-nums">
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
                  className={`text-[11px] ${
                    isProfissional ? 'text-white/75' : 'text-brand-ink/65'
                  }`}
                >
                  {plan.precoMensalCentavos === 0
                    ? 'Sem cartão · Uso contínuo dentro do limite'
                    : 'Cobrança mensal recorrente · Sem fidelidade'}
                </p>
              </>
            )
          ) : (
            <>
              <div className="flex items-baseline gap-1 font-mono tabular-nums">
                <span className="text-2xl sm:text-3xl font-bold whitespace-nowrap">
                  {plan.precoAnualCentavos === 0
                    ? 'R$ 0'
                    : formatCentavosBRL(plan.precoAnualCentavos)}
                </span>
                <span
                  className={`text-xs whitespace-nowrap ${
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
                    Equivale a {formatCentavosBRL(monthlyEquivalent)}/mês
                  </p>
                  <p
                    className={
                      isProfissional
                        ? 'text-white/80'
                        : 'text-emerald-700 font-medium'
                    }
                  >
                    Economia de {formatCentavosBRL(annualSavings)}/ano (2 meses grátis)
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

        <button
          type="button"
          disabled={isCurrent}
          onClick={() => onSelectPlan(plan.slug, cycle)}
          className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl font-display font-semibold text-xs transition-colors ${
            isCurrent
              ? 'bg-emerald-500/20 text-current cursor-default border border-emerald-400/40'
              : isProfissional
                ? 'bg-brand-accent-strong hover:bg-brand-accent-hover text-white cursor-pointer'
                : plan.slug === 'gratuito'
                  ? 'bg-brand-background hover:bg-brand-surface-hover text-brand-ink cursor-pointer'
                  : 'bg-brand-primary hover:bg-brand-primary-hover text-white cursor-pointer'
          }`}
        >
          {ctaLabel}
        </button>

        <ul className="space-y-2 text-xs pt-3 border-t border-current/10">
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
    </div>
  );
};

export const PlansComparisonTable: React.FC<{
  plans: CommercialPlanDisplay[];
}> = ({ plans }) => {
  const rows: Array<{
    label: string;
    render: (p: CommercialPlanDisplay) => string;
  }> = [
    {
      label: 'Preço Mensal (padrão)',
      render: (p) =>
        p.precoMensalCentavos === 0
          ? 'Gratuito'
          : `${formatCentavosBRL(p.precoMensalCentavos)}/mês`,
    },
    {
      label: 'Promoção de Lançamento',
      render: (p) =>
        p.precoMensalCentavos === 0
          ? 'Sempre gratuito'
          : '90 dias grátis (R$ 0,00)',
    },
    {
      label: 'Plano Anual (2 meses grátis)',
      render: (p) =>
        p.precoAnualCentavos === 0
          ? 'Gratuito'
          : `${formatCentavosBRL(p.precoAnualCentavos)}/ano`,
    },
    {
      label: 'Oportunidades por mês',
      render: (p) => `Até ${p.limiteOportunidadesMensal} / mês`,
    },
    {
      label: 'Prioridade justa no matching',
      render: (p) =>
        p.prioridadeMatching > 0
          ? `${p.prioridadeLabel} (+${p.prioridadeMatching} pts)`
          : 'Padrão (Base)',
    },
    {
      label: 'Portfólio de fotos',
      render: (p) =>
        p.permitePortfolioIlimitado
          ? 'Ilimitado'
          : `Até ${p.limiteFotosPortfolio ?? 5} fotos`,
    },
    {
      label: 'Destaque em buscas',
      render: (p) => {
        if (!p.permiteDestaque) return 'Não incluso';
        if (p.slug === 'premium') return 'Regional e por categoria';
        return 'Local (seu bairro)';
      },
    },
    {
      label: 'Relatórios e métricas no painel',
      render: (p) => {
        if (p.permiteRelatoriosAvancados) return 'Avançados + funil';
        if (p.slug === 'profissional') return 'Resposta e conversão';
        if (p.slug === 'essencial') return 'Mensal básico';
        return 'Visão básica';
      },
    },
    {
      label: 'Indicação de substitutos',
      render: () => 'Substituto na indisponibilidade',
    },
    {
      label: 'Suporte prioritário',
      render: (p) => (p.suportePrioritario ? 'Sim' : 'Atendimento padrão'),
    },
    {
      label: 'Anúncios no painel',
      render: (p) =>
        p.exibeAnuncios ? 'Moderados no painel' : '100% sem anúncios',
    },
    {
      label: 'Selo oficial',
      render: (p) => p.selo || 'Nenhum',
    },
    {
      label: 'Comissão paga à plataforma',
      render: () => 'Nenhuma (negociação direta fora da plataforma)',
    },
  ];

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-5">
      <div>
        <p className="text-xs font-semibold text-brand-link">
          Comparativo Comercial Transparente
        </p>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
          Todos os recursos e limites lado a lado
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-brand-primary/10 text-brand-ink">
              <th className="py-3 pr-4 font-display font-bold">Recurso</th>
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
  currentPlanSlug?: PlanSlug;
}

interface CheckoutModalOutcome {
  ok: boolean;
  message: string;
  checkoutUrl?: string;
  amountCentavos?: number;
  statusLabel?: string;
}

export const PlansPricingPage: React.FC<{
  onNavigateUrl: (path: string) => void;
  isLoggedProvider?: boolean;
  isLoggedIn?: boolean;
  providerContext?: LoggedProviderContext | null;
  authToken?: string;
  onPlanUpdated?: (newPlan: PlanTier) => void;
}> = ({
  onNavigateUrl,
  isLoggedProvider,
  isLoggedIn,
  providerContext,
  authToken,
  onPlanUpdated,
}) => {
  const [plans, setPlans] = useState<CommercialPlanDisplay[]>(
    DEFAULT_OFFICIAL_PLANS
  );
  const [cycle, setCycle] = useState<BillingCycleOption>('mensal');
  const [launchOffer, setLaunchOffer] = useState<LaunchOfferCardState | null>(
    null
  );
  const [subSummary, setSubSummary] = useState<any>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    checkoutUrl?: string;
  } | null>(null);

  // Modal state
  const [modalPlan, setModalPlan] = useState<CommercialPlanDisplay | null>(null);
  const [modalCycle, setModalCycle] = useState<BillingCycleOption>('mensal');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>('pix');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [billingPhone, setBillingPhone] = useState(providerContext?.phone || '');
  const [applyLaunchOffer, setApplyLaunchOffer] = useState(true);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutOutcome, setCheckoutOutcome] =
    useState<CheckoutModalOutcome | null>(null);

  useEffect(() => {
    if (providerContext?.phone && !billingPhone) {
      setBillingPhone(providerContext.phone);
    }
  }, [providerContext?.phone, billingPhone]);

  const loadSubscriptionAndEligibility = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const [eligRes, subRes] = await Promise.all([
      fetch('/api/promotions/launch-offer/eligibility', {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cycle: 'mensal',
          ...(providerContext?.providerProfileId
            ? { providerProfileId: providerContext.providerProfileId }
            : {}),
          ...(providerContext?.email ? { email: providerContext.email } : {}),
          ...(providerContext?.phone ? { phone: providerContext.phone } : {}),
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      providerContext?.providerProfileId
        ? fetch(
            `/api/providers/${encodeURIComponent(
              providerContext.providerProfileId
            )}/subscription`,
            {
              credentials: 'include',
              headers,
            }
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    if (eligRes?.ok) {
      setLaunchOffer({
        eligible: Boolean(eligRes.eligible),
        resultado: eligRes.resultado,
        reason: eligRes.reason,
        discountPercent: eligRes.discountPercent ?? 100,
        durationCycles: eligRes.durationCycles ?? 3,
        promoPricesCentavos:
          eligRes.promoPricesCentavos || DEFAULT_LAUNCH_PROMO_CENTAVOS,
        fullPricesCentavos: eligRes.fullPricesCentavos || {},
        fullPriceStartDate: eligRes.fullPriceStartDate,
      });
    }

    if (subRes?.ok) {
      setSubSummary(subRes);
    }
  }, [
    authToken,
    providerContext?.email,
    providerContext?.phone,
    providerContext?.providerProfileId,
  ]);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.ok && Array.isArray(body.plans) && body.plans.length > 0) {
          const activePlans: CommercialPlanDisplay[] = body.plans
            .filter(
              (p: CommercialPlanDisplay) =>
                p.ativo !== false && p.slug !== 'padrinho'
            )
            .sort(
              (a: CommercialPlanDisplay, b: CommercialPlanDisplay) =>
                a.ordemExibicao - b.ordemExibicao
            );
          if (activePlans.length > 0) {
            setPlans(activePlans);
          }
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    loadSubscriptionAndEligibility();
  }, [loadSubscriptionAndEligibility]);

  // Auto-open checkout modal if redirected from signup/onboarding with ?checkout=<slug>&cycle=<cycle>
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !isLoggedProvider ||
      !providerContext?.providerProfileId
    ) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const checkoutSlug = params.get('checkout');
    const cycleParam = params.get('cycle');
    if (cycleParam === 'anual' || cycleParam === 'mensal') {
      setCycle(cycleParam);
    }
    if (checkoutSlug) {
      const target = plans.find((p) => p.slug === checkoutSlug);
      if (target) {
        setModalPlan(target);
        setModalCycle(cycleParam === 'anual' ? 'anual' : 'mensal');
        setCheckoutOutcome(null);
        setCheckoutError('');
        window.history.replaceState({}, '', '/planos');
      }
    }
  }, [isLoggedProvider, providerContext?.providerProfileId, plans]);

  const currentPlanObj = useMemo(() => {
    const slug =
      subSummary?.plan?.slug || providerContext?.currentPlanSlug || 'gratuito';
    return plans.find((p) => p.slug === slug) || plans[0];
  }, [plans, providerContext?.currentPlanSlug, subSummary?.plan?.slug]);

  const handleSelectPlan = (
    planSlug: string,
    selectedCycle: BillingCycleOption
  ) => {
    setActionFeedback(null);

    if (!isLoggedIn && !isLoggedProvider) {
      onNavigateUrl(
        `/criar-conta?role=prestador&plan=${encodeURIComponent(
          planSlug
        )}&cycle=${selectedCycle}`
      );
      return;
    }

    if (!isLoggedProvider || !providerContext?.providerProfileId) {
      setActionFeedback({
        type: 'error',
        message:
          'Sua sessão atual está apenas como Cliente. Use "Alternar para Prestador" no topo da página ou ative seu perfil profissional para contratar um plano.',
      });
      return;
    }

    const target = plans.find((p) => p.slug === planSlug);
    if (!target) return;

    setModalPlan(target);
    setModalCycle(selectedCycle);
    setApplyLaunchOffer(
      selectedCycle === 'mensal' &&
        target.precoMensalCentavos > 0 &&
        Boolean(launchOffer?.eligible)
    );
    setCheckoutError('');
    setCheckoutOutcome(null);
  };

  const modalActionType = useMemo(() => {
    if (!modalPlan) return 'checkout';
    return getSubscriptionActionType({
      activeSubStatus: subSummary?.subscription?.status,
      activeSubCycle: subSummary?.subscription?.ciclo,
      currentPlan: currentPlanObj,
      targetPlan: modalPlan,
      targetCycle: modalCycle,
    });
  }, [currentPlanObj, modalCycle, modalPlan, subSummary]);

  const isFreePromoModal = Boolean(
    modalPlan &&
      modalActionType === 'checkout' &&
      modalCycle === 'mensal' &&
      modalPlan.precoMensalCentavos > 0 &&
      applyLaunchOffer &&
      launchOffer?.eligible &&
      (launchOffer.promoPricesCentavos?.[modalPlan.slug] ?? 0) === 0
  );

  const handleConfirmPlanAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPlan || !providerContext?.providerProfileId) return;

    setCheckoutError('');
    const digitsDoc = normalizeDigits(cpfCnpj);
    const digitsPhone = normalizeDigits(billingPhone || providerContext.phone || '');
    const requiresChargeToday =
      modalActionType === 'checkout' &&
      modalPlan.precoMensalCentavos > 0 &&
      !isFreePromoModal;

    if (
      modalActionType !== 'downgrade' &&
      modalPlan.precoMensalCentavos > 0 &&
      digitsPhone.length < 10
    ) {
      setCheckoutError(
        'Informe um telefone/WhatsApp válido com DDD para continuar.'
      );
      return;
    }

    if (
      requiresChargeToday &&
      digitsDoc.length !== 11 &&
      digitsDoc.length !== 14
    ) {
      setCheckoutError(
        'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para emissão da cobrança no Asaas.'
      );
      return;
    }

    setCheckoutSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };

      if (modalActionType === 'upgrade' && subSummary?.subscription?.id) {
        const res = await fetch(
          `/api/subscriptions/${encodeURIComponent(
            subSummary.subscription.id
          )}/upgrade`,
          {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
              targetPlanSlug: modalPlan.slug,
              targetCycle: modalCycle,
              paymentMethod,
            }),
          }
        );
        const body = await res.json();
        if (!res.ok || !body.ok) {
          throw new Error(body.error || 'Erro ao realizar upgrade.');
        }
        onPlanUpdated?.(slugToPlanTier(modalPlan.slug));
        await loadSubscriptionAndEligibility();
        setCheckoutOutcome({
          ok: true,
          message: `Upgrade para ${modalPlan.nome} ativado imediatamente!${
            body.proRataCents > 0
              ? ` Cobrança proporcional (pro-rata): ${formatCentavosBRL(
                  body.proRataCents
                )}.`
              : ''
          }`,
          checkoutUrl: body.proRataInvoice?.urlCheckout,
          amountCentavos: body.proRataCents,
          statusLabel: 'Upgrade imediato concluído',
        });
        return;
      }

      if (modalActionType === 'downgrade' && subSummary?.subscription?.id) {
        const res = await fetch(
          `/api/subscriptions/${encodeURIComponent(
            subSummary.subscription.id
          )}/downgrade`,
          {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
              targetPlanSlug: modalPlan.slug,
            }),
          }
        );
        const body = await res.json();
        if (!res.ok || !body.ok) {
          throw new Error(body.error || 'Erro ao agendar mudança de plano.');
        }
        await loadSubscriptionAndEligibility();
        const effDate = body.effectiveDate
          ? new Date(body.effectiveDate).toLocaleDateString('pt-BR')
          : 'próximo vencimento';
        setCheckoutOutcome({
          ok: true,
          message: `Mudança para ${modalPlan.nome} agendada para ${effDate}. Seu plano atual permanece ativo até o fim do ciclo pago.`,
          statusLabel: 'Mudança agendada para o próximo ciclo',
        });
        return;
      }

      const usePromo =
        modalCycle === 'mensal' &&
        modalPlan.precoMensalCentavos > 0 &&
        applyLaunchOffer &&
        Boolean(launchOffer?.eligible);

      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          providerProfileId: providerContext.providerProfileId,
          providerName: providerContext.fullName,
          providerEmail: providerContext.email,
          providerPhone:
            billingPhone || providerContext.phone || '(11) 99999-0000',
          cpfCnpj: digitsDoc || undefined,
          planSlug: modalPlan.slug,
          cycle: modalCycle,
          paymentMethod,
          applyLaunchOffer: usePromo,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(
          body.error || 'Erro ao iniciar checkout da assinatura.'
        );
      }

      onPlanUpdated?.(slugToPlanTier(modalPlan.slug));
      await loadSubscriptionAndEligibility();

      const invoiceAmount = body.invoice?.valorCentavos ?? 0;
      const isFreePlan = modalPlan.precoMensalCentavos === 0;
      const endDateLabel = body.subscription?.fim
        ? new Date(body.subscription.fim).toLocaleDateString('pt-BR')
        : '90 dias';
      const bonusNote =
        body.referralBonusDaysApplied > 0
          ? ` Incluídos +${body.referralBonusDaysApplied} dias grátis extras de suas indicações validadas!`
          : '';

      if (!isFreePlan && invoiceAmount === 0 && usePromo) {
        setCheckoutOutcome({
          ok: true,
          message: `Seus 90 dias grátis no plano ${modalPlan.nome} já estão liberados até ${endDateLabel}! Após os 90 dias aplica-se o valor de ${formatCentavosBRL(
            modalPlan.precoMensalCentavos
          )}/mês, com aviso prévio e cancelamento livre sem multa.${bonusNote}`,
          amountCentavos: 0,
          statusLabel: '90 dias grátis ativados!',
        });
      } else {
        setCheckoutOutcome({
          ok: true,
          message: isFreePlan
            ? 'Plano Gratuito ativado com sucesso na sua conta de prestador.'
            : `Assinatura ${modalPlan.nome} (${modalCycle}) gerada via Asaas! Conclua o pagamento de ${formatCentavosBRL(
                invoiceAmount
              )} no link seguro abaixo para liberar imediatamente todos os recursos.${bonusNote}`,
          checkoutUrl: body.checkoutUrl || body.invoice?.urlCheckout,
          amountCentavos: invoiceAmount,
          statusLabel: isFreePlan
            ? 'Plano Gratuito ativo'
            : 'Aguardando pagamento',
        });
      }
    } catch (err) {
      setCheckoutError(
        (err as Error).message || 'Falha ao processar solicitação de plano.'
      );
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Cabeçalho Comercial + Promoção de 90 Dias Grátis */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-brand-primary/10 text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>
            Sem comissão para a plataforma · Negociação direta fora do app · R$ 0 por lead
          </span>
        </div>

        <div className="max-w-3xl mx-auto space-y-2">
          <h1 className="font-display font-bold text-2xl sm:text-4xl text-brand-ink">
            Comece com 90 dias grátis e fique com 100% do valor dos seus serviços
          </h1>
          <p className="text-xs sm:text-base text-brand-ink/75">
            Você não paga comissão ao Recontrate pelos serviços fechados. Todo
            valor é negociado e pago diretamente entre você e o cliente, fora da
            plataforma — com planos claros e sem taxas ocultas.
          </p>
        </div>

        <BillingCycleToggle cycle={cycle} onChange={setCycle} />

        {/* Banner Promoção de 90 Dias Grátis */}
        <div className="max-w-4xl mx-auto p-5 rounded-2xl bg-brand-background/85 border border-brand-primary/15 text-left space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-display font-bold text-sm text-brand-primary">
              <Sparkles className="w-4 h-4 text-brand-accent-strong" />
              Promoção de Lançamento: 90 dias grátis nos planos pagos
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-semibold ${
                launchOffer && !launchOffer.eligible
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {launchOffer && !launchOffer.eligible
                ? 'Condição regular para sua conta'
                : 'R$ 0,00 nos 3 primeiros meses'}
            </span>
          </div>

          <p className="text-brand-ink/80 leading-relaxed">
            Novos prestadores experimentam os planos mensais{' '}
            <strong>Essencial (R$ 29,90/mês)</strong>,{' '}
            <strong>Profissional (R$ 59,90/mês)</strong> ou{' '}
            <strong>Premium (R$ 99,90/mês)</strong> por{' '}
            <strong>
              90 dias totalmente grátis (R$ 0,00 nos 3 primeiros ciclos)
            </strong>
            . A partir do 4º mês aplica-se o valor padrão do plano, com aviso
            prévio e cancelamento livre sem multa. No ciclo anual você garante{' '}
            <strong>2 meses grátis</strong> (não cumulativo com os 90 dias
            grátis).
          </p>

          {launchOffer && !launchOffer.eligible && launchOffer.reason && (
            <p className="text-[11px] text-amber-900 font-medium">
              Observação para sua conta: {launchOffer.reason}
            </p>
          )}
        </div>

        {isLoggedProvider && providerContext && (
          <div className="max-w-4xl mx-auto pt-3 border-t border-brand-primary/10 flex flex-wrap items-center justify-between gap-3 text-left text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold text-brand-ink">
                Seu plano atual:{' '}
                <span className="text-brand-accent-strong">
                  {currentPlanObj.nome}
                </span>
                {subSummary?.subscription?.status && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-brand-background text-brand-ink/80 uppercase text-[10px] font-bold">
                    {subSummary.subscription.status}
                  </span>
                )}
              </p>
              {subSummary?.usage && (
                <p className="text-brand-ink/70">
                  Consumo no ciclo: {subSummary.usage.used ?? 0} de{' '}
                  {subSummary.usage.limit ??
                    currentPlanObj.limiteOportunidadesMensal}{' '}
                  oportunidades ({subSummary.usage.remaining ?? 0} restantes)
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigateUrl('/app/prestador')}
              className="px-4 py-2 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/15 text-brand-primary font-semibold cursor-pointer"
            >
              Gerenciar faturas no Painel →
            </button>
          </div>
        )}

        {actionFeedback && (
          <div
            role="status"
            className={`max-w-3xl mx-auto p-3.5 rounded-2xl text-xs font-medium flex flex-col sm:flex-row items-center justify-between gap-3 ${
              actionFeedback.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            }`}
          >
            <span>{actionFeedback.message}</span>
            {actionFeedback.checkoutUrl && (
              <a
                href={actionFeedback.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-semibold inline-flex items-center gap-1.5 shrink-0"
              >
                <span>Pagar no Asaas</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </section>

      {/* Cards dos 4 Planos Comerciais */}
      <section aria-label="Planos de Assinatura">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              cycle={cycle}
              launchOffer={launchOffer}
              actionType={
                isLoggedProvider
                  ? getSubscriptionActionType({
                      activeSubStatus: subSummary?.subscription?.status,
                      activeSubCycle: subSummary?.subscription?.ciclo,
                      currentPlan: currentPlanObj,
                      targetPlan: plan,
                      targetCycle: cycle,
                    })
                  : 'checkout'
              }
              onSelectPlan={handleSelectPlan}
            />
          ))}
        </div>
      </section>

      {/* Bloco CTA Programa de Indicação (+15 dias grátis por prestador) */}
      <section className="bg-gradient-to-r from-brand-primary to-brand-primary-hover text-white rounded-3xl p-6 sm:p-8 border border-brand-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-brand-accent-contrast text-[11px] font-semibold">
            <Gift className="w-3.5 h-3.5" />
            Programa de Indicação Recontrate · Só para cadastrados
          </span>
          <h2 className="font-display font-bold text-xl sm:text-2xl">
            Indique Profissionais: +15 Dias Grátis para Você e +10 Dias para o Indicado
          </h2>
          <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
            Usuários com cadastro ativo no Recontrate podem gerar seu link exclusivo
            ou enviar convites por WhatsApp. A cada profissional prestador de serviço
            indicado que concluir o cadastro e o onboarding profissional, você ganha{' '}
            <strong>+15 dias grátis</strong> e quem está se cadastrando com o código
            ganha <strong>+10 dias grátis extras</strong> na assinatura — sem
            pagamentos em dinheiro e acumulável sem limite.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onNavigateUrl(
              isLoggedIn || isLoggedProvider ? '/app/indicacoes' : '/criar-conta'
            )
          }
          className="min-h-[44px] px-5 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-xs sm:text-sm shrink-0 cursor-pointer"
        >
          {isLoggedIn || isLoggedProvider
            ? 'Acessar Painel de Indicações →'
            : 'Cadastrar para começar a indicar →'}
        </button>
      </section>

      {/* Comparativo Completo */}
      <PlansComparisonTable plans={plans} />

      {/* FAQ Comercial e Regras de Cobrança */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-5">
        <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
          Perguntas frequentes sobre os 90 dias grátis, cobrança e indicações
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-accent-strong" />
              Quais formas de pagamento são aceitas?
            </h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Todas as assinaturas são processadas via Asaas por Pix (aprovação
              imediata), Cartão de Crédito (renovação automática) ou Boleto Bancário,
              no ciclo mensal ou anual com 2 meses grátis.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-accent-strong" />
              Como funcionam os 90 dias grátis e os bônus por indicação (+15d / +10d)?
            </h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Novos prestadores recebem 90 dias grátis (3 ciclos mensais a R$ 0,00)
              nos planos pagos. Além disso, qualquer usuário cadastrado que indicar
              outros prestadores ganha +15 dias grátis por profissional validado, e
              quem se cadastrar com um código de indicação ganha +10 dias grátis
              extras na assinatura.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-accent-strong" />
              Posso mudar de plano ou cancelar a qualquer momento?
            </h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Sim! Upgrades têm efeito imediato com cobrança proporcional
              (pro-rata) aos dias restantes do ciclo. Downgrades e cancelamentos não
              têm multa e mantêm seus benefícios até o fim do período vigente.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-accent-strong" />
              A plataforma cobra comissão sobre o orçamento ou vende estrelas?
            </h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Nunca. O prestador não paga comissão para a plataforma — todo valor
              e pagamento do serviço são negociados diretamente com o cliente, fora
              da plataforma. A nota exibida vem apenas das avaliações reais, e os
              planos pagos apenas ampliam seu limite mensal de oportunidades e
              removem anúncios do painel.
            </p>
          </div>
        </div>
      </section>

      {/* Modal Comercial de Checkout / Upgrade / Downgrade */}
      {modalPlan && providerContext && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Contratar plano ${modalPlan.nome}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-brand-primary/15 space-y-5 my-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-brand-accent-strong uppercase tracking-wide">
                  {modalActionType === 'upgrade'
                    ? 'Upgrade Imediato (Pro-Rata)'
                    : modalActionType === 'downgrade'
                      ? 'Mudança de Plano Agendada'
                      : isFreePromoModal
                        ? 'Ativação Imediata · 90 Dias Grátis'
                        : 'Checkout Seguro · Asaas'}
                </p>
                <h2 className="font-display font-bold text-xl text-brand-ink mt-0.5">
                  Plano {modalPlan.nome}{' '}
                  {modalPlan.precoMensalCentavos > 0
                    ? `(${modalCycle === 'anual' ? 'Anual' : 'Mensal'})`
                    : ''}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setModalPlan(null)}
                className="p-2 rounded-xl hover:bg-brand-background text-brand-ink/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutOutcome ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                  <p className="font-bold text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {checkoutOutcome.statusLabel}
                  </p>
                  <p className="leading-relaxed">{checkoutOutcome.message}</p>
                </div>

                {checkoutOutcome.checkoutUrl && (
                  <a
                    href={checkoutOutcome.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold flex items-center justify-center gap-2"
                  >
                    <span>Ir para pagamento seguro no Asaas</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalPlan(null);
                      onNavigateUrl('/app/prestador');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-brand-primary text-white font-semibold cursor-pointer"
                  >
                    Abrir Painel do Prestador
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalPlan(null)}
                    className="px-4 py-2.5 rounded-xl bg-brand-background text-brand-ink font-semibold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmPlanAction} className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-brand-background/75 border border-brand-primary/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-brand-ink/75">
                      Limite mensal incluído:
                    </span>
                    <strong className="text-brand-ink">
                      Até {modalPlan.limiteOportunidadesMensal} oportunidades/mês
                    </strong>
                  </div>

                  {modalActionType === 'downgrade' ? (
                    <p className="text-brand-ink/80 leading-relaxed pt-1 border-t border-brand-primary/10">
                      Seu plano atual ({currentPlanObj.nome}) segue ativo até o fim
                      do ciclo vigente. A partir da próxima renovação sua conta muda
                      automaticamente para <strong>{modalPlan.nome}</strong>. Nenhuma
                      cobrança é gerada agora.
                    </p>
                  ) : modalActionType === 'upgrade' ? (
                    <div className="space-y-1 pt-1 border-t border-brand-primary/10">
                      <div className="flex items-center justify-between">
                        <span className="text-brand-ink/75">
                          Valor integral do novo ciclo:
                        </span>
                        <strong className="font-mono text-brand-ink">
                          {formatCentavosBRL(
                            modalCycle === 'anual'
                              ? modalPlan.precoAnualCentavos
                              : modalPlan.precoMensalCentavos
                          )}
                        </strong>
                      </div>
                      <p className="text-[11px] text-brand-link">
                        Ao confirmar, seus novos limites entram em vigor na hora e
                        será gerada uma fatura pro-rata referente apenas aos dias
                        restantes deste ciclo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 pt-1 border-t border-brand-primary/10">
                      <div className="flex items-center justify-between">
                        <span className="text-brand-ink/75">Valor hoje:</span>
                        <strong className="font-mono text-base text-brand-primary">
                          {modalPlan.precoMensalCentavos === 0
                            ? 'R$ 0,00'
                            : modalCycle === 'anual'
                              ? `${formatCentavosBRL(
                                  modalPlan.precoAnualCentavos
                                )}/ano`
                              : isFreePromoModal
                                ? 'R$ 0,00 (90 dias grátis)'
                                : `${formatCentavosBRL(
                                    modalPlan.precoMensalCentavos
                                  )}/mês`}
                        </strong>
                      </div>
                      {isFreePromoModal && (
                        <p className="text-[11px] text-emerald-700 font-medium">
                          Após os 90 dias grátis:{' '}
                          {formatCentavosBRL(modalPlan.precoMensalCentavos)}/mês ·
                          Cancele quando quiser sem multa.
                        </p>
                      )}
                      {modalCycle === 'mensal' &&
                        modalPlan.precoMensalCentavos > 0 &&
                        launchOffer?.eligible && (
                          <label className="flex items-center gap-2 pt-1 cursor-pointer text-emerald-800 font-medium">
                            <input
                              type="checkbox"
                              checked={applyLaunchOffer}
                              onChange={(e) =>
                                setApplyLaunchOffer(e.target.checked)
                              }
                            />
                            <span>
                              Aplicar Promoção de Lançamento (90 dias grátis)
                            </span>
                          </label>
                        )}
                    </div>
                  )}
                </div>

                {modalActionType !== 'downgrade' &&
                  modalPlan.precoMensalCentavos > 0 && (
                    <>
                      <div className="space-y-2">
                        <label className="font-semibold text-brand-ink block">
                          {isFreePromoModal
                            ? 'Forma de pagamento preferida após os 90 dias (Asaas)'
                            : 'Forma de pagamento (Asaas)'}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
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
                              className={`p-3 rounded-xl border font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                                paymentMethod === id
                                  ? 'bg-brand-primary text-white border-brand-primary'
                                  : 'bg-brand-background/60 text-brand-ink border-brand-primary/15'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-brand-ink block">
                            WhatsApp / Telefone *
                          </label>
                          <input
                            type="text"
                            required
                            value={billingPhone}
                            onChange={(e) => setBillingPhone(e.target.value)}
                            placeholder="(11) 99999-0000"
                            className="w-full px-3 py-2.5 rounded-xl border border-brand-primary/15"
                          />
                        </div>

                        {modalActionType === 'checkout' && (
                          <div className="space-y-1">
                            <label className="font-semibold text-brand-ink block">
                              CPF ou CNPJ{' '}
                              {isFreePromoModal ? '(opcional nos 90 dias)' : '*'}
                            </label>
                            <input
                              type="text"
                              required={!isFreePromoModal}
                              value={cpfCnpj}
                              onChange={(e) =>
                                setCpfCnpj(formatCpfCnpjInput(e.target.value))
                              }
                              placeholder="000.000.000-00"
                              className="w-full px-3 py-2.5 rounded-xl border border-brand-primary/15 font-mono"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                <div className="p-3.5 rounded-xl bg-brand-background/70 border border-brand-primary/10 text-[11px] text-brand-ink/80 space-y-1">
                  <p className="font-semibold text-brand-ink">
                    Transparência Comercial (CDC art. 31 e art. 49)
                  </p>
                  <p>
                    • Valor total informado acima sem taxas ocultas ou comissão sobre serviços (0% de comissão — todo serviço é negociado diretamente fora da plataforma).
                  </p>
                  <p>
                    • Renovação automática recorrente ao final de cada ciclo mensal ou anual até cancelamento direto em 1 clique no painel, sem fidelidade nem multa.
                  </p>
                  <p>
                    • <strong>Direito de arrependimento (7 dias):</strong> ao cancelar nos primeiros 7 dias corridos da contratação inicial, garantimos reembolso integral automático de eventual valor pago.
                  </p>
                </div>

                {checkoutError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalPlan(null)}
                    className="px-4 py-2.5 rounded-xl bg-brand-background text-brand-ink font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={checkoutSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {checkoutSubmitting
                      ? 'Processando...'
                      : modalActionType === 'upgrade'
                        ? 'Confirmar Upgrade Agora'
                        : modalActionType === 'downgrade'
                          ? 'Confirmar Agendamento'
                          : modalPlan.precoMensalCentavos === 0
                            ? 'Ativar Plano Gratuito'
                            : isFreePromoModal
                              ? 'Ativar 90 dias grátis agora'
                              : 'Gerar Cobrança no Asaas'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
