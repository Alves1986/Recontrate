export interface PlanPricingDisplay {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  precoMensalCentavos: number;
  precoAnualCentavos: number;
  limiteOportunidadesMensal: number;
  prioridadeMatching: number;
  prioridadeLabel: string;
  permiteDestaque: boolean;
  permiteRelatoriosAvancados: boolean;
  permitePortfolioIlimitado: boolean;
  limiteFotosPortfolio: number | null;
  suportePrioritario: boolean;
  selo: string | null;
  exibeAnuncios: boolean;
  ordemExibicao: number;
}

/**
 * Calcula o valor equivalente mensal (em centavos inteiros) para um plano pago anualmente.
 * Exemplo: Profissional R$ 599,00/ano (59900 centavos) -> 4992 centavos (R$ 49,92/mês).
 */
export function calculateAnnualMonthlyEquivalentCentavos(
  precoAnualCentavos: number
): number {
  if (!Number.isFinite(precoAnualCentavos) || precoAnualCentavos <= 0) {
    return 0;
  }
  return Math.round(precoAnualCentavos / 12);
}

/**
 * Calcula a economia anual exata (em centavos inteiros) comparando 12 cobranças mensais
 * versus o valor da assinatura anual (equivalente a 10 meses, 2 meses grátis).
 * Exemplo: Profissional (5990 * 12) - 59900 = 11980 centavos (R$ 119,80).
 */
export function calculateAnnualSavingsCentavos(
  precoMensalCentavos: number,
  precoAnualCentavos: number
): number {
  if (
    !Number.isFinite(precoMensalCentavos) ||
    !Number.isFinite(precoAnualCentavos) ||
    precoMensalCentavos <= 0
  ) {
    return 0;
  }
  return Math.max(0, precoMensalCentavos * 12 - precoAnualCentavos);
}

/**
 * Formata um valor inteiro em centavos para moeda brasileira (BRL).
 */
export function formatCentavosBRL(centavos: number): string {
  const safe = Number.isFinite(centavos) ? Math.round(centavos) : 0;
  return (safe / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
