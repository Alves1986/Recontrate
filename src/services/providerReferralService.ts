import crypto from 'node:crypto';
import { ensureSchemaAndSeed, pool } from '../db/index';
import { AsaasBillingAdapter, type BillingCycle } from './billingProvider';

export const REFERRAL_REWARD_DAYS = 15;
export const REFERRED_WELCOME_BONUS_DAYS = 10;

const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type ReferralStatus =
  | 'convite_enviado'
  | 'cadastrado'
  | 'validado'
  | 'bloqueado';

export type ReferralRewardStatus =
  | 'pendente'
  | 'disponivel'
  | 'aplicado_na_assinatura'
  | 'cancelado';

export interface ReferralMetricsSummary {
  totalInvites: number;
  pendingInvites: number;
  registeredWaitingOnboarding: number;
  validatedReferrals: number;
  blockedReferrals: number;
  clicksCount: number;
  totalFreeDaysEarned: number;
  appliedFreeDays: number;
  availableFreeDays: number;
  pendingFreeDays: number;
  conversionRatePercent: number;
  rewardDaysPerProvider: number;
  referredWelcomeBonusDays: number;
  receivedWelcomeBonusDays: number;
  receivedWelcomeBonusAppliedDays: number;
  receivedWelcomeBonusAvailableDays: number;
}

export function normalizeReferralCode(code?: string | null): string {
  return (code || '').trim().toUpperCase();
}

export function generateReadableReferralCode(seed?: string): string {
  if (seed) {
    const hash = crypto.createHash('sha256').update(seed).digest();
    let suffix = '';
    for (let i = 0; i < 6; i += 1) {
      suffix += REFERRAL_CODE_ALPHABET[hash[i] % REFERRAL_CODE_ALPHABET.length];
    }
    return `REC-${suffix}`;
  }
  const bytes = crypto.randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length];
  }
  return `REC-${suffix}`;
}

function normalizePhoneDigits(phone?: string | null): string {
  return (phone || '').replace(/\D/g, '');
}

function normalizeEmailValue(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

export function isSelfReferralAttempt(
  referrer: { userId?: string | null; email?: string | null; phone?: string | null },
  referred: { userId?: string | null; email?: string | null; phone?: string | null }
): boolean {
  if (
    referrer.userId &&
    referred.userId &&
    referrer.userId === referred.userId
  ) {
    return true;
  }

  const refEmail = normalizeEmailValue(referrer.email);
  const targetEmail = normalizeEmailValue(referred.email);
  if (refEmail && targetEmail && refEmail === targetEmail) {
    return true;
  }

  const refPhone = normalizePhoneDigits(referrer.phone);
  const targetPhone = normalizePhoneDigits(referred.phone);
  if (
    refPhone.length >= 10 &&
    targetPhone.length >= 10 &&
    refPhone === targetPhone
  ) {
    return true;
  }

  return false;
}

export function computeReferralMetrics(params: {
  clicksCount: number;
  referrals: Array<{
    status: string;
    rewardDays: number;
    rewardStatus: string;
  }>;
  receivedWelcomeBonus?: {
    status: string;
    rewardDays: number;
    rewardStatus: string;
  } | null;
}): ReferralMetricsSummary {
  const clicksCount = Math.max(0, Number(params.clicksCount || 0));
  const list = params.referrals || [];

  let pendingInvites = 0;
  let registeredWaitingOnboarding = 0;
  let validatedReferrals = 0;
  let blockedReferrals = 0;
  let totalFreeDaysEarned = 0;
  let appliedFreeDays = 0;
  let availableFreeDays = 0;
  let pendingFreeDays = 0;

  for (const r of list) {
    const days = Number(r.rewardDays ?? REFERRAL_REWARD_DAYS);
    if (r.status === 'convite_enviado') {
      pendingInvites += 1;
    } else if (r.status === 'cadastrado') {
      registeredWaitingOnboarding += 1;
      pendingFreeDays += days;
    } else if (r.status === 'validado') {
      validatedReferrals += 1;
      totalFreeDaysEarned += days;
      if (r.rewardStatus === 'aplicado_na_assinatura') {
        appliedFreeDays += days;
      } else if (r.rewardStatus === 'disponivel') {
        availableFreeDays += days;
      }
    } else if (r.status === 'bloqueado') {
      blockedReferrals += 1;
    }
  }

  let receivedWelcomeBonusDays = 0;
  let receivedWelcomeBonusAppliedDays = 0;
  let receivedWelcomeBonusAvailableDays = 0;
  const received = params.receivedWelcomeBonus;
  if (received) {
    const bonusDays = Number(received.rewardDays ?? REFERRED_WELCOME_BONUS_DAYS);
    if (received.status === 'validado') {
      receivedWelcomeBonusDays = bonusDays;
      totalFreeDaysEarned += bonusDays;
      if (received.rewardStatus === 'aplicado_na_assinatura') {
        receivedWelcomeBonusAppliedDays = bonusDays;
        appliedFreeDays += bonusDays;
      } else if (received.rewardStatus === 'disponivel') {
        receivedWelcomeBonusAvailableDays = bonusDays;
        availableFreeDays += bonusDays;
      }
    } else if (received.status === 'cadastrado') {
      pendingFreeDays += bonusDays;
    }
  }

  const totalInvites = list.length;
  const denominator = Math.max(clicksCount, totalInvites);
  const conversionRatePercent =
    denominator > 0
      ? Math.min(100, Math.round((validatedReferrals / denominator) * 1000) / 10)
      : 0;

  return {
    totalInvites,
    pendingInvites,
    registeredWaitingOnboarding,
    validatedReferrals,
    blockedReferrals,
    clicksCount,
    totalFreeDaysEarned,
    appliedFreeDays,
    availableFreeDays,
    pendingFreeDays,
    conversionRatePercent,
    rewardDaysPerProvider: REFERRAL_REWARD_DAYS,
    referredWelcomeBonusDays: REFERRED_WELCOME_BONUS_DAYS,
    receivedWelcomeBonusDays,
    receivedWelcomeBonusAppliedDays,
    receivedWelcomeBonusAvailableDays,
  };
}

export function buildReferralShareUrl(origin: string, code: string): string {
  const cleanOrigin = (origin || '').replace(/\/$/, '');
  return `${cleanOrigin}/criar-conta?role=prestador&ref=${encodeURIComponent(
    normalizeReferralCode(code)
  )}`;
}

export function buildWhatsAppInviteUrl(params: {
  phone?: string;
  referredName?: string;
  referrerName?: string;
  shareUrl: string;
  code: string;
}): string {
  const greeting = params.referredName
    ? `Olá ${params.referredName.trim()}!`
    : 'Olá!';
  const sender = params.referrerName ? ` Aqui é ${params.referrerName.trim()}.` : '';
  const message = `${greeting}${sender} Estou usando o Recontrate para receber solicitações locais de serviços sem pagar comissão à plataforma (todo valor é negociado diretamente com o cliente, fora da plataforma). Cadastre seu perfil de profissional pelo meu link para ganhar +${REFERRED_WELCOME_BONUS_DAYS} dias grátis extras de indicação além dos 90 dias grátis de boas-vindas (código ${normalizeReferralCode(
    params.code
  )}): ${params.shareUrl}`;

  const digits = normalizePhoneDigits(params.phone);
  const internationalDigits =
    digits.length >= 10 && digits.length <= 11 && !digits.startsWith('55')
      ? `55${digits}`
      : digits;

  if (internationalDigits.length >= 12) {
    return `https://wa.me/${internationalDigits}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export class ProviderReferralService {
  private readonly billing = new AsaasBillingAdapter();

  async getOrCreateReferralCode(
    userId: string,
    providerProfileId?: string | null
  ): Promise<{
    id: string;
    userId: string;
    providerProfileId: string | null;
    code: string;
    clicksCount: number;
    createdAt: string;
  }> {
    await ensureSchemaAndSeed();

    const { rows: userCheck } = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`,
      [userId]
    );
    if (userCheck.length === 0) {
      throw new Error('Somente usuários cadastrados podem gerar código de indicação.');
    }

    let resolvedProviderId = providerProfileId || null;
    if (!resolvedProviderId) {
      const { rows: provRows } = await pool.query<{ id: string }>(
        `SELECT id FROM provider_profiles WHERE user_id = $1::uuid AND deleted_at IS NULL LIMIT 1`,
        [userId]
      );
      resolvedProviderId = provRows[0]?.id || null;
    }

    const { rows: existing } = await pool.query(
      `SELECT * FROM referral_codes WHERE user_id = $1::uuid LIMIT 1`,
      [userId]
    );
    if (existing.length > 0) {
      const row = existing[0];
      if (!row.provider_profile_id && resolvedProviderId) {
        await pool.query(
          `UPDATE referral_codes SET provider_profile_id = $2 WHERE id = $1`,
          [row.id, resolvedProviderId]
        );
      }
      return {
        id: row.id,
        userId: row.user_id,
        providerProfileId: row.provider_profile_id || resolvedProviderId,
        code: row.code,
        clicksCount: Number(row.clicks_count || 0),
        createdAt: new Date(row.created_at).toISOString(),
      };
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code =
        attempt === 0
          ? generateReadableReferralCode(userId)
          : generateReadableReferralCode();
      const id = `refc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      try {
        const { rows: inserted } = await pool.query(
          `INSERT INTO referral_codes (id, user_id, provider_profile_id, code)
           VALUES ($1, $2::uuid, $3, $4)
           RETURNING *`,
          [id, userId, resolvedProviderId, code]
        );
        const row = inserted[0];
        return {
          id: row.id,
          userId: row.user_id,
          providerProfileId: row.provider_profile_id || null,
          code: row.code,
          clicksCount: Number(row.clicks_count || 0),
          createdAt: new Date(row.created_at).toISOString(),
        };
      } catch (err) {
        if (attempt === 4) {
          throw err;
        }
      }
    }

    throw new Error('Não foi possível gerar código único de indicação.');
  }

  async validateAndTrackCodeVisit(codeInput: string): Promise<{
    valid: boolean;
    code: string;
    referrerFirstName?: string;
    rewardDaysForReferrer: number;
    rewardDaysForReferred: number;
    rewardDays: number;
  }> {
    await ensureSchemaAndSeed();
    const code = normalizeReferralCode(codeInput);
    if (!code) {
      return {
        valid: false,
        code,
        rewardDaysForReferrer: REFERRAL_REWARD_DAYS,
        rewardDaysForReferred: REFERRED_WELCOME_BONUS_DAYS,
        rewardDays: REFERRAL_REWARD_DAYS,
      };
    }

    const { rows } = await pool.query<{
      id: string;
      code: string;
      full_name: string | null;
    }>(
      `UPDATE referral_codes rc
       SET clicks_count = rc.clicks_count + 1
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE rc.user_id = u.id
         AND u.deleted_at IS NULL
         AND rc.code = $1
       RETURNING rc.id, rc.code, p.full_name`,
      [code]
    );

    if (rows.length === 0) {
      return {
        valid: false,
        code,
        rewardDaysForReferrer: REFERRAL_REWARD_DAYS,
        rewardDaysForReferred: REFERRED_WELCOME_BONUS_DAYS,
        rewardDays: REFERRAL_REWARD_DAYS,
      };
    }

    const firstName = (rows[0].full_name || 'Profissional')
      .trim()
      .split(/\s+/)[0];

    return {
      valid: true,
      code: rows[0].code,
      referrerFirstName: firstName,
      rewardDaysForReferrer: REFERRAL_REWARD_DAYS,
      rewardDaysForReferred: REFERRED_WELCOME_BONUS_DAYS,
      rewardDays: REFERRAL_REWARD_DAYS,
    };
  }

  async createDirectInvite(input: {
    referrerUserId: string;
    referrerProviderProfileId?: string | null;
    referredName: string;
    referredPhone: string;
    referredEmail?: string;
    referredCategory?: string;
  }) {
    await ensureSchemaAndSeed();
    const refCode = await this.getOrCreateReferralCode(
      input.referrerUserId,
      input.referrerProviderProfileId
    );

    const { rows: referrerRows } = await pool.query<{
      email: string;
      phone: string | null;
    }>(
      `SELECT u.email, p.phone
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1::uuid
       LIMIT 1`,
      [input.referrerUserId]
    );
    const referrerInfo = referrerRows[0];

    const cleanName = input.referredName.trim();
    const cleanPhone = input.referredPhone.trim();
    const cleanEmail = normalizeEmailValue(input.referredEmail);
    const phoneDigits = normalizePhoneDigits(cleanPhone);

    if (
      referrerInfo &&
      isSelfReferralAttempt(
        {
          userId: input.referrerUserId,
          email: referrerInfo.email,
          phone: referrerInfo.phone,
        },
        {
          email: cleanEmail,
          phone: cleanPhone,
        }
      )
    ) {
      throw new Error('Não é permitido indicar o próprio e-mail ou telefone.');
    }

    const { rows: duplicateRows } = await pool.query<{ id: string }>(
      `SELECT id FROM provider_referrals
       WHERE referrer_user_id = $1::uuid
         AND status IN ('convite_enviado', 'cadastrado', 'validado')
         AND (
           ($2 <> '' AND referred_email = $2)
           OR ($3 <> '' AND regexp_replace(referred_phone, '\\D', '', 'g') = $3)
         )
       LIMIT 1`,
      [input.referrerUserId, cleanEmail, phoneDigits]
    );

    if (duplicateRows.length > 0) {
      throw new Error(
        'Você já possui uma indicação registrada para este telefone ou e-mail.'
      );
    }

    const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const { rows } = await pool.query(
      `INSERT INTO provider_referrals (
        id, referral_code_id, referrer_user_id, referrer_provider_profile_id,
        referred_name, referred_email, referred_phone, referred_category,
        status, reward_days, reward_status, referred_reward_days, referred_reward_status
      ) VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, 'convite_enviado', $9, 'pendente', $10, 'pendente')
      RETURNING *`,
      [
        id,
        refCode.id,
        input.referrerUserId,
        refCode.providerProfileId,
        cleanName,
        cleanEmail,
        cleanPhone,
        input.referredCategory || null,
        REFERRAL_REWARD_DAYS,
        REFERRED_WELCOME_BONUS_DAYS,
      ]
    );

    return {
      invite: this.mapReferralRow(rows[0]),
      code: refCode.code,
    };
  }

  async recordReferredProviderSignup(input: {
    referralCode?: string;
    referredUserId: string;
    referredProviderProfileId: string;
    referredName: string;
    referredEmail: string;
    referredPhone?: string;
    referredCategory?: string;
  }) {
    await ensureSchemaAndSeed();

    const { rows: alreadyRecorded } = await pool.query<{ id: string }>(
      `SELECT id FROM provider_referrals WHERE referred_user_id = $1::uuid LIMIT 1`,
      [input.referredUserId]
    );
    if (alreadyRecorded.length > 0) {
      return null;
    }

    const cleanCode = normalizeReferralCode(input.referralCode);
    const cleanEmail = normalizeEmailValue(input.referredEmail);
    const phoneDigits = normalizePhoneDigits(input.referredPhone);

    let matchedCode: {
      id: string;
      userId: string;
      providerProfileId: string | null;
      email: string;
      phone: string | null;
    } | null = null;
    let matchedInviteId: string | null = null;

    if (cleanCode) {
      const { rows } = await pool.query<{
        id: string;
        user_id: string;
        provider_profile_id: string | null;
        email: string;
        phone: string | null;
      }>(
        `SELECT rc.id, rc.user_id, rc.provider_profile_id, u.email, p.phone
         FROM referral_codes rc
         JOIN users u ON u.id = rc.user_id
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE rc.code = $1 AND u.deleted_at IS NULL
         LIMIT 1`,
        [cleanCode]
      );
      if (rows[0]) {
        matchedCode = {
          id: rows[0].id,
          userId: rows[0].user_id,
          providerProfileId: rows[0].provider_profile_id,
          email: rows[0].email,
          phone: rows[0].phone,
        };
      }
    }

    // Procura convite direto pendente por e-mail ou telefone (mesmo sem parâmetro ?ref)
    if (cleanEmail || phoneDigits.length >= 10) {
      const { rows: inviteRows } = await pool.query<{
        id: string;
        referral_code_id: string;
        referrer_user_id: string;
        referrer_provider_profile_id: string | null;
        email: string;
        phone: string | null;
      }>(
        `SELECT pr.id, pr.referral_code_id, pr.referrer_user_id,
                pr.referrer_provider_profile_id, u.email, p.phone
         FROM provider_referrals pr
         JOIN users u ON u.id = pr.referrer_user_id
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE pr.status = 'convite_enviado'
           AND ($1 = '' OR pr.referrer_user_id::text = $1)
           AND (
             ($2 <> '' AND pr.referred_email = $2)
             OR ($3 <> '' AND regexp_replace(pr.referred_phone, '\\D', '', 'g') = $3)
           )
         ORDER BY pr.created_at DESC
         LIMIT 1`,
        [matchedCode?.userId || '', cleanEmail, phoneDigits]
      );
      if (inviteRows[0]) {
        matchedInviteId = inviteRows[0].id;
        if (!matchedCode) {
          matchedCode = {
            id: inviteRows[0].referral_code_id,
            userId: inviteRows[0].referrer_user_id,
            providerProfileId: inviteRows[0].referrer_provider_profile_id,
            email: inviteRows[0].email,
            phone: inviteRows[0].phone,
          };
        }
      }
    }

    if (!matchedCode) {
      return null;
    }

    const isSelf = isSelfReferralAttempt(
      {
        userId: matchedCode.userId,
        email: matchedCode.email,
        phone: matchedCode.phone,
      },
      {
        userId: input.referredUserId,
        email: cleanEmail,
        phone: input.referredPhone,
      }
    );

    const nextStatus: ReferralStatus = isSelf ? 'bloqueado' : 'cadastrado';
    const nextRewardStatus: ReferralRewardStatus = isSelf
      ? 'cancelado'
      : 'pendente';

    if (matchedInviteId) {
      const { rows } = await pool.query(
        `UPDATE provider_referrals
         SET referred_user_id = $2::uuid,
             referred_provider_profile_id = $3,
             referred_name = COALESCE(NULLIF($4, ''), referred_name),
             referred_email = COALESCE(NULLIF($5, ''), referred_email),
             referred_phone = COALESCE(NULLIF($6, ''), referred_phone),
             referred_category = COALESCE($7, referred_category),
             status = $8,
             reward_status = $9,
             referred_reward_days = $10,
             referred_reward_status = $9,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          matchedInviteId,
          input.referredUserId,
          input.referredProviderProfileId,
          input.referredName,
          cleanEmail,
          input.referredPhone || '',
          input.referredCategory || null,
          nextStatus,
          nextRewardStatus,
          REFERRED_WELCOME_BONUS_DAYS,
        ]
      );
      return this.mapReferralRow(rows[0]);
    }

    const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const { rows } = await pool.query(
      `INSERT INTO provider_referrals (
        id, referral_code_id, referrer_user_id, referrer_provider_profile_id,
        referred_user_id, referred_provider_profile_id,
        referred_name, referred_email, referred_phone, referred_category,
        status, reward_days, reward_status, referred_reward_days, referred_reward_status
      ) VALUES ($1, $2, $3::uuid, $4, $5::uuid, $6, $7, $8, $9, $10, $11, $12, $13, $14, $13)
      RETURNING *`,
      [
        id,
        matchedCode.id,
        matchedCode.userId,
        matchedCode.providerProfileId,
        input.referredUserId,
        input.referredProviderProfileId,
        input.referredName,
        cleanEmail,
        input.referredPhone || '',
        input.referredCategory || null,
        nextStatus,
        REFERRAL_REWARD_DAYS,
        nextRewardStatus,
        REFERRED_WELCOME_BONUS_DAYS,
      ]
    );
    return this.mapReferralRow(rows[0]);
  }

  async validateReferralAndGrantDays(referredUserId: string): Promise<{
    validated: boolean;
    referralId?: string;
    referrerUserId?: string;
    rewardDays?: number;
    referredRewardDays?: number;
    appliedResult?: Awaited<
      ReturnType<ProviderReferralService['applyAvailableDaysToReferrerSubscription']>
    >;
    referredAppliedResult?: Awaited<
      ReturnType<ProviderReferralService['applyAvailableDaysToReferrerSubscription']>
    >;
  }> {
    await ensureSchemaAndSeed();

    const { rows } = await pool.query<{
      id: string;
      referrer_user_id: string;
      reward_days: number;
      referred_reward_days: number | null;
    }>(
      `UPDATE provider_referrals
       SET status = 'validado',
           reward_status = 'disponivel',
           referred_reward_status = 'disponivel',
           validated_at = NOW(),
           updated_at = NOW()
       WHERE referred_user_id = $1::uuid
         AND status = 'cadastrado'
       RETURNING id, referrer_user_id, reward_days, referred_reward_days`,
      [referredUserId]
    );

    if (rows.length === 0) {
      return { validated: false };
    }

    const row = rows[0];
    const [appliedResult, referredAppliedResult] = await Promise.all([
      this.applyAvailableDaysToReferrerSubscription(row.referrer_user_id),
      this.applyAvailableDaysToReferrerSubscription(referredUserId),
    ]);

    return {
      validated: true,
      referralId: row.id,
      referrerUserId: row.referrer_user_id,
      rewardDays: Number(row.reward_days || REFERRAL_REWARD_DAYS),
      referredRewardDays: Number(
        row.referred_reward_days || REFERRED_WELCOME_BONUS_DAYS
      ),
      appliedResult,
      referredAppliedResult,
    };
  }

  async applyAvailableDaysToReferrerSubscription(
    userId: string,
    preferredSubscriptionId?: string
  ): Promise<{
    applied: boolean;
    appliedDays: number;
    appliedCount: number;
    availableDays: number;
    subscriptionId?: string;
    newEndDate?: string;
    reason?: string;
  }> {
    await ensureSchemaAndSeed();

    const [{ rows: referrerRows }, { rows: referredRows }] = await Promise.all([
      pool.query<{
        id: string;
        reward_days: number;
      }>(
        `SELECT id, reward_days
         FROM provider_referrals
         WHERE referrer_user_id = $1::uuid
           AND status = 'validado'
           AND reward_status = 'disponivel'`,
        [userId]
      ),
      pool.query<{
        id: string;
        referred_reward_days: number | null;
      }>(
        `SELECT id, referred_reward_days
         FROM provider_referrals
         WHERE referred_user_id = $1::uuid
           AND status = 'validado'
           AND referred_reward_status = 'disponivel'`,
        [userId]
      ),
    ]);

    const referrerDays = referrerRows.reduce(
      (acc, r) => acc + Number(r.reward_days || REFERRAL_REWARD_DAYS),
      0
    );
    const referredDays = referredRows.reduce(
      (acc, r) =>
        acc + Number(r.referred_reward_days || REFERRED_WELCOME_BONUS_DAYS),
      0
    );
    const totalDays = referrerDays + referredDays;

    if (
      (referrerRows.length === 0 && referredRows.length === 0) ||
      totalDays <= 0
    ) {
      return {
        applied: false,
        appliedDays: 0,
        appliedCount: 0,
        availableDays: 0,
        reason: 'Nenhum saldo de dias grátis disponível para aplicação no momento.',
      };
    }

    const { rows: subRows } = await pool.query<{
      id: string;
      fim: Date;
      ciclo: string;
      gateway_subscription_id: string | null;
      preco_mensal_centavos: number;
    }>(
      `SELECT s.id, s.fim, s.ciclo, s.gateway_subscription_id, p.preco_mensal_centavos
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       JOIN provider_profiles pp ON pp.id = s.provider_profile_id
       WHERE pp.user_id = $1::uuid
         AND s.status IN ('ativa', 'trial')
         AND p.preco_mensal_centavos > 0
         AND ($2::text IS NULL OR s.id = $2::text)
       ORDER BY s.criado_em DESC
       LIMIT 1`,
      [userId, preferredSubscriptionId || null]
    );

    if (subRows.length === 0) {
      return {
        applied: false,
        appliedDays: 0,
        appliedCount: 0,
        availableDays: totalDays,
        reason:
          'Ative um plano pago (ou os 90 dias grátis de boas-vindas) para somar automaticamente seu saldo de dias grátis na assinatura.',
      };
    }

    const sub = subRows[0];
    const baseFim = new Date(sub.fim);
    const now = new Date();
    const startExtensionFrom = baseFim > now ? baseFim : now;
    const newFim = new Date(
      startExtensionFrom.getTime() + totalDays * 24 * 60 * 60 * 1000
    );

    await pool.query(
      `UPDATE subscriptions
       SET fim = $2,
           proxima_cobranca = $2,
           atualizado_em = NOW()
       WHERE id = $1`,
      [sub.id, newFim]
    );

    if (
      sub.gateway_subscription_id &&
      !sub.gateway_subscription_id.startsWith('sub_free_')
    ) {
      try {
        await this.billing.updateSubscription(sub.gateway_subscription_id, {
          cycle: (sub.ciclo as BillingCycle) || 'mensal',
          nextDueDate: newFim.toISOString().slice(0, 10),
        });
      } catch {
        // Não bloquear crédito local caso gateway externo falhe momentaneamente
      }
    }

    const referrerIds = referrerRows.map((r) => r.id);
    const referredIds = referredRows.map((r) => r.id);
    if (referrerIds.length > 0) {
      await pool.query(
        `UPDATE provider_referrals
         SET reward_status = 'aplicado_na_assinatura',
             applied_subscription_id = $2,
             applied_at = NOW(),
             updated_at = NOW()
         WHERE id = ANY($1::text[])`,
        [referrerIds, sub.id]
      );
    }
    if (referredIds.length > 0) {
      await pool.query(
        `UPDATE provider_referrals
         SET referred_reward_status = 'aplicado_na_assinatura',
             referred_applied_subscription_id = $2,
             referred_applied_at = NOW(),
             updated_at = NOW()
         WHERE id = ANY($1::text[])`,
        [referredIds, sub.id]
      );
    }

    const evtId = `evt-ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await pool.query(
      `INSERT INTO subscription_events (id, subscription_id, evento, dados_anteriores_json, dados_novos_json)
       VALUES ($1, $2, 'referral_reward_applied', $3::jsonb, $4::jsonb)`,
      [
        evtId,
        sub.id,
        JSON.stringify({ fimAnterior: baseFim.toISOString() }),
        JSON.stringify({
          diasIndicador: referrerDays,
          diasBoasVindasIndicado: referredDays,
          diasAdicionados: totalDays,
          indicacoesAplicadas: referrerIds.length + referredIds.length,
          novoFim: newFim.toISOString(),
        }),
      ]
    );

    return {
      applied: true,
      appliedDays: totalDays,
      appliedCount: referrerIds.length + referredIds.length,
      availableDays: 0,
      subscriptionId: sub.id,
      newEndDate: newFim.toISOString(),
    };
  }

  async getReferralDashboardForUser(
    userId: string,
    providerProfileId?: string | null
  ) {
    await ensureSchemaAndSeed();
    const refCode = await this.getOrCreateReferralCode(
      userId,
      providerProfileId
    );

    const [{ rows: refRows }, { rows: eligibleSubRows }, { rows: receivedRows }] =
      await Promise.all([
        pool.query(
          `SELECT * FROM provider_referrals
           WHERE referrer_user_id = $1::uuid
           ORDER BY created_at DESC`,
          [userId]
        ),
        pool.query<{ id: string; plan_name: string; fim: Date }>(
          `SELECT s.id, p.nome AS plan_name, s.fim
           FROM subscriptions s
           JOIN plans p ON p.id = s.plan_id
           JOIN provider_profiles pp ON pp.id = s.provider_profile_id
           WHERE pp.user_id = $1::uuid
             AND s.status IN ('ativa', 'trial')
             AND p.preco_mensal_centavos > 0
           ORDER BY s.criado_em DESC
           LIMIT 1`,
          [userId]
        ),
        pool.query<{
          id: string;
          used_code: string;
          status: string;
          referred_reward_days: number | null;
          referred_reward_status: string | null;
          referred_applied_at: Date | null;
        }>(
          `SELECT pr.id,
                  rc.code AS used_code,
                  pr.status,
                  pr.referred_reward_days,
                  pr.referred_reward_status,
                  pr.referred_applied_at
           FROM provider_referrals pr
           JOIN referral_codes rc ON rc.id = pr.referral_code_id
           WHERE pr.referred_user_id = $1::uuid
           LIMIT 1`,
          [userId]
        ),
      ]);

    const mapped = refRows.map((row) => this.mapReferralRow(row));
    const receivedRow = receivedRows[0];
    const receivedWelcomeBonus = receivedRow
      ? {
          id: receivedRow.id,
          code: receivedRow.used_code,
          status: receivedRow.status as ReferralStatus,
          rewardDays: Number(
            receivedRow.referred_reward_days ?? REFERRED_WELCOME_BONUS_DAYS
          ),
          rewardStatus: (receivedRow.referred_reward_status ||
            'pendente') as ReferralRewardStatus,
          appliedAt: receivedRow.referred_applied_at
            ? new Date(receivedRow.referred_applied_at).toISOString()
            : null,
        }
      : null;

    const metrics = computeReferralMetrics({
      clicksCount: refCode.clicksCount,
      referrals: mapped.map((r) => ({
        status: r.status,
        rewardDays: r.rewardDays,
        rewardStatus: r.rewardStatus,
      })),
      receivedWelcomeBonus,
    });

    return {
      referralCode: refCode,
      metrics,
      referrals: mapped,
      receivedWelcomeBonus,
      activeSubscription: eligibleSubRows[0]
        ? {
            id: eligibleSubRows[0].id,
            planName: eligibleSubRows[0].plan_name,
            fim: new Date(eligibleSubRows[0].fim).toISOString(),
          }
        : null,
    };
  }

  async getAdminReferralAnalytics() {
    await ensureSchemaAndSeed();

    const [{ rows: codesAgg }, { rows: refRows }, { rows: topRows }] =
      await Promise.all([
        pool.query<{ total_codes: string; total_clicks: string }>(
          `SELECT COUNT(*)::text AS total_codes, COALESCE(SUM(clicks_count), 0)::text AS total_clicks FROM referral_codes`
        ),
        pool.query<{
          status: string;
          reward_days: number;
          reward_status: string;
          referred_reward_days: number | null;
          referred_reward_status: string | null;
        }>(
          `SELECT status, reward_days, reward_status,
                  COALESCE(referred_reward_days, 10) AS referred_reward_days,
                  COALESCE(referred_reward_status, 'pendente') AS referred_reward_status
           FROM provider_referrals`
        ),
        pool.query<{
          referrer_user_id: string;
          referrer_name: string | null;
          code: string;
          validated_count: string;
          total_days: string;
        }>(
          `SELECT rc.user_id AS referrer_user_id,
                  COALESCE(p.full_name, u.email) AS referrer_name,
                  rc.code,
                  COUNT(pr.id) FILTER (WHERE pr.status = 'validado')::text AS validated_count,
                  COALESCE(SUM(pr.reward_days) FILTER (WHERE pr.status = 'validado'), 0)::text AS total_days
           FROM referral_codes rc
           JOIN users u ON u.id = rc.user_id
           LEFT JOIN profiles p ON p.user_id = u.id
           LEFT JOIN provider_referrals pr ON pr.referral_code_id = rc.id
           GROUP BY rc.user_id, p.full_name, u.email, rc.code, rc.clicks_count
           ORDER BY COUNT(pr.id) FILTER (WHERE pr.status = 'validado') DESC, rc.clicks_count DESC
           LIMIT 10`
        ),
      ]);

    const clicksCount = Number(codesAgg[0]?.total_clicks || 0);
    const totalCodesGenerated = Number(codesAgg[0]?.total_codes || 0);
    const summary = computeReferralMetrics({
      clicksCount,
      referrals: refRows.map((r) => ({
        status: r.status,
        rewardDays: Number(r.reward_days || REFERRAL_REWARD_DAYS),
        rewardStatus: r.reward_status,
      })),
    });

    let totalReferredBonusDays = 0;
    let appliedReferredBonusDays = 0;
    for (const r of refRows) {
      if (r.status === 'validado') {
        const refBonus = Number(
          r.referred_reward_days ?? REFERRED_WELCOME_BONUS_DAYS
        );
        totalReferredBonusDays += refBonus;
        if (r.referred_reward_status === 'aplicado_na_assinatura') {
          appliedReferredBonusDays += refBonus;
        }
      }
    }

    return {
      metrics: {
        totalCodesGenerated,
        ...summary,
        totalReferredBonusDays,
        appliedReferredBonusDays,
      },
      topReferrers: topRows.map((t) => ({
        userId: t.referrer_user_id,
        name: t.referrer_name || 'Usuário',
        code: t.code,
        validatedCount: Number(t.validated_count || 0),
        totalDaysGranted: Number(t.total_days || 0),
      })),
    };
  }

  private mapReferralRow(row: any) {
    return {
      id: row.id,
      referralCodeId: row.referral_code_id,
      referrerUserId: row.referrer_user_id,
      referrerProviderProfileId: row.referrer_provider_profile_id || null,
      referredUserId: row.referred_user_id || null,
      referredProviderProfileId: row.referred_provider_profile_id || null,
      referredName: row.referred_name || '',
      referredEmail: row.referred_email || '',
      referredPhone: row.referred_phone || '',
      referredCategory: row.referred_category || null,
      status: row.status as ReferralStatus,
      rewardDays: Number(row.reward_days ?? REFERRAL_REWARD_DAYS),
      rewardStatus: row.reward_status as ReferralRewardStatus,
      appliedSubscriptionId: row.applied_subscription_id || null,
      appliedAt: row.applied_at ? new Date(row.applied_at).toISOString() : null,
      referredRewardDays: Number(
        row.referred_reward_days ?? REFERRED_WELCOME_BONUS_DAYS
      ),
      referredRewardStatus: (row.referred_reward_status ||
        'pendente') as ReferralRewardStatus,
      referredAppliedSubscriptionId: row.referred_applied_subscription_id || null,
      referredAppliedAt: row.referred_applied_at
        ? new Date(row.referred_applied_at).toISOString()
        : null,
      createdAt: new Date(row.created_at).toISOString(),
      validatedAt: row.validated_at
        ? new Date(row.validated_at).toISOString()
        : null,
    };
  }
}
