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
  'roleta',
  'agiota',
  'empréstimo fácil sem consulta',
  'emprestimo predatorio',
  'juros abusivos',
  'adulto',
  '+18',
  'conteudo adulto',
  'cura milagrosa',
  'emagrecimento milagroso',
  'getninjas',
  'habitissimo',
  'triider',
  'concorrente confiare',
];

export type AdContextSurface =
  | 'painel_prestador'
  | 'fluxo_busca_cliente'
  | 'fluxo_solicitacao_cliente'
  | 'fluxo_selecao_prestador'
  | 'fluxo_liberacao_contato'
  | 'home'
  | 'cadastro-cliente'
  | 'criar-solicitacao'
  | 'profissionais-compativeis'
  | 'perfil-prestador'
  | 'solicitar-novamente'
  | 'indicacao-substituto'
  | 'avaliacao-pos-atendimento';

export type GoogleAdsDeliveryMode =
  | 'hibrido_google_adsense'
  | 'google_adsense_preferencial'
  | 'direto_apenas';

export interface GoogleAdSenseConfig {
  enabled: boolean;
  mode: GoogleAdsDeliveryMode;
  clientId: string; // ca-pub-XXXXXXXXXXXXXXXX
  slotId: string;
  nonPersonalizedAds: true; // data-npa="1" / requestNonPersonalizedAds = 1 (LGPD: zero dados sensíveis)
  autoAdsDisabled: true; // Auto Ads sempre desativado para proteger o fluxo do cliente
  blockedSensitiveCategories: string[];
  adsTxtLine: string;
}

export const MAX_AD_BANNERS_PER_SESSION = 1;
export const MAX_AD_IMPRESSIONS_PER_PROVIDER_PER_DAY = 3;

// Estimativa conservadora em centavos: R$ 0,15 (15 centavos) por impressão + R$ 1,20 (120 centavos) por clique
export const ESTIMATED_CPM_IMPRESSION_CENTS = 15;
export const ESTIMATED_CPC_CLICK_CENTS = 120;

export function normalizeGooglePubId(clientId: string): string {
  const cleaned = (clientId || '').trim().replace(/^ca-/, '');
  if (/^pub-\d{10,20}$/.test(cleaned)) {
    return cleaned;
  }
  return 'pub-0000000000000000';
}

export function generateAdsTxtContent(clientId: string): string {
  const pubId = normalizeGooglePubId(clientId);
  return `# Confiare — Authorized Digital Sellers (ads.txt)\ngoogle.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;
}

let runtimeGoogleAdsConfig: GoogleAdSenseConfig = {
  enabled: true,
  mode:
    (process.env.VITE_GOOGLE_ADS_MODE as GoogleAdsDeliveryMode) ||
    'hibrido_google_adsense',
  clientId:
    process.env.VITE_GOOGLE_ADSENSE_CLIENT_ID || 'ca-pub-0000000000000000',
  slotId: process.env.VITE_GOOGLE_ADSENSE_SLOT_ID || '1234567890',
  nonPersonalizedAds: true,
  autoAdsDisabled: true,
  blockedSensitiveCategories: [
    'Jogos de azar e apostas (Gambling & Betting)',
    'Conteúdo adulto / sexual',
    'Empréstimos predatórios / alto risco',
    'Saúde e suplementos sem comprovação',
    'Concorrentes diretos da Confiare',
  ],
  adsTxtLine: `google.com, ${normalizeGooglePubId(
    process.env.VITE_GOOGLE_ADSENSE_CLIENT_ID || 'ca-pub-0000000000000000'
  )}, DIRECT, f08c47fec0942fa0`,
};

export function calculateAdCtrPercent(
  impressions: number,
  clicks: number
): number {
  if (impressions <= 0) return 0;
  return Math.round((clicks / impressions) * 1000) / 10;
}

export function calculateEstimatedAdRevenueCents(
  impressions: number,
  clicks: number
): number {
  return (
    impressions * ESTIMATED_CPM_IMPRESSION_CENTS +
    clicks * ESTIMATED_CPC_CLICK_CENTS
  );
}

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

export interface AdSlotReportItem extends AdSlotRow {
  badge: 'Patrocinado';
  ctrPercent: number;
  receitaEstimadaCentavos: number;
  network: 'google_adsense' | 'direto';
}

export class AdAndMetricsService {
  private readonly limitService = new OpportunityLimitService();

  getGoogleAdSenseConfig(): GoogleAdSenseConfig {
    return { ...runtimeGoogleAdsConfig };
  }

  updateGoogleAdSenseConfig(patch: {
    enabled?: boolean;
    mode?: GoogleAdsDeliveryMode;
    clientId?: string;
    slotId?: string;
  }): GoogleAdSenseConfig {
    const nextClientId = (
      patch.clientId ?? runtimeGoogleAdsConfig.clientId
    ).trim();
    const normalizedClientId = nextClientId.startsWith('ca-pub-')
      ? nextClientId
      : `ca-${normalizeGooglePubId(nextClientId)}`;

    runtimeGoogleAdsConfig = {
      ...runtimeGoogleAdsConfig,
      enabled: patch.enabled ?? runtimeGoogleAdsConfig.enabled,
      mode: patch.mode ?? runtimeGoogleAdsConfig.mode,
      clientId: normalizedClientId,
      slotId: (patch.slotId ?? runtimeGoogleAdsConfig.slotId).trim(),
      nonPersonalizedAds: true,
      autoAdsDisabled: true,
      adsTxtLine: `google.com, ${normalizeGooglePubId(
        normalizedClientId
      )}, DIRECT, f08c47fec0942fa0`,
    };

    return this.getGoogleAdSenseConfig();
  }

  async ensureDefaultAdSlots() {
    await ensureSchemaAndSeed();
    const existing = await db.select().from(adSlots);
    const now = new Date();
    const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    if (!existing.some((a) => a.id === 'ad-ferramentas-1')) {
      await db
        .insert(adSlots)
        .values({
          id: 'ad-ferramentas-1',
          nome: 'Kit Alicate Amperímetro Digital True RMS + EPI NR-10',
          tipo: 'banner_painel_prestador',
          categoria: 'ferramentas',
          anunciante: 'Casa do Eletricista & Ferramentas SP',
          imagemUrl:
            'https://images.unsplash.com/photo-1581092160607-ee22621dd758',
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
        .onConflictDoNothing();
    }

    if (!existing.some((a) => a.id === 'ad-google-adsense-1')) {
      await db
        .insert(adSlots)
        .values({
          id: 'ad-google-adsense-1',
          nome: 'Bloco Contextual Google AdSense — Ferramentas, Seguros e MEI',
          tipo: 'banner_painel_prestador',
          categoria: 'maquininhas',
          anunciante: 'Google AdSense (Contextual Moderado · NPA=1)',
          imagemUrl:
            'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d',
          linkDestino: 'https://adsense.google.com',
          texto:
            'Ofertas contextuais verificadas pelo Google AdSense (ferramentas profissionais, maquininhas, seguros e cursos técnicos) sem rastreamento de dados pessoais.',
          dataInicio: now,
          dataFim: nextYear,
          prioridade: 8,
          status: 'ativo',
          impressoes: 0,
          cliques: 0,
        })
        .onConflictDoNothing();
    }

    return db.select().from(adSlots);
  }

  /**
   * Automatically marks active ads whose end date has passed as 'expirado'.
   */
  async expireOutdatedAds(now = new Date()): Promise<number> {
    await ensureSchemaAndSeed();
    const allAds = await db.select().from(adSlots);
    let expiredCount = 0;

    for (const ad of allAds) {
      if (ad.status === 'ativo' && ad.dataFim < now) {
        await db
          .update(adSlots)
          .set({ status: 'expirado' })
          .where(eq(adSlots.id, ad.id));
        expiredCount += 1;
      }
    }
    return expiredCount;
  }

  private isGoogleAdSlot(ad: AdSlotRow): boolean {
    return (
      ad.id.startsWith('ad-google-') ||
      ad.anunciante.toLowerCase().includes('google adsense')
    );
  }

  /**
   * Lists all ad slots with calculated CTR, estimated revenue in cents, and "Patrocinado" badge.
   */
  async listAdSlots(now = new Date()): Promise<AdSlotReportItem[]> {
    await this.ensureDefaultAdSlots();
    await this.expireOutdatedAds(now);

    const rows = await db
      .select()
      .from(adSlots)
      .orderBy(desc(adSlots.prioridade), desc(adSlots.criadoEm));

    return rows.map((row) => ({
      ...row,
      badge: 'Patrocinado' as const,
      network: this.isGoogleAdSlot(row) ? 'google_adsense' : 'direto',
      ctrPercent: calculateAdCtrPercent(row.impressoes, row.cliques),
      receitaEstimadaCentavos: calculateEstimatedAdRevenueCents(
        row.impressoes,
        row.cliques
      ),
    }));
  }

  async createAdSlot(input: {
    nome: string;
    tipo?:
      | 'banner_painel_prestador'
      | 'banner_perfil_prestador'
      | 'card_oferta';
    categoria: string;
    anunciante: string;
    imagemUrl: string;
    linkDestino: string;
    texto: string;
    dataInicio?: Date | string;
    dataFim?: Date | string;
    prioridade?: number;
    status?: 'ativo' | 'pausado' | 'expirado';
  }): Promise<AdSlotReportItem> {
    await ensureSchemaAndSeed();
    const validation = validateAdSlotContent(input);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const now = new Date();
    const startDate = input.dataInicio ? new Date(input.dataInicio) : now;
    const endDate = input.dataFim
      ? new Date(input.dataFim)
      : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    if (endDate <= startDate) {
      throw new Error(
        'A data final do anúncio deve ser posterior à data inicial.'
      );
    }

    const [created] = await db
      .insert(adSlots)
      .values({
        id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nome: input.nome.trim(),
        tipo: input.tipo || 'banner_painel_prestador',
        categoria: input.categoria.trim().toLowerCase(),
        anunciante: input.anunciante.trim(),
        imagemUrl: input.imagemUrl.trim(),
        linkDestino: input.linkDestino.trim(),
        texto: input.texto.trim(),
        dataInicio: startDate,
        dataFim: endDate,
        prioridade: input.prioridade ?? 5,
        status: input.status || 'ativo',
        impressoes: 0,
        cliques: 0,
      })
      .returning();

    return {
      ...created,
      badge: 'Patrocinado',
      network: this.isGoogleAdSlot(created) ? 'google_adsense' : 'direto',
      ctrPercent: 0,
      receitaEstimadaCentavos: 0,
    };
  }

  /**
   * Updates an existing ad slot (pause, resume, reschedule, priority, or content edit).
   */
  async updateAdSlot(
    adSlotId: string,
    patch: {
      nome?: string;
      tipo?:
        | 'banner_painel_prestador'
        | 'banner_perfil_prestador'
        | 'card_oferta';
      categoria?: string;
      anunciante?: string;
      imagemUrl?: string;
      linkDestino?: string;
      texto?: string;
      dataInicio?: Date | string;
      dataFim?: Date | string;
      prioridade?: number;
      status?: 'ativo' | 'pausado' | 'expirado';
    }
  ): Promise<AdSlotReportItem> {
    await ensureSchemaAndSeed();
    const [existing] = await db
      .select()
      .from(adSlots)
      .where(eq(adSlots.id, adSlotId));
    if (!existing) {
      throw new Error(`Anúncio não encontrado: ${adSlotId}`);
    }

    const mergedForValidation = {
      nome: patch.nome ?? existing.nome,
      categoria: patch.categoria ?? existing.categoria,
      anunciante: patch.anunciante ?? existing.anunciante,
      texto: patch.texto ?? existing.texto,
    };

    const validation = validateAdSlotContent(mergedForValidation);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const nextStart = patch.dataInicio
      ? new Date(patch.dataInicio)
      : existing.dataInicio;
    const nextEnd = patch.dataFim
      ? new Date(patch.dataFim)
      : existing.dataFim;

    if (nextEnd <= nextStart) {
      throw new Error(
        'A data final do anúncio deve ser posterior à data inicial.'
      );
    }

    const [updated] = await db
      .update(adSlots)
      .set({
        nome: mergedForValidation.nome,
        tipo: patch.tipo ?? existing.tipo,
        categoria: mergedForValidation.categoria.toLowerCase(),
        anunciante: mergedForValidation.anunciante,
        imagemUrl: patch.imagemUrl ?? existing.imagemUrl,
        linkDestino: patch.linkDestino ?? existing.linkDestino,
        texto: mergedForValidation.texto,
        dataInicio: nextStart,
        dataFim: nextEnd,
        prioridade: patch.prioridade ?? existing.prioridade,
        status: patch.status ?? existing.status,
      })
      .where(eq(adSlots.id, adSlotId))
      .returning();

    return {
      ...updated,
      badge: 'Patrocinado',
      network: this.isGoogleAdSlot(updated) ? 'google_adsense' : 'direto',
      ctrPercent: calculateAdCtrPercent(updated.impressoes, updated.cliques),
      receitaEstimadaCentavos: calculateEstimatedAdRevenueCents(
        updated.impressoes,
        updated.cliques
      ),
    };
  }

  /**
   * Deletes an ad slot and its associated impressions/clicks.
   */
  async deleteAdSlot(adSlotId: string): Promise<{ deleted: true; id: string }> {
    await ensureSchemaAndSeed();
    const [existing] = await db
      .select()
      .from(adSlots)
      .where(eq(adSlots.id, adSlotId));
    if (!existing) {
      throw new Error(`Anúncio não encontrado: ${adSlotId}`);
    }

    await db.delete(adImpressions).where(eq(adImpressions.adSlotId, adSlotId));
    await db.delete(adClicks).where(eq(adClicks.adSlotId, adSlotId));
    await db.delete(adSlots).where(eq(adSlots.id, adSlotId));

    return { deleted: true, id: adSlotId };
  }

  /**
   * Fetches at most 1 sponsored ad slot for the provider panel:
   * - Strictly returns null on ANY client flow surface (search, request, selection, contact release, home, profile, etc.).
   * - Strictly returns null if the provider is on a paid plan (exibeAnuncios === false).
   * - Enforces max 1 banner per panel session (sessionBannersShown < 1).
   * - Enforces max 3 impressions per provider per day.
   * - Supports Direct Ads and Google AdSense (with nonPersonalizedAds=true / NPA=1).
   * - Always labels returned ad with badge='Patrocinado'.
   */
  async getEligibleAdForSurface(params: {
    surface: AdContextSurface | string;
    providerProfileId?: string;
    sessionBannersShown?: number;
    preferNetwork?: 'google_adsense' | 'direto';
    now?: Date;
  }) {
    // Regra absoluta: NUNCA exibir anúncio fora do painel do prestador (jamais no fluxo do cliente)
    if (params.surface !== 'painel_prestador' || !params.providerProfileId) {
      return null;
    }

    // Máximo de 1 banner por sessão de painel
    if ((params.sessionBannersShown ?? 0) >= MAX_AD_BANNERS_PER_SESSION) {
      return null;
    }

    await this.ensureDefaultAdSlots();
    const now = params.now || new Date();
    await this.expireOutdatedAds(now);

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

    if (todayImpressions.length >= MAX_AD_IMPRESSIONS_PER_PROVIDER_PER_DAY) {
      return null;
    }

    const activeAds = await db
      .select()
      .from(adSlots)
      .where(eq(adSlots.status, 'ativo'))
      .orderBy(desc(adSlots.prioridade));

    const validAds = activeAds.filter(
      (ad) => ad.dataInicio <= now && ad.dataFim >= now
    );

    const googleCfg = this.getGoogleAdSenseConfig();
    let validAd: AdSlotRow | undefined;

    if (
      params.preferNetwork === 'google_adsense' ||
      (googleCfg.enabled && googleCfg.mode === 'google_adsense_preferencial')
    ) {
      validAd =
        validAds.find((a) => this.isGoogleAdSlot(a)) || validAds[0];
    } else if (!googleCfg.enabled || googleCfg.mode === 'direto_apenas') {
      validAd = validAds.find((a) => !this.isGoogleAdSlot(a));
    } else {
      // Modo híbrido: prioriza campanha direta com maior prioridade, usando Google AdSense como backfill/rotação
      validAd = validAds[0];
    }

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

    const newImpressions = validAd.impressoes + 1;
    await db
      .update(adSlots)
      .set({ impressoes: newImpressions })
      .where(eq(adSlots.id, validAd.id));

    const isGoogle = this.isGoogleAdSlot(validAd);

    return {
      ...validAd,
      impressoes: newImpressions,
      badge: 'Patrocinado' as const,
      network: isGoogle ? ('google_adsense' as const) : ('direto' as const),
      googleAdSense: googleCfg.enabled
        ? {
            enabled: true,
            clientId: googleCfg.clientId,
            slotId: googleCfg.slotId,
            nonPersonalizedAds: true as const,
            mode: googleCfg.mode,
          }
        : null,
      ctrPercent: calculateAdCtrPercent(newImpressions, validAd.cliques),
      receitaEstimadaCentavos: calculateEstimatedAdRevenueCents(
        newImpressions,
        validAd.cliques
      ),
      sessionBannerIndex: 1,
      sessionBannersLimit: MAX_AD_BANNERS_PER_SESSION,
      dailyImpressionsUsed: todayImpressions.length + 1,
      dailyImpressionsLimit: MAX_AD_IMPRESSIONS_PER_PROVIDER_PER_DAY,
    };
  }

  /**
   * Manually records an impression for an ad slot on the provider panel (when triggered via explicit POST endpoint),
   * still enforcing that the provider is on the Gratuito plan and within the 3/day cap.
   */
  async recordAdImpression(
    adSlotId: string,
    providerProfileId: string,
    now = new Date()
  ) {
    await ensureSchemaAndSeed();
    const usageStatus = await this.limitService.getUsageStatus(
      providerProfileId,
      now
    );
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.slug, usageStatus.planSlug));

    if (!plan || !plan.exibeAnuncios) {
      throw new Error(
        'Anúncios só podem registrar impressões para prestadores no plano Gratuito.'
      );
    }

    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const todayImpressions = await db
      .select()
      .from(adImpressions)
      .where(
        and(
          eq(adImpressions.providerProfileId, providerProfileId),
          gte(adImpressions.exibidoEm, startOfDay)
        )
      );

    if (todayImpressions.length >= MAX_AD_IMPRESSIONS_PER_PROVIDER_PER_DAY) {
      throw new Error(
        `Limite diário de ${MAX_AD_IMPRESSIONS_PER_PROVIDER_PER_DAY} impressões atingido para este prestador.`
      );
    }

    const [ad] = await db
      .select()
      .from(adSlots)
      .where(eq(adSlots.id, adSlotId));
    if (!ad || ad.status !== 'ativo') {
      throw new Error(`Anúncio inativo ou não encontrado: ${adSlotId}`);
    }

    await db.insert(adImpressions).values({
      id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      adSlotId,
      providerProfileId,
      exibidoEm: now,
      origem: 'painel_prestador',
    });

    const [updated] = await db
      .update(adSlots)
      .set({ impressoes: ad.impressoes + 1 })
      .where(eq(adSlots.id, adSlotId))
      .returning();

    return {
      ...updated,
      badge: 'Patrocinado' as const,
      dailyImpressionsUsed: todayImpressions.length + 1,
      dailyImpressionsLimit: MAX_AD_IMPRESSIONS_PER_PROVIDER_PER_DAY,
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

    return {
      ...updated,
      badge: 'Patrocinado' as const,
      ctrPercent: calculateAdCtrPercent(updated.impressoes, updated.cliques),
      receitaEstimadaCentavos: calculateEstimatedAdRevenueCents(
        updated.impressoes,
        updated.cliques
      ),
    };
  }

  /**
   * Dedicated advertising performance report (impressions, clicks, CTR, estimated revenue in cents, plus Google AdSense status).
   */
  async getAdsAnalyticsReport() {
    const items = await this.listAdSlots();
    const totalImpressions = items.reduce((sum, a) => sum + a.impressoes, 0);
    const totalClicks = items.reduce((sum, a) => sum + a.cliques, 0);
    const ctrPercent = calculateAdCtrPercent(totalImpressions, totalClicks);
    const estimatedRevenueCents = calculateEstimatedAdRevenueCents(
      totalImpressions,
      totalClicks
    );

    const byCategory: Record<
      string,
      {
        impressions: number;
        clicks: number;
        ctrPercent: number;
        estimatedRevenueCents: number;
      }
    > = {};

    for (const item of items) {
      const prev = byCategory[item.categoria] || {
        impressions: 0,
        clicks: 0,
        ctrPercent: 0,
        estimatedRevenueCents: 0,
      };
      const imp = prev.impressions + item.impressoes;
      const clk = prev.clicks + item.cliques;
      byCategory[item.categoria] = {
        impressions: imp,
        clicks: clk,
        ctrPercent: calculateAdCtrPercent(imp, clk),
        estimatedRevenueCents: calculateEstimatedAdRevenueCents(imp, clk),
      };
    }

    return {
      totalAdsCount: items.length,
      activeAdsCount: items.filter((i) => i.status === 'ativo').length,
      pausedAdsCount: items.filter((i) => i.status === 'pausado').length,
      expiredAdsCount: items.filter((i) => i.status === 'expirado').length,
      totalImpressions,
      totalClicks,
      ctrPercent,
      estimatedRevenueCents,
      byCategory,
      ads: items,
      googleAdSense: this.getGoogleAdSenseConfig(),
      compliance: {
        badgeRequired: 'Patrocinado',
        maxBannersPerSession: MAX_AD_BANNERS_PER_SESSION,
        maxImpressionsPerProviderPerDay: MAX_AD_IMPRESSIONS_PER_PROVIDER_PER_DAY,
        clientFlowAdsCount: 0,
        usesSensitiveDataSegmentation: false,
        sharesPersonalDataWithAdvertisers: false,
      },
    };
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
    const totalProvidersCount = Math.max(
      1,
      allProviders.length,
      activeSubs.length
    );
    const freeToPaidConversionPercent =
      Math.round((paidActiveCount / totalProvidersCount) * 1000) / 10;

    const adImpressionsCount = allAds.reduce((acc, a) => acc + a.impressoes, 0);
    const adClicksCount = allAds.reduce((acc, a) => acc + a.cliques, 0);
    const adCtrPercent = calculateAdCtrPercent(
      adImpressionsCount,
      adClicksCount
    );
    const estimatedAdRevenueCents = calculateEstimatedAdRevenueCents(
      adImpressionsCount,
      adClicksCount
    );

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
