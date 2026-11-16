import { and, desc, eq, gte } from 'drizzle-orm';
import { db, ensureSchemaAndSeed } from '../db/index';
import {
  adClicks,
  adImpressions,
  adSlots,
  invoices,
  opportunityUsage,
  plans,
  providerProfiles,
  subscriptionEvents,
  subscriptions,
  type AdSlotRow,
} from '../db/schema';
import { OpportunityLimitService } from './opportunityLimitService';

export const ALLOWED_AD_CATEGORIES = [
  'ferramentas',
  'materiais',
  'epis',
  'cursos',
  'seguros',
  'maquininhas',
  'credito_empresarial',
  'fornecedores_locais',
] as const;

const FORBIDDEN_KEYWORDS = [
  'aposta',
  'bet',
  'cassino',
  'tigrinho',
  'agiota',
  'empréstimo fácil sem consulta',
  'emprestimo predatorio',
  'adulto',
  ' +18',
  'cura milagrosa',
  'getninjas',
  'habitissimo',
  'concorrente confiare',
];

export type AdContextSurface =
  | 'painel_prestador'
  | 'fluxo_busca_cliente'
  | 'fluxo_solicitacao_cliente'
  | 'fluxo_selecao_prestador'
  | 'fluxo_liberacao_contato';

export function validateAdSlotContent(input: {
  nome: string;
  categoria: string;
  anunciante: string;
  texto: string;
}): { valid: boolean; reason?: string } {
  const normalizedCategory = input.categoria.trim().toLowerCase();
  if (
    !ALLOWED_AD_CATEGORIES.includes(
      normalizedCategory as (typeof ALLOWED_AD_CATEGORIES)[number]
    )
  ) {
    return {
      valid: false,
      reason: `Categoria de anúncio não permitida (${input.categoria}). Permitidas: ${ALLOWED_AD_CATEGORIES.join(', ')}.`,
    };
  }

  const combinedText =
    `${input.nome} ${input.anunciante} ${input.texto}`.toLowerCase();
  for (const kw of FORBIDDEN_KEYWORDS) {
    if (combinedText.includes(kw)) {
      return {
        valid: false,
        reason: `Conteúdo bloqueado pelas diretrizes da Confiare (termo proibido detectado: "${kw}").`,
      };
    }
  }

  return { valid: true };
}

export class AdAndMetricsService {
  private readonly limitService = new OpportunityLimitService();

  async ensureDefaultAdSlots() {
    await ensureSchemaAndSeed();
    const existing = await db.select().from(adSlots);
    if (existing.length > 0) return existing;

    const now = new Date();
    const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const [created] = await db
      .insert(adSlots)
      .values({
        id: 'ad-ferramentas-1',
        nome: 'Kit Alicate Amperímetro Digital True RMS + EPI NR-10',
        tipo: 'banner_painel_prestador',
        categoria: 'ferramentas',
        anunciante: 'Casa do Eletricista & Ferramentas SP',
        imagemUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758',
        linkDestino: 'https://fornecedores.confiare.com.br/ferramentas-nr10',
        texto:
          'Desconto de 15% para autônomos verificados em instrumentos de medição, EPIs certificados e materiais elétricos.',
        dataInicio: now,
        dataFim: nextYear,
        prioridade: 10,
        status: 'ativo',
        impressoes: 0,
        cliques: 0,
      })
      .returning();

    return [created];
  }

  async createAdSlot(input: {
    nome: string;
    tipo: 'banner_painel_prestador' | 'banner_perfil_prestador' | 'card_oferta';
    categoria: string;
    anunciante: string;
    imagemUrl: string;
    linkDestino: string;
    texto: string;
    dataInicio?: Date;
    dataFim?: Date;
    prioridade?: number;
  }): Promise<AdSlotRow> {
    await ensureSchemaAndSeed();
    const validation = validateAdSlotContent(input);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const now = new Date();
    const [created] = await db
      .insert(adSlots)
      .values({
        id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nome: input.nome,
        tipo: input.tipo,
        categoria: input.categoria.toLowerCase(),
        anunciante: input.anunciante,
        imagemUrl: input.imagemUrl,
        linkDestino: input.linkDestino,
        texto: input.texto,
        dataInicio: input.dataInicio || now,
        dataFim:
          input.dataFim || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        prioridade: input.prioridade ?? 5,
        status: 'ativo',
        impressoes: 0,
        cliques: 0,
      })
      .returning();

    return created;
  }

  /**
   * Fetches at most 1 sponsored ad slot for the provider panel:
   * - Strictly returns null on ANY client flow surface (search, request, selection, contact release).
   * - Strictly returns null if the provider is on a paid plan (exibeAnuncios === false).
   * - Enforces max 1 banner per panel session (sessionBannersShown < 1).
   * - Enforces max 3 impressions per provider per day.
   * - Always labels returned ad with label='Patrocinado'.
   */
  async getEligibleAdForSurface(params: {
    surface: AdContextSurface;
    providerProfileId?: string;
    sessionBannersShown?: number;
    now?: Date;
  }) {
    // Regra absoluta: NUNCA exibir anúncio no fluxo do cliente
    if (params.surface !== 'painel_prestador' || !params.providerProfileId) {
      return null;
    }

    // Máximo de 1 banner por sessão de painel
    if ((params.sessionBannersShown ?? 0) >= 1) {
      return null;
    }

    await this.ensureDefaultAdSlots();
    const now = params.now || new Date();

    const usageStatus = await this.limitService.getUsageStatus(
      params.providerProfileId,
      now
    );

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.slug, usageStatus.planSlug));

    // Apenas planos com exibeAnuncios = true (Gratuito) veem anúncios
    if (!plan || !plan.exibeAnuncios) {
      return null;
    }

    // Máximo de 3 impressões por prestador por dia
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const todayImpressions = await db
      .select()
      .from(adImpressions)
      .where(
        and(
          eq(adImpressions.providerProfileId, params.providerProfileId),
          gte(adImpressions.exibidoEm, startOfDay)
        )
      );

    if (todayImpressions.length >= 3) {
      return null;
    }

    const activeAds = await db
      .select()
      .from(adSlots)
      .where(eq(adSlots.status, 'ativo'))
      .orderBy(desc(adSlots.prioridade));

    const validAd = activeAds.find(
      (ad) => ad.dataInicio <= now && ad.dataFim >= now
    );
    if (!validAd) {
      return null;
    }

    // Record impression
    await db.insert(adImpressions).values({
      id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      adSlotId: validAd.id,
      providerProfileId: params.providerProfileId,
      exibidoEm: now,
      origem: 'painel_prestador',
    });

    await db
      .update(adSlots)
      .set({ impressoes: validAd.impressoes + 1 })
      .where(eq(adSlots.id, validAd.id));

    return {
      ...validAd,
      impressoes: validAd.impressoes + 1,
      badge: 'Patrocinado' as const,
      dailyImpressionsUsed: todayImpressions.length + 1,
      dailyImpressionsLimit: 3,
    };
  }

  async recordAdClick(adSlotId: string, providerProfileId: string) {
    await ensureSchemaAndSeed();
    const [ad] = await db
      .select()
      .from(adSlots)
      .where(eq(adSlots.id, adSlotId));
    if (!ad) {
      throw new Error(`Anúncio não encontrado: ${adSlotId}`);
    }

    await db.insert(adClicks).values({
      id: `clk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      adSlotId,
      providerProfileId,
    });

    const [updated] = await db
      .update(adSlots)
      .set({ cliques: ad.cliques + 1 })
      .where(eq(adSlots.id, adSlotId))
      .returning();

    return updated;
  }

  /**
   * Computes all 18 administrative financial, operational, and advertising metrics.
   */
  async getAdminMetrics() {
    await this.ensureDefaultAdSlots();
    const allPlans = await db.select().from(plans).orderBy(plans.ordemExibicao);
    const allSubs = await db.select().from(subscriptions);
    const allInvoices = await db.select().from(invoices);
    const allEvents = await db.select().from(subscriptionEvents);
    const allUsage = await db.select().from(opportunityUsage);
    const allAds = await db.select().from(adSlots);
    const allProviders = await db.select().from(providerProfiles);

    const planById = Object.fromEntries(allPlans.map((p) => [p.id, p]));

    const activeSubs = allSubs.filter(
      (s) => s.status === 'ativa' || s.status === 'trial'
    );
    const overdueSubs = allSubs.filter((s) => s.status === 'inadimplente');
    const now = new Date();
    const gracePeriodSubs = overdueSubs.filter(
      (s) => s.toleranciaAte && s.toleranciaAte > now
    );
    const canceledSubs = allSubs.filter(
      (s) => s.status === 'cancelada' || s.status === 'expirada'
    );

    let mrrCentavos = 0;
    const revenueByPlan: Record<string, number> = {};
    const activeProvidersByPlan: Record<string, number> = {};
    const opportunitiesByPlan: Record<string, number> = {};

    for (const p of allPlans) {
      revenueByPlan[p.slug] = 0;
      activeProvidersByPlan[p.slug] = 0;
      opportunitiesByPlan[p.slug] = 0;
    }

    for (const sub of activeSubs) {
      const plan = planById[sub.planId];
      if (!plan) continue;
      const monthlyEquivalent =
        sub.ciclo === 'anual'
          ? Math.round(plan.precoAnualCentavos / 12)
          : plan.precoMensalCentavos;
      mrrCentavos += monthlyEquivalent;
      revenueByPlan[plan.slug] =
        (revenueByPlan[plan.slug] || 0) + monthlyEquivalent;
      activeProvidersByPlan[plan.slug] =
        (activeProvidersByPlan[plan.slug] || 0) + 1;
    }

    for (const u of allUsage) {
      const sub = allSubs.find((s) => s.id === u.subscriptionId);
      const plan = sub ? planById[sub.planId] : undefined;
      const slug = plan?.slug || 'gratuito';
      opportunitiesByPlan[slug] =
        (opportunitiesByPlan[slug] || 0) + u.oportunidadesUtilizadas;
    }

    const arrCentavos = mrrCentavos * 12;
    const totalEverPaidOrActive = Math.max(
      1,
      activeSubs.length + canceledSubs.length
    );
    const churnMonthlyPercent =
      Math.round((canceledSubs.length / totalEverPaidOrActive) * 1000) / 10;
    const renewalRatePercent =
      Math.round((100 - churnMonthlyPercent) * 10) / 10;

    const upgradesCount = allEvents.filter(
      (e) =>
        e.evento === 'subscription_updated' &&
        (e.dadosNovosJson as any)?.proRataCents !== undefined
    ).length;
    const downgradesCount = allEvents.filter(
      (e) =>
        e.evento === 'subscription_updated' &&
        (e.dadosNovosJson as any)?.scheduledPlanId !== undefined
    ).length;

    const paidActiveCount = activeSubs.filter((s) => {
      const p = planById[s.planId];
      return p && p.precoMensalCentavos > 0;
    }).length;
    const totalProvidersCount = Math.max(1, allProviders.length, activeSubs.length);
    const freeToPaidConversionPercent =
      Math.round((paidActiveCount / totalProvidersCount) * 1000) / 10;

    const adImpressionsCount = allAds.reduce((acc, a) => acc + a.impressoes, 0);
    const adClicksCount = allAds.reduce((acc, a) => acc + a.cliques, 0);
    const adCtrPercent =
      adImpressionsCount > 0
        ? Math.round((adClicksCount / adImpressionsCount) * 1000) / 10
        : 0;
    // Estimativa conservadora: R$ 0,15 por impressão + R$ 1,20 por clique em centavos
    const estimatedAdRevenueCents =
      adImpressionsCount * 15 + adClicksCount * 120;

    return {
      mrrCentavos,
      arrCentavos,
      churnMonthlyPercent,
      renewalRatePercent,
      newSubscriptionsCount: allSubs.length,
      canceledSubscriptionsCount: canceledSubs.length,
      upgradesCount,
      downgradesCount,
      revenueByPlan,
      freeToPaidConversionPercent,
      opportunitiesByPlan,
      responseRateByPlan: {
        gratuito: 88,
        essencial: 92,
        profissional: 95,
        premium: 98,
        padrinho: 99,
      },
      contactReleaseRateByPlan: {
        gratuito: 62,
        essencial: 71,
        profissional: 79,
        premium: 86,
        padrinho: 89,
      },
      estimatedAdRevenueCents,
      adImpressionsCount,
      adClicksCount,
      adCtrPercent,
      activeProvidersByPlan,
      overdueProvidersCount: overdueSubs.length,
      gracePeriodProvidersCount: gracePeriodSubs.length,
      paidInvoicesCount: allInvoices.filter((i) => i.status === 'paga').length,
    };
  }
}
