import { createHash } from 'node:crypto';
import { ensureSchemaAndSeed, pool } from '../db/index';
import {
  TransactionalEmailService,
  WhatsAppBusinessService,
} from './essentialIntegrations';

const emailService = new TransactionalEmailService();
const whatsappService = new WhatsAppBusinessService();

export const LAUNCH_OFFER_SLUG = 'lancamento-50-off-3-meses';

export const LAUNCH_OFFER_ELIGIBLE_PLANS = [
  'essencial',
  'profissional',
  'premium',
  'padrinho',
] as const;

export const LAUNCH_OFFER_PRICES_CENTAVOS: Record<
  string,
  { full: number; promo: number }
> = {
  essencial: { full: 2990, promo: 1495 },
  profissional: { full: 5990, promo: 2995 },
  premium: { full: 9990, promo: 4995 },
  padrinho: { full: 10990, promo: 5495 },
};

export interface LaunchOfferUserInput {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  cpfCnpj?: string | null;
  deviceFingerprint?: string | null;
  ipAddress?: string | null;
}

export interface LaunchOfferProviderInput {
  providerProfileId?: string | null;
  whatsapp?: string | null;
  cpfCnpj?: string | null;
}

export interface LaunchOfferEligibilityOptions {
  planSlug?: string | null;
  cycle?: 'mensal' | 'anual' | string | null;
  now?: Date;
  campaignSlug?: string;
}

export interface LaunchOfferEligibilityResult {
  eligible: boolean;
  resultado: 'elegivel' | 'inelegivel' | 'bloqueado';
  reason?: string;
  campaignId?: string;
  campaignName?: string;
  discountPercent: number;
  durationCycles: number;
  eligiblePlans: string[];
  fullPricesCentavos: Record<string, number>;
  promoPricesCentavos: Record<string, number>;
  selectedPlanFullCentavos?: number;
  selectedPlanPromoCentavos?: number;
  fullPriceStartDate?: string;
}

export function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

export function normalizeDigits(value?: string | null): string {
  return (value || '').replace(/\D/g, '');
}

export function hashIpAddress(ip?: string | null): string {
  if (!ip) return '';
  return createHash('sha256').update(ip.trim()).digest('hex').slice(0, 32);
}

async function logEligibilityCheck(params: {
  userId?: string | null;
  providerProfileId?: string | null;
  campaignId: string;
  emailNorm: string;
  phoneNorm: string;
  docNorm: string;
  fingerprint: string;
  ipHash: string;
  resultado: 'elegivel' | 'inelegivel' | 'bloqueado';
  motivo: string;
}) {
  const id = `elig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await pool.query(
    `INSERT INTO promotion_eligibility_checks (
      id, user_id, provider_profile_id, campaign_id,
      email_normalizado, telefone_normalizado, documento_normalizado,
      fingerprint_dispositivo, ip_hash, resultado, motivo
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      id,
      params.userId || null,
      params.providerProfileId || null,
      params.campaignId,
      params.emailNorm,
      params.phoneNorm,
      params.docNorm,
      params.fingerprint,
      params.ipHash,
      params.resultado,
      params.motivo,
    ]
  );
}

/**
 * Função central de elegibilidade para a campanha:
 * "Oferta de lançamento: 50% de desconto nos 3 primeiros meses."
 *
 * Verifica se o prestador é novo, nunca teve assinatura paga, não reutilizou
 * e-mail/telefone/CPF-CNPJ/dispositivo de outra conta, se a campanha está ativa
 * no período vigente, dentro do limite de resgates e se o plano/ciclo é elegível.
 */
export async function checkLaunchOfferEligibility(
  user: LaunchOfferUserInput,
  providerProfile: LaunchOfferProviderInput,
  options: LaunchOfferEligibilityOptions = {}
): Promise<LaunchOfferEligibilityResult> {
  await ensureSchemaAndSeed();

  const now = options.now || new Date();
  const campaignSlug = options.campaignSlug || LAUNCH_OFFER_SLUG;

  const { rows: campRows } = await pool.query(
    `SELECT * FROM promotional_campaigns WHERE slug = $1 LIMIT 1`,
    [campaignSlug]
  );

  if (campRows.length === 0) {
    return {
      eligible: false,
      resultado: 'inelegivel',
      reason: 'A campanha encerrou.',
      discountPercent: 50,
      durationCycles: 3,
      eligiblePlans: [...LAUNCH_OFFER_ELIGIBLE_PLANS],
      fullPricesCentavos: {
        essencial: 2990,
        profissional: 5990,
        premium: 9990,
        padrinho: 10990,
      },
      promoPricesCentavos: {
        essencial: 1495,
        profissional: 2995,
        premium: 4995,
        padrinho: 5495,
      },
    };
  }

  const camp = campRows[0];
  const eligiblePlans: string[] = Array.isArray(camp.planos_elegiveis_json)
    ? camp.planos_elegiveis_json
    : [...LAUNCH_OFFER_ELIGIBLE_PLANS];
  const fullPrices: Record<string, number> =
    camp.preco_cheio_json || {
      essencial: 2990,
      profissional: 5990,
      premium: 9990,
      padrinho: 10990,
    };
  const promoPrices: Record<string, number> =
    camp.preco_promocional_json || {
      essencial: 1495,
      profissional: 2995,
      premium: 4995,
      padrinho: 5495,
    };

  const emailNorm = normalizeEmail(user.email);
  const phoneNorm = normalizeDigits(user.phone || providerProfile.whatsapp);
  const docNorm = normalizeDigits(user.cpfCnpj || providerProfile.cpfCnpj);
  const fingerprint = (user.deviceFingerprint || '').trim();
  const ipHash = hashIpAddress(user.ipAddress);
  const providerId = providerProfile.providerProfileId || null;

  const fail = async (
    resultado: 'inelegivel' | 'bloqueado',
    reason: string
  ): Promise<LaunchOfferEligibilityResult> => {
    await logEligibilityCheck({
      userId: user.userId,
      providerProfileId: providerId,
      campaignId: camp.id,
      emailNorm,
      phoneNorm,
      docNorm,
      fingerprint,
      ipHash,
      resultado,
      motivo: reason,
    });
    return {
      eligible: false,
      resultado,
      reason,
      campaignId: camp.id,
      campaignName: camp.nome,
      discountPercent: Number(camp.desconto_percentual || 50),
      durationCycles: Number(camp.duracao_ciclos || 3),
      eligiblePlans,
      fullPricesCentavos: fullPrices,
      promoPricesCentavos: promoPrices,
    };
  };

  try {
    // 1. Campanha ativa, dentro do período e dentro do limite total de resgates
    const startsAt = new Date(camp.data_inicio);
    const endsAt = new Date(camp.data_fim);
    if (camp.status !== 'ativo' || now < startsAt || now > endsAt) {
      return fail('inelegivel', 'A campanha encerrou.');
    }

    const { rows: totalRes } = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM promotional_redemptions WHERE campaign_id = $1`,
      [camp.id]
    );
    if (Number(totalRes[0]?.total || 0) >= Number(camp.limite_total_resgates)) {
      return fail('inelegivel', 'A campanha encerrou.');
    }

    // 2. Plano e ciclo (oferta válida apenas para assinatura mensal nos 4 planos elegíveis; nunca Gratuito nem Anual)
    const normalizedPlan = (options.planSlug || '').trim().toLowerCase();
    const normalizedCycle = (options.cycle || 'mensal').trim().toLowerCase();
    if (normalizedCycle !== 'mensal') {
      return fail(
        'inelegivel',
        'Esta oferta não está disponível para o plano selecionado.'
      );
    }
    if (normalizedPlan && !eligiblePlans.includes(normalizedPlan)) {
      return fail(
        'inelegivel',
        'Esta oferta não está disponível para o plano selecionado.'
      );
    }

    // 3. Prestador já utilizou a oferta anteriormente (ativo, concluído, cancelado ou expirado)
    if (providerId) {
      const { rows: redRows } = await pool.query(
        `SELECT id FROM promotional_redemptions
         WHERE provider_profile_id = $1 AND campaign_id = $2
         LIMIT 1`,
        [providerId, camp.id]
      );
      if (redRows.length > 0) {
        return fail('inelegivel', 'Você já utilizou esta oferta anteriormente.');
      }

      // 4. Prestador já teve assinatura paga anteriormente ou possui assinatura paga ativa/pendente/inadimplente
      const { rows: paidSubRows } = await pool.query(
        `SELECT s.id, s.status, p.slug
         FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.provider_profile_id = $1
           AND p.slug <> 'gratuito'
         LIMIT 1`,
        [providerId]
      );
      if (paidSubRows.length > 0) {
        return fail(
          'inelegivel',
          'Esta oferta é válida apenas para novos prestadores.'
        );
      }
    }

    // 5. Detecção antifraude multi-conta (mesmo e-mail, telefone, CPF/CNPJ ou fingerprint de pagamento já usados)
    if (emailNorm || phoneNorm || docNorm || fingerprint) {
      const { rows: abuseRows } = await pool.query(
        `SELECT pec.id, pec.provider_profile_id
         FROM promotion_eligibility_checks pec
         JOIN promotional_redemptions pr
           ON (pr.provider_profile_id = pec.provider_profile_id OR (pec.user_id IS NOT NULL AND pr.user_id = pec.user_id))
         WHERE pr.campaign_id = $1
           AND (
             ($2 <> '' AND pec.email_normalizado = $2)
             OR ($3 <> '' AND pec.telefone_normalizado = $3)
             OR ($4 <> '' AND pec.documento_normalizado = $4)
             OR ($5 <> '' AND pec.fingerprint_dispositivo = $5)
           )
         LIMIT 1`,
        [camp.id, emailNorm, phoneNorm, docNorm, fingerprint]
      );
      if (abuseRows.length > 0) {
        return fail('bloqueado', 'Você já utilizou esta oferta anteriormente.');
      }
    }

    // Também verifica se o telefone ou CPF/CNPJ pertence a outro prestador com assinatura paga
    if (phoneNorm || docNorm) {
      const { rows: otherPaidProv } = await pool.query(
        `SELECT pp.id
         FROM provider_profiles pp
         JOIN subscriptions s ON s.provider_profile_id = pp.id
         JOIN plans p ON p.id = s.plan_id
         WHERE p.slug <> 'gratuito'
           AND ($1 = '' OR pp.id <> $1)
           AND (
             ($2 <> '' AND regexp_replace(pp.whatsapp, '\\D', '', 'g') = $2)
             OR ($3 <> '' AND pp.cpf_cnpj_normalizado = $3)
           )
         LIMIT 1`,
        [providerId || '', phoneNorm, docNorm]
      );
      if (otherPaidProv.length > 0) {
        return fail(
          'bloqueado',
          'Esta oferta é válida apenas para novos prestadores.'
        );
      }
    }

    const fullPriceStart = new Date(now.getTime());
    fullPriceStart.setUTCDate(
      fullPriceStart.getUTCDate() + 30 * Number(camp.duracao_ciclos || 3)
    );

    await logEligibilityCheck({
      userId: user.userId,
      providerProfileId: providerId,
      campaignId: camp.id,
      emailNorm,
      phoneNorm,
      docNorm,
      fingerprint,
      ipHash,
      resultado: 'elegivel',
      motivo: 'Elegível para Oferta de Lançamento (50% off nos 3 primeiros meses)',
    });

    return {
      eligible: true,
      resultado: 'elegivel',
      campaignId: camp.id,
      campaignName: camp.nome,
      discountPercent: Number(camp.desconto_percentual || 50),
      durationCycles: Number(camp.duracao_ciclos || 3),
      eligiblePlans,
      fullPricesCentavos: fullPrices,
      promoPricesCentavos: promoPrices,
      selectedPlanFullCentavos: normalizedPlan
        ? fullPrices[normalizedPlan]
        : undefined,
      selectedPlanPromoCentavos: normalizedPlan
        ? promoPrices[normalizedPlan]
        : undefined,
      fullPriceStartDate: fullPriceStart.toISOString(),
    };
  } catch {
    return fail(
      'inelegivel',
      'Não foi possível validar sua elegibilidade. Fale com o suporte.'
    );
  }
}

export async function recordLaunchOfferRedemption(params: {
  campaignId: string;
  providerProfileId: string;
  userId?: string | null;
  subscriptionId: string;
  planId: string;
  cpfCnpj?: string | null;
  now?: Date;
}) {
  const now = params.now || new Date();
  const endPromo = new Date(now.getTime());
  endPromo.setUTCDate(endPromo.getUTCDate() + 90);

  const id = `redemp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (params.cpfCnpj) {
    const docNorm = normalizeDigits(params.cpfCnpj);
    if (docNorm) {
      await pool.query(
        `UPDATE provider_profiles SET cpf_cnpj_normalizado = $2 WHERE id = $1`,
        [params.providerProfileId, docNorm]
      );
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO promotional_redemptions (
      id, campaign_id, provider_profile_id, user_id, subscription_id,
      plano_id, ciclo_promocional_atual, data_inicio_promocao,
      data_fim_promocao, data_retorno_preco_cheio, status
    ) VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8,$8,'ativo')
    RETURNING *`,
    [
      id,
      params.campaignId,
      params.providerProfileId,
      params.userId || null,
      params.subscriptionId,
      params.planId,
      now,
      endPromo,
    ]
  );

  return rows[0];
}

export async function forfeitLaunchOfferOnCancel(
  subscriptionId: string,
  now = new Date()
) {
  await pool.query(
    `UPDATE promotional_redemptions
     SET status = 'cancelado',
         atualizado_em = $2
     WHERE subscription_id = $1
       AND status = 'ativo'`,
    [subscriptionId, now]
  );
}

/**
 * Avança o ciclo promocional a cada renovação mensal.
 * Nos ciclos 1, 2 e 3 mantém o preço promocional (50% off).
 * A partir do 4º ciclo mensal, marca o resgate como 'concluido' e retorna ao preço cheio.
 */
export async function advancePromotionalCycleOrReturnFullPrice(
  subscriptionId: string,
  now = new Date()
): Promise<{
  hasActivePromotion: boolean;
  cycleNumber: number;
  returnedToFullPrice: boolean;
}> {
  const { rows } = await pool.query(
    `SELECT pr.*, pc.duracao_ciclos
     FROM promotional_redemptions pr
     JOIN promotional_campaigns pc ON pc.id = pr.campaign_id
     WHERE pr.subscription_id = $1
       AND pr.status = 'ativo'
     LIMIT 1`,
    [subscriptionId]
  );

  if (rows.length === 0) {
    return {
      hasActivePromotion: false,
      cycleNumber: 0,
      returnedToFullPrice: false,
    };
  }

  const redemption = rows[0];
  const nextCycle = Number(redemption.ciclo_promocional_atual || 1) + 1;
  const maxCycles = Number(redemption.duracao_ciclos || 3);

  if (nextCycle > maxCycles) {
    await pool.query(
      `UPDATE promotional_redemptions
       SET ciclo_promocional_atual = $2,
           status = 'concluido',
           atualizado_em = $3
       WHERE id = $1`,
      [redemption.id, nextCycle, now]
    );
    return {
      hasActivePromotion: false,
      cycleNumber: nextCycle,
      returnedToFullPrice: true,
    };
  }

  await pool.query(
    `UPDATE promotional_redemptions
     SET ciclo_promocional_atual = $2,
         atualizado_em = $3
     WHERE id = $1`,
    [redemption.id, nextCycle, now]
  );

  if (nextCycle === maxCycles) {
    await sendEndingNoticeForRedemption(redemption.id);
  }

  return {
    hasActivePromotion: true,
    cycleNumber: nextCycle,
    returnedToFullPrice: false,
  };
}

async function sendEndingNoticeForRedemption(
  redemptionId: string
): Promise<boolean> {
  const { rows: existingNotice } = await pool.query(
    `SELECT id FROM audit_logs
     WHERE action = 'launch_offer_ending_notice_sent'
       AND target_id = $1
     LIMIT 1`,
    [redemptionId]
  );
  if (existingNotice.length > 0) {
    return false;
  }

  const { rows } = await pool.query<{
    id: string;
    provider_profile_id: string;
    user_id: string | null;
    data_retorno_preco_cheio: Date;
    plan_name: string;
    preco_mensal_centavos: number;
    provider_name: string;
    whatsapp: string | null;
    email: string | null;
  }>(
    `SELECT pr.id, pr.provider_profile_id, pr.user_id, pr.data_retorno_preco_cheio,
            p.nome AS plan_name, p.preco_mensal_centavos,
            pp.name AS provider_name, pp.whatsapp,
            COALESCE(u.email, '') AS email
     FROM promotional_redemptions pr
     JOIN plans p ON p.id = pr.plano_id
     LEFT JOIN provider_profiles pp ON pp.id = pr.provider_profile_id
     LEFT JOIN users u ON u.id = COALESCE(pr.user_id, pp.user_id)
     WHERE pr.id = $1
     LIMIT 1`,
    [redemptionId]
  );

  if (rows.length === 0) return false;
  const row = rows[0];
  const returnDateLabel = new Date(
    row.data_retorno_preco_cheio
  ).toLocaleDateString('pt-BR');
  const fullPriceLabel = (
    Number(row.preco_mensal_centavos || 0) / 100
  ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const recipientEmail =
    row.email || `${row.provider_profile_id}@confiare.com.br`;

  await emailService.sendEmail({
    to: recipientEmail,
    subject: `Recontrate: Sua oferta de 50% no plano ${row.plan_name} está terminando`,
    template: 'aviso_aprovacao_cadastro',
    userId: row.user_id || undefined,
    variables: {
      providerName: row.provider_name || row.provider_profile_id,
      planName: row.plan_name,
      fullPrice: `${fullPriceLabel}/mês`,
      fullPriceStartDate: returnDateLabel,
      notice:
        'A partir do 4º ciclo mensal será aplicado o preço cheio. Você pode cancelar ou ajustar seu plano a qualquer momento.',
    },
  });

  if (row.whatsapp) {
    await whatsappService.sendTemplateNotification({
      recipientPhone: row.whatsapp,
      templateName: 'nova_oportunidade_compativel',
      providerProfileId: row.provider_profile_id,
      customerUserId: row.user_id || undefined,
      parameters: {
        event: 'launch_offer_ending',
        planName: row.plan_name,
        fullPrice: `${fullPriceLabel}/mês`,
        returnDate: returnDateLabel,
      },
    });
  }

  await pool.query(
    `INSERT INTO audit_logs (
      actor_role, action, target_type, target_id, metadata_json
    ) VALUES ('system', 'launch_offer_ending_notice_sent', 'promotional_redemption', $1, $2::jsonb)`,
    [
      row.id,
      JSON.stringify({
        providerProfileId: row.provider_profile_id,
        email: recipientEmail,
        whatsapp: row.whatsapp || null,
        returnDate: returnDateLabel,
      }),
    ]
  );

  return true;
}

/**
 * Envia avisos idempotentes por E-mail e WhatsApp para prestadores no último mês
 * promocional (ciclo 3 ou dentro de 'daysBeforeEnd' dias do retorno ao preço cheio).
 */
export async function notifyUpcomingLaunchOfferEnd(
  daysBeforeEnd = 7,
  now = new Date()
): Promise<{ sentCount: number; notifiedRedemptionIds: string[] }> {
  await ensureSchemaAndSeed();
  const threshold = new Date(
    now.getTime() + daysBeforeEnd * 24 * 60 * 60 * 1000
  );

  const { rows } = await pool.query<{ id: string }>(
    `SELECT id
     FROM promotional_redemptions
     WHERE status = 'ativo'
       AND (ciclo_promocional_atual >= 3 OR data_retorno_preco_cheio <= $1)`,
    [threshold]
  );

  const notifiedRedemptionIds: string[] = [];
  for (const row of rows) {
    const sent = await sendEndingNoticeForRedemption(row.id);
    if (sent) {
      notifiedRedemptionIds.push(row.id);
    }
  }

  return {
    sentCount: notifiedRedemptionIds.length,
    notifiedRedemptionIds,
  };
}

export interface LaunchOfferAdminAnalytics {
  campaign: any;
  metrics: {
    totalEligibilityChecks: number;
    eligibleChecksCount: number;
    blockedFraudCount: number;
    totalRedemptions: number;
    activeInPromoCount: number;
    completedReturnedToFullPriceCount: number;
    canceledDuringPromoCount: number;
    renewedAfterPromoCount: number;
    conversionRatePercent: number;
    cancelDuringPromoRatePercent: number;
    postPromoRenewalRatePercent: number;
  };
  redemptionsByPlan: Array<{
    planSlug: string;
    total: number;
    active: number;
    completed: number;
    canceled: number;
  }>;
}

export async function getLaunchOfferAdminAnalytics(
  campaignSlug = LAUNCH_OFFER_SLUG
): Promise<LaunchOfferAdminAnalytics> {
  await ensureSchemaAndSeed();

  const { rows: campRows } = await pool.query(
    `SELECT * FROM promotional_campaigns WHERE slug = $1 LIMIT 1`,
    [campaignSlug]
  );
  const campaign = campRows[0];
  if (!campaign) {
    throw new Error('Campanha de lançamento não encontrada.');
  }

  const [checksRes, redemptionsRes, byPlanRes] = await Promise.all([
    pool.query<{
      total: string;
      elegiveis: string;
      bloqueados: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE resultado = 'elegivel')::text AS elegiveis,
         COUNT(*) FILTER (WHERE resultado = 'bloqueado')::text AS bloqueados
       FROM promotion_eligibility_checks
       WHERE campaign_id = $1`,
      [campaign.id]
    ),
    pool.query<{
      total: string;
      ativos: string;
      concluidos: string;
      cancelados: string;
      renovados_pos_promo: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE pr.status = 'ativo')::text AS ativos,
         COUNT(*) FILTER (WHERE pr.status = 'concluido')::text AS concluidos,
         COUNT(*) FILTER (WHERE pr.status = 'cancelado')::text AS cancelados,
         COUNT(*) FILTER (WHERE pr.status = 'concluido' AND s.status = 'ativa')::text AS renovados_pos_promo
       FROM promotional_redemptions pr
       LEFT JOIN subscriptions s ON s.id = pr.subscription_id
       WHERE pr.campaign_id = $1`,
      [campaign.id]
    ),
    pool.query<{
      plan_slug: string;
      total: string;
      ativos: string;
      concluidos: string;
      cancelados: string;
    }>(
      `SELECT
         p.slug AS plan_slug,
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE pr.status = 'ativo')::text AS ativos,
         COUNT(*) FILTER (WHERE pr.status = 'concluido')::text AS concluidos,
         COUNT(*) FILTER (WHERE pr.status = 'cancelado')::text AS cancelados
       FROM promotional_redemptions pr
       JOIN plans p ON p.id = pr.plano_id
       WHERE pr.campaign_id = $1
       GROUP BY p.slug
       ORDER BY p.slug ASC`,
      [campaign.id]
    ),
  ]);

  const totalEligibilityChecks = Number(checksRes.rows[0]?.total || 0);
  const eligibleChecksCount = Number(checksRes.rows[0]?.elegiveis || 0);
  const blockedFraudCount = Number(checksRes.rows[0]?.bloqueados || 0);

  const totalRedemptions = Number(redemptionsRes.rows[0]?.total || 0);
  const activeInPromoCount = Number(redemptionsRes.rows[0]?.ativos || 0);
  const completedReturnedToFullPriceCount = Number(
    redemptionsRes.rows[0]?.concluidos || 0
  );
  const canceledDuringPromoCount = Number(
    redemptionsRes.rows[0]?.cancelados || 0
  );
  const renewedAfterPromoCount = Number(
    redemptionsRes.rows[0]?.renovados_pos_promo || 0
  );

  const conversionRatePercent =
    eligibleChecksCount > 0
      ? Math.min(
          100,
          Math.round((totalRedemptions / eligibleChecksCount) * 1000) / 10
        )
      : 0;
  const cancelDuringPromoRatePercent =
    totalRedemptions > 0
      ? Math.round((canceledDuringPromoCount / totalRedemptions) * 1000) / 10
      : 0;
  const postPromoRenewalRatePercent =
    completedReturnedToFullPriceCount > 0
      ? Math.round(
          (renewedAfterPromoCount / completedReturnedToFullPriceCount) * 1000
        ) / 10
      : 0;

  return {
    campaign,
    metrics: {
      totalEligibilityChecks,
      eligibleChecksCount,
      blockedFraudCount,
      totalRedemptions,
      activeInPromoCount,
      completedReturnedToFullPriceCount,
      canceledDuringPromoCount,
      renewedAfterPromoCount,
      conversionRatePercent,
      cancelDuringPromoRatePercent,
      postPromoRenewalRatePercent,
    },
    redemptionsByPlan: byPlanRes.rows.map((r) => ({
      planSlug: r.plan_slug,
      total: Number(r.total),
      active: Number(r.ativos),
      completed: Number(r.concluidos),
      canceled: Number(r.cancelados),
    })),
  };
}

export async function updateLaunchOfferCampaign(
  campaignId: string,
  patch: {
    status?: 'rascunho' | 'ativo' | 'pausado' | 'encerrado';
    dataInicio?: string;
    dataFim?: string;
    limiteTotalResgates?: number;
  }
) {
  await ensureSchemaAndSeed();
  const { rows: existing } = await pool.query(
    `SELECT * FROM promotional_campaigns WHERE id = $1 LIMIT 1`,
    [campaignId]
  );
  if (existing.length === 0) {
    throw new Error('Campanha não encontrada.');
  }
  const cur = existing[0];

  const { rows } = await pool.query(
    `UPDATE promotional_campaigns
     SET status = $2,
         data_inicio = $3,
         data_fim = $4,
         limite_total_resgates = $5,
         atualizado_em = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      campaignId,
      patch.status ?? cur.status,
      patch.dataInicio ? new Date(patch.dataInicio) : cur.data_inicio,
      patch.dataFim ? new Date(patch.dataFim) : cur.data_fim,
      patch.limiteTotalResgates ?? cur.limite_total_resgates,
    ]
  );

  return rows[0];
}
