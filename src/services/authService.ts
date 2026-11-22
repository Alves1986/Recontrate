import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { ensureSchemaAndSeed, neonEnv, pool } from '../db/index';
import { getNodeEnvironment } from '../config/environment';
import { verifyNeonAuthJwt } from '../server/neonServices';
import type { AppRole } from '../db/rls';
import { ProviderReferralService } from './providerReferralService';
import { SpecialtiesTaxonomyService } from './specialtiesService';
import { TransactionalEmailService } from './essentialIntegrations';

const referralService = new ProviderReferralService();
const emailService = new TransactionalEmailService();

export type UserRole = 'cliente' | 'prestador' | 'padrinho' | 'admin';
export type AccountStatus = 'pendente_confirmacao' | 'ativo' | 'suspenso';

export interface AuthenticatedUserSession {
  userId: string;
  neonAuthUserId: string | null;
  email: string;
  fullName: string;
  phone?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  category?: string | null;
  bio?: string | null;
  roles: UserRole[];
  activeRole: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  providerProfileId: string | null;
  redirectTo: string;
}

let ephemeralDevSessionSecret: Uint8Array | null = null;
let cachedSessionSecretRaw: string | null = null;
let cachedSessionSecretBytes: Uint8Array | null = null;

export function resetSessionSecretCacheForTests(): void {
  if (process.env.NODE_ENV === 'test') {
    cachedSessionSecretRaw = null;
    cachedSessionSecretBytes = null;
  }
}

export function getSessionSecretBytes(): Uint8Array {
  const raw = (process.env.SESSION_SECRET || '').trim();
  const nodeEnv = getNodeEnvironment();
  const isSharedRuntime =
    nodeEnv === 'production' ||
    nodeEnv === 'staging' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview';

  if (raw && !raw.startsWith('YOUR_')) {
    if (raw.length < 32) {
      throw new Error(
        'Configuração de segurança inválida: SESSION_SECRET deve possuir ao menos 32 caracteres de alta entropia.'
      );
    }
    if (cachedSessionSecretRaw !== raw || !cachedSessionSecretBytes) {
      cachedSessionSecretRaw = raw;
      cachedSessionSecretBytes = new TextEncoder().encode(raw);
    }
    return cachedSessionSecretBytes;
  }

  if (isSharedRuntime) {
    throw new Error(
      'Variável de ambiente obrigatória ausente: defina SESSION_SECRET dedicada com ao menos 32 caracteres aleatórios.'
    );
  }

  if (!ephemeralDevSessionSecret) {
    ephemeralDevSessionSecret = crypto.randomBytes(32);
  }
  return ephemeralDevSessionSecret;
}

export function hashOneTimeToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export function signEmailActionToken(email: string, purpose = 'unsubscribe'): string {
  const normalized = email.trim().toLowerCase();
  const payloadB64 = Buffer.from(
    JSON.stringify({ email: normalized, purpose }),
    'utf-8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', Buffer.from(getSessionSecretBytes()))
    .update(`${purpose}:${normalized}`)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyEmailActionToken(
  token: string,
  expectedPurpose = 'unsubscribe'
): { email: string } | null {
  try {
    const parts = (token || '').split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, providedSig] = parts;
    const decoded = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    ) as { email?: string; purpose?: string };
    if (!decoded?.email || decoded.purpose !== expectedPurpose) return null;
    const normalized = decoded.email.trim().toLowerCase();
    const expectedSig = crypto
      .createHmac('sha256', Buffer.from(getSessionSecretBytes()))
      .update(`${expectedPurpose}:${normalized}`)
      .digest('base64url');
    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return { email: normalized };
  } catch {
    return null;
  }
}

export function getRedirectPathForRole(
  role: UserRole,
  onboardingCompleted = true
): string {
  if (!onboardingCompleted) {
    return '/app/onboarding';
  }
  switch (role) {
    case 'admin':
      return '/admin';
    case 'padrinho':
      return '/app/padrinho';
    case 'prestador':
      return '/app/prestador';
    case 'cliente':
    default:
      return '/app';
  }
}

export function sanitizeUserText(input: string): string {
  return (input || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/javascript:/gi, '')
    .trim();
}

function getAppBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.VITE_APP_URL ||
    'http://localhost:3005'
  ).replace(/\/$/, '');
}

export class AuthService {
  private get authBaseUrl(): string {
    return neonEnv.auth.baseUrl.replace(/\/$/, '');
  }

  async logAudit(params: {
    actorUserId?: string | null;
    actorRole: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    await ensureSchemaAndSeed();
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, actor_role, action, target_type, target_id, metadata_json, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.actorUserId || null,
        params.actorRole,
        params.action,
        params.targetType,
        params.targetId || null,
        params.metadata ? JSON.stringify(params.metadata) : null,
        params.ipAddress || '127.0.0.1',
      ]
    );
  }

  async mintSessionToken(session: AuthenticatedUserSession): Promise<string> {
    return new SignJWT({
      email: session.email,
      fullName: session.fullName,
      roles: session.roles,
      activeRole: session.activeRole,
      status: session.status,
      emailVerified: session.emailVerified,
      onboardingCompleted: session.onboardingCompleted,
      providerProfileId: session.providerProfileId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(session.userId)
      .setIssuedAt()
      .setIssuer('confiare-auth')
      .setExpirationTime('24h')
      .sign(getSessionSecretBytes());
  }

  private async ensureAppUserFromNeonAuth(params: {
    neonAuthUserId: string | null;
    email: string;
    fullName?: string;
    emailVerified?: boolean;
  }) {
    const emailNormalized = params.email.trim().toLowerCase();
    const fallbackName = sanitizeUserText(
      params.fullName || emailNormalized.split('@')[0] || 'Usuário'
    );
    const verified = Boolean(params.emailVerified);
    const initialStatus: AccountStatus = verified ? 'ativo' : 'pendente_confirmacao';
    const inserted = await pool.query(
      `INSERT INTO users (
        neon_auth_user_id, email, roles, active_role, status,
        email_verified, verification_token, onboarding_completed
      ) VALUES ($1, $2, ARRAY['cliente']::TEXT[], 'cliente', $3, $4, NULL, false)
      ON CONFLICT (email) DO UPDATE SET
        neon_auth_user_id = COALESCE(users.neon_auth_user_id, EXCLUDED.neon_auth_user_id),
        email_verified = users.email_verified OR EXCLUDED.email_verified,
        status = CASE
          WHEN users.status = 'pendente_confirmacao' AND EXCLUDED.email_verified THEN 'ativo'
          ELSE users.status
        END,
        updated_at = NOW()
      RETURNING *`,
      [params.neonAuthUserId, emailNormalized, initialStatus, verified]
    );
    const user = inserted.rows[0];
    await pool
      .query(
        `INSERT INTO profiles (user_id, full_name, phone, city, neighborhood, lgpd_consent, lgpd_consent_at)
         VALUES ($1, $2, '', 'São Paulo, SP', 'Pinheiros', false, NULL)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, fallbackName]
      )
      .catch(() => null);
    await pool
      .query(
        `INSERT INTO customer_profiles (user_id, favorite_categories, preferred_contact)
         VALUES ($1, ARRAY['Eletricista']::TEXT[], 'WhatsApp')
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      )
      .catch(() => null);
    user.full_name = fallbackName;
    user.provider_profile_id = null;
    return user;
  }

  async verifySessionToken(token: string): Promise<AuthenticatedUserSession> {
    if (!token || token.split('.').length !== 3) {
      throw new Error('Sessão expirada ou inválida. Faça login novamente.');
    }

    let userId: string | undefined;
    let neonAuthSub: string | undefined;
    let neonPayload: Record<string, unknown> | undefined;

    try {
      const { payload } = await jwtVerify(token, getSessionSecretBytes(), {
        issuer: 'confiare-auth',
      });
      userId = payload.sub;
    } catch {
      try {
        const verifiedNeon = await verifyNeonAuthJwt(token);
        neonAuthSub = verifiedNeon.sub;
        neonPayload = verifiedNeon as Record<string, unknown>;
      } catch {
        throw new Error('Sessão expirada ou inválida. Faça login novamente.');
      }
    }

    await ensureSchemaAndSeed();
    const { rows } = await pool.query(
      `SELECT u.*,
              p.full_name,
              p.phone,
              p.city,
              p.neighborhood,
              pp.id AS provider_profile_id,
              pp.category AS provider_category,
              pp.bio AS provider_bio
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN provider_profiles pp ON pp.user_id = u.id
       WHERE (($1::uuid IS NOT NULL AND u.id = $1::uuid)
          OR ($2::text IS NOT NULL AND u.neon_auth_user_id = $2::text))
         AND u.deleted_at IS NULL
       LIMIT 1`,
      [userId || null, neonAuthSub || null]
    );

    let user = rows[0];
    if (!user && neonAuthSub && typeof neonPayload?.email === 'string') {
      user = await this.ensureAppUserFromNeonAuth({
        neonAuthUserId: neonAuthSub,
        email: neonPayload.email,
        fullName:
          typeof neonPayload.name === 'string' ? neonPayload.name : undefined,
        emailVerified: Boolean(neonPayload.email_verified),
      });
    }

    if (!user || user.deleted_at) {
      throw new Error('Sessão inválida ou usuário não encontrado.');
    }

    if (user.status === 'suspenso') {
      throw new Error('Conta suspensa. Acesso bloqueado.');
    }

    const activeRole = (user.active_role || 'cliente') as UserRole;
    const onboardingCompleted = Boolean(user.onboarding_completed);

    return {
      userId: user.id,
      neonAuthUserId: user.neon_auth_user_id,
      email: user.email,
      fullName: user.full_name || user.email,
      phone: user.phone || null,
      city: user.city || null,
      neighborhood: user.neighborhood || null,
      category: user.provider_category || null,
      bio: user.provider_bio || null,
      roles: (user.roles || ['cliente']) as UserRole[],
      activeRole,
      status: user.status as AccountStatus,
      emailVerified: Boolean(user.email_verified),
      onboardingCompleted,
      providerProfileId: user.provider_profile_id || null,
      redirectTo: getRedirectPathForRole(activeRole, onboardingCompleted),
    };
  }

  /**
   * 1. Cadastro real via Neon Auth + criação de users, profiles e customer/provider profile.
   * Nunca armazena senha na tabela da aplicação nem expõe token de verificação na resposta HTTP.
   */
  async registerUser(input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    city?: string;
    neighborhood?: string;
    role: 'cliente' | 'prestador';
    alsoEnableSecondRole?: boolean;
    category?: string;
    bio?: string;
    categoryId?: string;
    specialtyIds?: string[];
    principalSpecialtyId?: string;
    lgpdConsent: boolean;
    referralCode?: string;
    ipAddress?: string;
    birthDate?: string;
    ageVerified18Plus?: boolean;
    marketingOptIn?: boolean;
    aiTrainingOptOut?: boolean;
    termsVersion?: string;
    privacyVersion?: string;
    userAgent?: string;
  }) {
    if (!input.lgpdConsent) {
      throw new Error(
        'É obrigatório aceitar os Termos de Uso e a Política de Privacidade LGPD para criar uma conta.'
      );
    }

    await ensureSchemaAndSeed();

    const emailNormalized = input.email.trim().toLowerCase();
    const cleanName = sanitizeUserText(input.fullName);
    const cleanPhone = sanitizeUserText(input.phone || '');
    const cleanCity = sanitizeUserText(input.city || 'São Paulo, SP');
    const cleanNeighborhood = sanitizeUserText(
      input.neighborhood || 'Pinheiros'
    );
    const roles: UserRole[] = input.alsoEnableSecondRole
      ? ['cliente', 'prestador']
      : [input.role];
    const activeRole: UserRole = input.role;
    const isProvider = roles.includes('prestador');
    const hasOfficialSpecialties = Boolean(
      input.categoryId &&
        Array.isArray(input.specialtyIds) &&
        input.specialtyIds.length >= 1 &&
        input.specialtyIds.length <= 5
    );
    const autoCompleteOnboarding = !isProvider || hasOfficialSpecialties;
    const cleanBio = sanitizeUserText(
      input.bio?.trim() ||
        'Profissional autônomo dedicado a atendimentos pontuais e seguros.'
    );

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1',
      [emailNormalized]
    );
    if (existing.rows.length > 0) {
      throw new Error('Já existe uma conta cadastrada com este e-mail.');
    }

    const signUpRes = await fetch(`${this.authBaseUrl}/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: getAppBaseUrl(),
      },
      body: JSON.stringify({
        email: emailNormalized,
        password: input.password,
        name: cleanName,
      }),
    });

    if (!signUpRes.ok) {
      const errBody = await signUpRes.text();
      if (
        signUpRes.status === 422 ||
        errBody.toLowerCase().includes('already exists') ||
        errBody.toLowerCase().includes('exist')
      ) {
        const retrySignIn = await fetch(`${this.authBaseUrl}/sign-in/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: getAppBaseUrl(),
          },
          body: JSON.stringify({
            email: emailNormalized,
            password: input.password,
          }),
        }).catch(() => null);
        if (!retrySignIn || !retrySignIn.ok) {
          throw new Error('Já existe uma conta cadastrada com este e-mail.');
        }
        const retryData = (await retrySignIn.json()) as {
          user?: { id?: string; email?: string };
        };
        (signUpRes as any).__recoveredUser = retryData.user;
      } else {
        throw new Error(
          `Falha ao registrar credenciais no Neon Auth (${signUpRes.status}): ${errBody}`
        );
      }
    }

    const signUpData = (signUpRes as any).__recoveredUser
      ? { user: (signUpRes as any).__recoveredUser }
      : ((await signUpRes.json()) as {
          user?: { id?: string; email?: string };
        });
    const neonAuthUserId = signUpData.user?.id || null;

    const rawVerificationToken = `vfy_${crypto.randomBytes(24).toString('hex')}`;
    const verificationTokenHash = hashOneTimeToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const userInsert = await pool.query(
      `INSERT INTO users (
        neon_auth_user_id, email, roles, active_role, status,
        email_verified, verification_token, verification_token_hash,
        verification_token_expires_at, onboarding_completed
      ) VALUES ($1, $2, $3, $4, 'pendente_confirmacao', false, NULL, $5, $6, $7)
      RETURNING *`,
      [
        neonAuthUserId,
        emailNormalized,
        roles,
        activeRole,
        verificationTokenHash,
        verificationExpiresAt,
        autoCompleteOnboarding,
      ]
    );
    const createdUser = userInsert.rows[0];

    try {
      const termsVer = input.termsVersion || '2026-04-v1';
      const privacyVer = input.privacyVersion || '2026-04-v1';
      await pool.query(
        `INSERT INTO profiles (
          user_id, full_name, phone, city, neighborhood,
          lgpd_consent, lgpd_consent_at,
          birth_date, age_verified_18_plus,
          terms_version, privacy_version, terms_accepted_at, privacy_accepted_at,
          marketing_opt_in, marketing_opt_in_at, ai_training_opt_out
        ) VALUES ($1, $2, $3, $4, $5, true, NOW(), $6, $7, $8, $9, NOW(), NOW(), $10, $11, $12)`,
        [
          createdUser.id,
          cleanName,
          cleanPhone,
          cleanCity,
          cleanNeighborhood,
          input.birthDate || null,
          Boolean(input.ageVerified18Plus),
          termsVer,
          privacyVer,
          Boolean(input.marketingOptIn),
          input.marketingOptIn ? new Date() : null,
          input.aiTrainingOptOut ?? true,
        ]
      );

      await pool
        .query(
          `INSERT INTO consent_logs (user_id, consent_type, granted, document_version, ip_address, user_agent)
           VALUES ($1, 'terms_and_privacy', true, $2, $3, $4),
                  ($1, 'marketing', $5, $2, $3, $4)`,
          [
            createdUser.id,
            `${termsVer}|${privacyVer}`,
            input.ipAddress || '127.0.0.1',
            input.userAgent || null,
            Boolean(input.marketingOptIn),
          ]
        )
        .catch(() => null);

      if (roles.includes('cliente')) {
        await pool.query(
          `INSERT INTO customer_profiles (user_id, favorite_categories, preferred_contact)
           VALUES ($1, $2, 'WhatsApp')
           ON CONFLICT (user_id) DO NOTHING`,
          [createdUser.id, input.category ? [input.category] : ['Eletricista']]
        );
      }

      let providerProfileId: string | null = null;
      let resolvedCategoryName = input.category || 'Elétrica';
      if (isProvider) {
        providerProfileId = `prov-${createdUser.id.slice(0, 8)}`;
        const slug = `${cleanName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}-${createdUser.id.slice(0, 4)}`;

        await pool.query(
          `INSERT INTO provider_profiles (
            id, user_id, slug, name, professional_name, category, city,
            neighborhoods, bio, plan_slug, whatsapp, verification_status, is_verified
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'gratuito', $10, 'pendente', false)`,
          [
            providerProfileId,
            createdUser.id,
            slug,
            cleanName,
            cleanName,
            resolvedCategoryName,
            cleanCity,
            [cleanNeighborhood],
            cleanBio,
            cleanPhone || '(11) 99000-0000',
          ]
        );

        if (hasOfficialSpecialties) {
          const taxonomyService = new SpecialtiesTaxonomyService();
          const savedTax = await taxonomyService.setProviderOfficialSpecialties({
            providerProfileId,
            categoryId: input.categoryId!,
            specialtyIds: input.specialtyIds!,
            principalSpecialtyId: input.principalSpecialtyId,
          });
          resolvedCategoryName = savedTax.categoryName;
        }

        try {
          await referralService.recordReferredProviderSignup({
            referralCode: input.referralCode,
            referredUserId: createdUser.id,
            referredProviderProfileId: providerProfileId,
            referredName: cleanName,
            referredEmail: emailNormalized,
            referredPhone: cleanPhone,
            referredCategory: resolvedCategoryName,
          });
        } catch {
          // Não bloquear o cadastro se o registro de indicação falhar
        }
      }

      const verificationUrl = `${getAppBaseUrl()}/verificar-email?token=${encodeURIComponent(
        rawVerificationToken
      )}`;

      await emailService.sendEmail({
        to: emailNormalized,
        subject: 'Confirme seu e-mail no Recontrate',
        template: 'verificacao_email',
        variables: {
          fullName: cleanName,
          verificationToken: rawVerificationToken,
          verificationUrl,
        },
        userId: createdUser.id,
      });

      await this.logAudit({
        actorUserId: createdUser.id,
        actorRole: activeRole,
        action: 'user_registered',
        targetType: 'user',
        targetId: createdUser.id,
        metadata: { email: emailNormalized, roles, emailVerified: false },
        ipAddress: input.ipAddress,
      });

      return {
        requiresEmailVerification: true,
        message:
          'Conta criada! Enviamos um link de confirmação para o seu e-mail antes do primeiro acesso.',
        user: {
          userId: createdUser.id,
          neonAuthUserId,
          email: emailNormalized,
          fullName: cleanName,
          phone: cleanPhone,
          city: cleanCity,
          neighborhood: cleanNeighborhood,
          category: isProvider ? resolvedCategoryName : input.category || null,
          bio: isProvider ? cleanBio : null,
          roles,
          activeRole,
          status: 'pendente_confirmacao' as AccountStatus,
          emailVerified: false,
          onboardingCompleted: autoCompleteOnboarding,
          providerProfileId,
          redirectTo: '/verificar-email',
        } satisfies AuthenticatedUserSession,
      };
    } catch (err) {
      await pool
        .query('DELETE FROM users WHERE id = $1::uuid', [createdUser.id])
        .catch(() => null);
      throw err;
    }
  }

  /**
   * 2. Confirmação de e-mail por hash SHA-256 e uso único com expiração de 24h
   */
  async verifyEmail(verificationToken: string) {
    await ensureSchemaAndSeed();
    const tokenHash = hashOneTimeToken(verificationToken);

    const { rows } = await pool.query(
      `UPDATE users
       SET email_verified = true,
           email_verified_at = NOW(),
           status = CASE WHEN status = 'pendente_confirmacao' THEN 'ativo' ELSE status END,
           verification_token = NULL,
           verification_token_hash = NULL,
           verification_token_expires_at = NULL,
           updated_at = NOW()
       WHERE verification_token_hash = $1
         AND (verification_token_expires_at IS NULL OR verification_token_expires_at > NOW())
         AND deleted_at IS NULL
       RETURNING id, neon_auth_user_id, email, roles, active_role, status, email_verified, onboarding_completed`,
      [tokenHash]
    );

    if (rows.length === 0) {
      throw new Error(
        'Token de confirmação de e-mail inválido, expirado ou já utilizado.'
      );
    }

    const updated = rows[0];
    if (updated.neon_auth_user_id) {
      await pool
        .query(
          `UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = $1::uuid`,
          [updated.neon_auth_user_id]
        )
        .catch(() => null);
    }

    if (
      updated.onboarding_completed &&
      Array.isArray(updated.roles) &&
      updated.roles.includes('prestador')
    ) {
      await referralService
        .validateReferralAndGrantDays(updated.id)
        .catch(() => null);
    }

    const { rows: detailRows } = await pool.query(
      `SELECT p.full_name, p.phone, p.city, p.neighborhood,
              pp.id AS provider_profile_id, pp.category AS provider_category, pp.bio AS provider_bio
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN provider_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1::uuid
       LIMIT 1`,
      [updated.id]
    );
    const detail = detailRows[0] || {};
    const activeRole = (updated.active_role || 'cliente') as UserRole;
    const onboardingCompleted = Boolean(updated.onboarding_completed);

    const session: AuthenticatedUserSession = {
      userId: updated.id,
      neonAuthUserId: updated.neon_auth_user_id || null,
      email: updated.email,
      fullName: detail.full_name || updated.email,
      phone: detail.phone || null,
      city: detail.city || null,
      neighborhood: detail.neighborhood || null,
      category: detail.provider_category || null,
      bio: detail.provider_bio || null,
      roles: (updated.roles || ['cliente']) as UserRole[],
      activeRole,
      status: updated.status as AccountStatus,
      emailVerified: true,
      onboardingCompleted,
      providerProfileId: detail.provider_profile_id || null,
      redirectTo: getRedirectPathForRole(activeRole, onboardingCompleted),
    };

    const token = await this.mintSessionToken(session);

    await this.logAudit({
      actorUserId: updated.id,
      actorRole: updated.active_role,
      action: 'email_verified',
      targetType: 'user',
      targetId: updated.id,
    });

    return {
      user: session,
      token,
      redirectTo: session.redirectTo,
    };
  }

  /**
   * 2.1. Reenvio de confirmação de e-mail (nunca vaza token na resposta HTTP)
   */
  async resendVerificationEmail(email: string) {
    await ensureSchemaAndSeed();
    const emailNormalized = email.trim().toLowerCase();
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.email_verified, u.status, p.full_name
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [emailNormalized]
    );

    const user = rows[0];
    if (user && (!user.email_verified || user.status === 'pendente_confirmacao')) {
      const rawToken = `vfy_${crypto.randomBytes(24).toString('hex')}`;
      const tokenHash = hashOneTimeToken(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await pool.query(
        `UPDATE users
         SET verification_token = NULL,
             verification_token_hash = $1,
             verification_token_expires_at = $2,
             updated_at = NOW()
         WHERE id = $3::uuid`,
        [tokenHash, expiresAt, user.id]
      );

      const verificationUrl = `${getAppBaseUrl()}/verificar-email?token=${encodeURIComponent(
        rawToken
      )}`;
      await emailService.sendEmail({
        to: emailNormalized,
        subject: 'Novo link de confirmação de e-mail — Recontrate',
        template: 'verificacao_email',
        variables: {
          fullName: user.full_name || emailNormalized,
          verificationToken: rawToken,
          verificationUrl,
        },
        userId: user.id,
      });
    }

    return {
      ok: true,
      message:
        'Se o e-mail estiver cadastrado e aguardando confirmação, enviamos um novo link.',
    };
  }

  /**
   * 3. Login real via Neon Auth + verificação estrita de e-mail confirmado, suspensão e redirecionamento
   */
  async loginUser(input: {
    email: string;
    password: string;
    ipAddress?: string;
  }) {
    await ensureSchemaAndSeed();
    const emailNormalized = input.email.trim().toLowerCase();

    const { rows } = await pool.query(
      `SELECT u.*,
              p.full_name,
              p.phone,
              p.city,
              p.neighborhood,
              pp.id AS provider_profile_id,
              pp.category AS provider_category,
              pp.bio AS provider_bio
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN provider_profiles pp ON pp.user_id = u.id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [emailNormalized]
    );

    let user = rows[0];
    if (user && user.status === 'suspenso') {
      await this.logAudit({
        actorUserId: user.id,
        actorRole: user.active_role,
        action: 'blocked_suspended_login_attempt',
        targetType: 'user',
        targetId: user.id,
        ipAddress: input.ipAddress,
      });
      throw new Error(
        'Sua conta está suspensa temporariamente. Entre em contato com o suporte do Recontrate.'
      );
    }

    const signInRes = await fetch(`${this.authBaseUrl}/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: getAppBaseUrl(),
      },
      body: JSON.stringify({
        email: emailNormalized,
        password: input.password,
      }),
    });

    if (!signInRes.ok) {
      const errText = await signInRes.text().catch(() => '');
      if (
        signInRes.status === 403 &&
        errText.toLowerCase().includes('verif')
      ) {
        throw Object.assign(
          new Error(
            'E-mail ainda não confirmado. Verifique sua caixa de entrada pelo link enviado antes de entrar.'
          ),
          { code: 'EMAIL_NOT_VERIFIED' }
        );
      }
      throw new Error('Credenciais inválidas (e-mail ou senha incorretos).');
    }

    const signInData = (await signInRes.json().catch(() => null)) as {
      user?: {
        id?: string;
        email?: string;
        name?: string;
        emailVerified?: boolean;
      };
    } | null;

    if (!user) {
      user = await this.ensureAppUserFromNeonAuth({
        neonAuthUserId: signInData?.user?.id || null,
        email: emailNormalized,
        fullName: signInData?.user?.name,
        emailVerified: Boolean(signInData?.user?.emailVerified),
      });
    }

    if (!user.email_verified || user.status === 'pendente_confirmacao') {
      throw Object.assign(
        new Error(
          'E-mail ainda não confirmado. Confirme seu cadastro pelo link enviado por e-mail antes de acessar.'
        ),
        { code: 'EMAIL_NOT_VERIFIED' }
      );
    }

    const activeRole = (user.active_role || 'cliente') as UserRole;
    const onboardingCompleted = Boolean(user.onboarding_completed);

    const session: AuthenticatedUserSession = {
      userId: user.id,
      neonAuthUserId: user.neon_auth_user_id,
      email: user.email,
      fullName: user.full_name || user.email,
      phone: user.phone || null,
      city: user.city || null,
      neighborhood: user.neighborhood || null,
      category: user.provider_category || null,
      bio: user.provider_bio || null,
      roles: (user.roles || ['cliente']) as UserRole[],
      activeRole,
      status: user.status as AccountStatus,
      emailVerified: Boolean(user.email_verified),
      onboardingCompleted,
      providerProfileId: user.provider_profile_id || null,
      redirectTo: getRedirectPathForRole(activeRole, onboardingCompleted),
    };

    const token = await this.mintSessionToken(session);

    await this.logAudit({
      actorUserId: user.id,
      actorRole: activeRole,
      action: 'user_logged_in',
      targetType: 'user',
      targetId: user.id,
      ipAddress: input.ipAddress,
    });

    return {
      user: session,
      token,
      redirectTo: session.redirectTo,
    };
  }


  /**
   * 4. Recuperação de Senha (requestPasswordReset + resetPassword com hash SHA-256 e uso único)
   */
  async requestPasswordReset(email: string) {
    await ensureSchemaAndSeed();
    const emailNormalized = email.trim().toLowerCase();

    const { rows } = await pool.query(
      `SELECT id, neon_auth_user_id, email, active_role
       FROM users
       WHERE email = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [emailNormalized]
    );

    if (rows.length > 0) {
      const user = rows[0];
      const rawResetToken = `rst_${crypto.randomBytes(24).toString('hex')}`;
      const resetTokenHash = hashOneTimeToken(rawResetToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await pool.query(
        `UPDATE users
         SET reset_password_token = NULL,
             reset_password_token_hash = $1,
             reset_password_expires_at = $2,
             updated_at = NOW()
         WHERE id = $3::uuid`,
        [resetTokenHash, expiresAt, user.id]
      );

      const resetUrl = `${getAppBaseUrl()}/entrar?resetToken=${encodeURIComponent(
        rawResetToken
      )}`;

      await emailService.sendEmail({
        to: user.email,
        subject: 'Recuperação de senha — Recontrate',
        template: 'recuperacao_senha',
        variables: {
          resetToken: rawResetToken,
          resetUrl,
        },
        userId: user.id,
      });

      await this.logAudit({
        actorUserId: user.id,
        actorRole: user.active_role,
        action: 'password_reset_requested',
        targetType: 'user',
        targetId: user.id,
      });
    }

    return {
      ok: true,
      message:
        'Se o e-mail estiver cadastrado, enviamos as instruções de redefinição de senha.',
    };
  }

  async resetPassword(params: { resetToken: string; newPassword: string }) {
    await ensureSchemaAndSeed();
    if (!params.newPassword || params.newPassword.length < 8) {
      throw new Error('A nova senha deve ter pelo menos 8 caracteres.');
    }

    const tokenHash = hashOneTimeToken(params.resetToken);
    const { rows } = await pool.query(
      `SELECT id, neon_auth_user_id, email, active_role, reset_password_expires_at
       FROM users
       WHERE reset_password_token_hash = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [tokenHash]
    );

    const user = rows[0];
    if (
      !user ||
      !user.reset_password_expires_at ||
      new Date(user.reset_password_expires_at) < new Date()
    ) {
      throw new Error('Token de recuperação de senha inválido ou expirado.');
    }

    const neonBridgeToken = `rst_bridge_${crypto.randomBytes(16).toString('hex')}`;
    const bridgeIdentifier = `reset-password:${neonBridgeToken}`;
    const bridgeExpires = new Date(Date.now() + 2 * 60 * 1000);

    if (user.neon_auth_user_id) {
      await pool.query(
        `INSERT INTO neon_auth.verification (identifier, value, "expiresAt")
         VALUES ($1, $2, $3)`,
        [bridgeIdentifier, user.neon_auth_user_id, bridgeExpires]
      );
    }

    try {
      const resetRes = await fetch(`${this.authBaseUrl}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: getAppBaseUrl(),
        },
        body: JSON.stringify({
          newPassword: params.newPassword,
          token: neonBridgeToken,
        }),
      });

      if (!resetRes.ok) {
        const errText = await resetRes.text();
        throw new Error(
          `Falha ao redefinir senha no Neon Auth (${resetRes.status}): ${errText}`
        );
      }

      const invalidated = await pool.query(
        `UPDATE users
         SET reset_password_token = NULL,
             reset_password_token_hash = NULL,
             reset_password_expires_at = NULL,
             updated_at = NOW()
         WHERE id = $1::uuid
           AND reset_password_token_hash = $2
         RETURNING id`,
        [user.id, tokenHash]
      );
      if (invalidated.rowCount === 0) {
        throw new Error('Token de recuperação de senha já foi utilizado.');
      }
    } finally {
      if (user.neon_auth_user_id) {
        await pool
          .query(`DELETE FROM neon_auth.verification WHERE identifier = $1`, [
            bridgeIdentifier,
          ])
          .catch(() => null);
      }
    }

    await this.logAudit({
      actorUserId: user.id,
      actorRole: user.active_role,
      action: 'password_reset_completed',
      targetType: 'user',
      targetId: user.id,
    });

    return { ok: true, email: user.email };
  }

  /**
   * 5. Onboarding obrigatório após o primeiro login
   */
  async completeOnboarding(params: {
    userId: string;
    phone?: string;
    city?: string;
    neighborhood?: string;
    category?: string;
    bio?: string;
    yearsExperience?: number;
    enforceOfficialSpecialties?: boolean;
  }) {
    await ensureSchemaAndSeed();

    if (params.enforceOfficialSpecialties) {
      const { rows: provRows } = await pool.query<{ id: string }>(
        `SELECT id FROM provider_profiles WHERE user_id = $1::uuid LIMIT 1`,
        [params.userId]
      );
      if (provRows.length > 0) {
        const { rows: countRows } = await pool.query<{ total: string }>(
          `SELECT COUNT(*)::text AS total
           FROM provider_specialties
           WHERE provider_profile_id = $1`,
          [provRows[0].id]
        );
        const total = Number(countRows[0]?.total || 0);
        if (total < 1 || total > 5) {
          throw new Error(
            'Escolha obrigatória: selecione e salve entre 1 e 5 especialidades oficiais antes de concluir o onboarding.'
          );
        }
      }
    }

    await pool.query(
      `UPDATE profiles
       SET phone = COALESCE($1, phone),
           city = COALESCE($2, city),
           neighborhood = COALESCE($3, neighborhood),
           updated_at = NOW()
       WHERE user_id = $4::uuid`,
      [
        params.phone ? sanitizeUserText(params.phone) : null,
        params.city ? sanitizeUserText(params.city) : null,
        params.neighborhood ? sanitizeUserText(params.neighborhood) : null,
        params.userId,
      ]
    );

    if (params.category || params.bio) {
      await pool.query(
        `UPDATE provider_profiles
         SET category = COALESCE($1, category),
             bio = COALESCE($2, bio),
             years_experience = COALESCE($3, years_experience),
             updated_at = NOW()
         WHERE user_id = $4::uuid`,
        [
          params.category ? sanitizeUserText(params.category) : null,
          params.bio ? sanitizeUserText(params.bio) : null,
          params.yearsExperience ?? null,
          params.userId,
        ]
      );
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET onboarding_completed = true,
           updated_at = NOW()
       WHERE id = $1::uuid AND deleted_at IS NULL
       RETURNING id, neon_auth_user_id, email, roles, active_role, status, email_verified, onboarding_completed`,
      [params.userId]
    );

    const updated = rows[0];
    if (!updated) {
      throw new Error('Usuário não encontrado para concluir onboarding.');
    }

    await this.logAudit({
      actorUserId: params.userId,
      actorRole: updated.active_role,
      action: 'onboarding_completed',
      targetType: 'user',
      targetId: params.userId,
    });

    if (updated.email_verified) {
      try {
        await referralService.validateReferralAndGrantDays(params.userId);
      } catch {
        // Não bloquear a conclusão do onboarding se a validação de indicação falhar
      }
    }

    const { rows: profRows } = await pool.query(
      `SELECT p.full_name, p.phone, p.city, p.neighborhood,
              pp.id AS provider_profile_id, pp.category AS provider_category, pp.bio AS provider_bio
       FROM profiles p
       LEFT JOIN provider_profiles pp ON pp.user_id = p.user_id
       WHERE p.user_id = $1::uuid
       LIMIT 1`,
      [params.userId]
    );
    const prof = profRows[0] || {};
    const activeRole = updated.active_role as UserRole;
    const session: AuthenticatedUserSession = {
      userId: updated.id,
      neonAuthUserId: updated.neon_auth_user_id || null,
      email: updated.email,
      fullName: prof.full_name || updated.email,
      phone: prof.phone || null,
      city: prof.city || null,
      neighborhood: prof.neighborhood || null,
      category: prof.provider_category || null,
      bio: prof.provider_bio || null,
      roles: (updated.roles || ['cliente']) as UserRole[],
      activeRole,
      status: updated.status as AccountStatus,
      emailVerified: Boolean(updated.email_verified),
      onboardingCompleted: true,
      providerProfileId: prof.provider_profile_id || null,
      redirectTo: getRedirectPathForRole(activeRole, true),
    };
    const token = await this.mintSessionToken(session);

    return {
      ok: true,
      onboardingCompleted: true,
      redirectTo: session.redirectTo,
      user: session,
      token,
    };
  }

  /**
   * 6. Alternância e adição de papel (Cliente <-> Prestador).
   * Impede escalonamento de privilégio para 'admin' ou 'padrinho' pelo próprio usuário.
   */
  async switchOrAddRole(params: {
    userId: string;
    targetRole: UserRole;
    enableIfMissing?: boolean;
  }) {
    await ensureSchemaAndSeed();
    const { rows } = await pool.query(
      `SELECT id, neon_auth_user_id, email, roles, active_role, status, email_verified, onboarding_completed
       FROM users
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      [params.userId]
    );
    const user = rows[0];
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    const currentRoles: UserRole[] = user.roles || ['cliente'];
    if (!currentRoles.includes(params.targetRole)) {
      if (
        !params.enableIfMissing ||
        (params.targetRole !== 'cliente' && params.targetRole !== 'prestador')
      ) {
        throw new Error(
          `Acesso negado: sua conta não possui o papel "${params.targetRole}".`
        );
      }
      currentRoles.push(params.targetRole);
      if (params.targetRole === 'prestador') {
        const provId = `prov-${user.id.slice(0, 8)}`;
        await pool.query(
          `INSERT INTO provider_profiles (id, user_id, slug, name, category, city, plan_slug, whatsapp)
           VALUES ($1, $2, $3, $4, 'Eletricista', 'São Paulo, SP', 'gratuito', '(11) 99000-0000')
           ON CONFLICT (id) DO NOTHING`,
          [provId, user.id, `prestador-${user.id.slice(0, 8)}`, user.email]
        );
      } else if (params.targetRole === 'cliente') {
        await pool.query(
          `INSERT INTO customer_profiles (user_id, favorite_categories, preferred_contact)
           VALUES ($1, ARRAY['Eletricista']::TEXT[], 'WhatsApp')
           ON CONFLICT (user_id) DO NOTHING`,
          [user.id]
        );
      }
    }

    await pool.query(
      `UPDATE users
       SET roles = $1,
           active_role = $2,
           updated_at = NOW()
       WHERE id = $3::uuid`,
      [currentRoles, params.targetRole, user.id]
    );

    const { rows: profRows } = await pool.query(
      `SELECT p.full_name, pp.id AS provider_profile_id
       FROM profiles p
       LEFT JOIN provider_profiles pp ON pp.user_id = p.user_id
       WHERE p.user_id = $1::uuid`,
      [user.id]
    );

    const session: AuthenticatedUserSession = {
      userId: user.id,
      neonAuthUserId: user.neon_auth_user_id || null,
      email: user.email,
      fullName: profRows[0]?.full_name || user.email,
      roles: currentRoles,
      activeRole: params.targetRole,
      status: user.status as AccountStatus,
      emailVerified: Boolean(user.email_verified),
      onboardingCompleted: Boolean(user.onboarding_completed),
      providerProfileId: profRows[0]?.provider_profile_id || null,
      redirectTo: getRedirectPathForRole(
        params.targetRole,
        Boolean(user.onboarding_completed)
      ),
    };

    const token = await this.mintSessionToken(session);
    return {
      user: session,
      token,
      redirectTo: session.redirectTo,
    };
  }

  /**
   * Admin helper to promote roles or suspend/reactivate accounts.
   */
  async adminUpdateUserRoleOrStatus(params: {
    adminUserId: string;
    targetUserId: string;
    status?: AccountStatus;
    roles?: UserRole[];
    activeRole?: UserRole;
  }) {
    await ensureSchemaAndSeed();
    const { rows } = await pool.query(
      `UPDATE users
       SET status = COALESCE($1, status),
           roles = COALESCE($2, roles),
           active_role = COALESCE($3, active_role),
           updated_at = NOW()
       WHERE id = $4::uuid
       RETURNING id, email, roles, active_role, status`,
      [
        params.status || null,
        params.roles || null,
        params.activeRole || null,
        params.targetUserId,
      ]
    );
    if (rows.length === 0) {
      throw new Error('Usuário alvo não encontrado.');
    }

    await this.logAudit({
      actorUserId: params.adminUserId,
      actorRole: 'admin',
      action: 'admin_updated_user',
      targetType: 'user',
      targetId: params.targetUserId,
      metadata: {
        status: params.status,
        roles: params.roles,
        activeRole: params.activeRole,
      },
    });

    return rows[0];
  }
}
