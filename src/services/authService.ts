import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { ensureSchemaAndSeed, neonEnv, pool } from '../db/index';
import { verifyNeonAuthJwt } from '../server/neonServices';
import type { AppRole } from '../db/rls';

export type UserRole = 'cliente' | 'prestador' | 'padrinho' | 'admin';
export type AccountStatus = 'pendente_confirmacao' | 'ativo' | 'suspenso';

export interface AuthenticatedUserSession {
  userId: string;
  neonAuthUserId: string | null;
  email: string;
  fullName: string;
  roles: UserRole[];
  activeRole: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  providerProfileId: string | null;
  redirectTo: string;
}

const SESSION_SECRET = new TextEncoder().encode(
  process.env.NEON_REALTIME_SECRET ||
    process.env.ASAAS_WEBHOOK_TOKEN ||
    'confiare-production-jwt-secret-key-2026-neon'
);

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
      .sign(SESSION_SECRET);
  }

  async verifySessionToken(token: string): Promise<AuthenticatedUserSession> {
    await ensureSchemaAndSeed();

    let userId: string | undefined;
    let neonAuthSub: string | undefined;

    try {
      const { payload } = await jwtVerify(token, SESSION_SECRET, {
        issuer: 'confiare-auth',
      });
      userId = payload.sub;
    } catch {
      // Fallback: verify directly against Neon Auth JWKS (NEON_AUTH_JWKS_URL)
      const neonPayload = await verifyNeonAuthJwt(token);
      neonAuthSub = neonPayload.sub;
    }

    const { rows } = await pool.query(
      `SELECT u.*, p.full_name, pp.id AS provider_profile_id
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN provider_profiles pp ON pp.user_id = u.id
       WHERE ($1::uuid IS NOT NULL AND u.id = $1::uuid)
          OR ($2::text IS NOT NULL AND u.neon_auth_user_id = $2::text)
       LIMIT 1`,
      [userId || null, neonAuthSub || null]
    );

    const user = rows[0];
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
   * Nunca armazena senha na tabela da aplicação.
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
    lgpdConsent: boolean;
    ipAddress?: string;
  }) {
    await ensureSchemaAndSeed();

    if (!input.lgpdConsent) {
      throw new Error(
        'É obrigatório aceitar os termos de privacidade LGPD para criar uma conta.'
      );
    }

    const emailNormalized = input.email.trim().toLowerCase();
    const cleanName = sanitizeUserText(input.fullName);
    const cleanPhone = sanitizeUserText(input.phone || '');
    const cleanCity = sanitizeUserText(input.city || 'São Paulo, SP');
    const cleanNeighborhood = sanitizeUserText(
      input.neighborhood || 'Pinheiros'
    );

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [emailNormalized]
    );
    if (existing.rows.length > 0) {
      throw new Error('Já existe uma conta cadastrada com este e-mail.');
    }

    // Call Managed Better Auth (Neon Auth) to register credentials in neon_auth schema
    const signUpRes = await fetch(`${this.authBaseUrl}/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: emailNormalized,
        password: input.password,
        name: cleanName,
      }),
    });

    if (!signUpRes.ok) {
      const errBody = await signUpRes.text();
      throw new Error(
        `Falha ao registrar credenciais no Neon Auth (${signUpRes.status}): ${errBody}`
      );
    }

    const signUpData = (await signUpRes.json()) as {
      user?: { id?: string; email?: string };
    };
    const neonAuthUserId = signUpData.user?.id || null;

    const roles: UserRole[] = input.alsoEnableSecondRole
      ? ['cliente', 'prestador']
      : [input.role];
    const activeRole: UserRole = input.role;
    const verificationToken = `vfy_${crypto.randomBytes(18).toString('hex')}`;

    const userInsert = await pool.query(
      `INSERT INTO users (
        neon_auth_user_id, email, roles, active_role, status,
        email_verified, verification_token, onboarding_completed
      ) VALUES ($1, $2, $3, $4, 'pendente_confirmacao', false, $5, false)
      RETURNING *`,
      [neonAuthUserId, emailNormalized, roles, activeRole, verificationToken]
    );
    const createdUser = userInsert.rows[0];

    await pool.query(
      `INSERT INTO profiles (user_id, full_name, phone, city, neighborhood, lgpd_consent, lgpd_consent_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())`,
      [createdUser.id, cleanName, cleanPhone, cleanCity, cleanNeighborhood]
    );

    if (roles.includes('cliente')) {
      await pool.query(
        `INSERT INTO customer_profiles (user_id, favorite_categories, preferred_contact)
         VALUES ($1, $2, 'WhatsApp')
         ON CONFLICT (user_id) DO NOTHING`,
        [createdUser.id, input.category ? [input.category] : ['Eletricista']]
      );
    }

    let providerProfileId: string | null = null;
    if (roles.includes('prestador')) {
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
          neighborhoods, plan_slug, whatsapp, verification_status, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'gratuito', $9, 'pendente', false)`,
        [
          providerProfileId,
          createdUser.id,
          slug,
          cleanName,
          cleanName,
          input.category || 'Eletricista',
          cleanCity,
          [cleanNeighborhood],
          cleanPhone || '(11) 99000-0000',
        ]
      );
    }

    await this.logAudit({
      actorUserId: createdUser.id,
      actorRole: activeRole,
      action: 'user_registered',
      targetType: 'user',
      targetId: createdUser.id,
      metadata: { email: emailNormalized, roles },
      ipAddress: input.ipAddress,
    });

    const session: AuthenticatedUserSession = {
      userId: createdUser.id,
      neonAuthUserId,
      email: emailNormalized,
      fullName: cleanName,
      roles,
      activeRole,
      status: 'pendente_confirmacao',
      emailVerified: false,
      onboardingCompleted: false,
      providerProfileId,
      redirectTo: getRedirectPathForRole(activeRole, false),
    };

    const token = await this.mintSessionToken(session);

    return {
      user: session,
      token,
      verificationToken,
    };
  }

  /**
   * 2. Confirmação de e-mail
   */
  async verifyEmail(verificationToken: string) {
    await ensureSchemaAndSeed();
    const { rows } = await pool.query(
      `UPDATE users
       SET email_verified = true,
           status = CASE WHEN status = 'pendente_confirmacao' THEN 'ativo' ELSE status END,
           verification_token = NULL,
           updated_at = NOW()
       WHERE verification_token = $1
       RETURNING id, email, active_role, status, email_verified`,
      [verificationToken]
    );

    if (rows.length === 0) {
      throw new Error('Token de confirmação de e-mail inválido ou já utilizado.');
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

    await this.logAudit({
      actorUserId: updated.id,
      actorRole: updated.active_role,
      action: 'email_verified',
      targetType: 'user',
      targetId: updated.id,
    });

    return updated;
  }

  /**
   * 3. Login real via Neon Auth + verificação de bloqueio/suspensão + redirecionamento por papel
   */
  async loginUser(input: {
    email: string;
    password: string;
    ipAddress?: string;
  }) {
    await ensureSchemaAndSeed();
    const emailNormalized = input.email.trim().toLowerCase();

    const { rows } = await pool.query(
      `SELECT u.*, p.full_name, pp.id AS provider_profile_id
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN provider_profiles pp ON pp.user_id = u.id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [emailNormalized]
    );

    const user = rows[0];
    if (!user) {
      throw new Error('Credenciais inválidas (e-mail ou senha incorretos).');
    }

    if (user.status === 'suspenso') {
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

    // Verify password against Managed Better Auth (Neon Auth)
    const signInRes = await fetch(`${this.authBaseUrl}/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: emailNormalized,
        password: input.password,
      }),
    });

    if (!signInRes.ok) {
      throw new Error('Credenciais inválidas (e-mail ou senha incorretos).');
    }

    const activeRole = (user.active_role || 'cliente') as UserRole;
    const onboardingCompleted = Boolean(user.onboarding_completed);

    const session: AuthenticatedUserSession = {
      userId: user.id,
      neonAuthUserId: user.neon_auth_user_id,
      email: user.email,
      fullName: user.full_name || user.email,
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
   * 4. Recuperação de Senha (requestPasswordReset + resetPassword integrado ao Neon Auth)
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

    if (rows.length === 0) {
      // Não vaza existência de e-mail para atacantes, mas retorna status ok
      return { ok: true, resetToken: null };
    }

    const user = rows[0];
    const resetToken = `rst_${crypto.randomBytes(20).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `UPDATE users
       SET reset_password_token = $1,
           reset_password_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [resetToken, expiresAt, user.id]
    );

    // Register token in neon_auth.verification so Better Auth /reset-password accepts it natively
    if (user.neon_auth_user_id) {
      await pool.query(
        `INSERT INTO neon_auth.verification (identifier, value, "expiresAt")
         VALUES ($1, $2, $3)`,
        [`reset-password:${resetToken}`, user.neon_auth_user_id, expiresAt]
      );
    }

    await this.logAudit({
      actorUserId: user.id,
      actorRole: user.active_role,
      action: 'password_reset_requested',
      targetType: 'user',
      targetId: user.id,
    });

    return {
      ok: true,
      resetToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async resetPassword(params: { resetToken: string; newPassword: string }) {
    await ensureSchemaAndSeed();
    if (!params.newPassword || params.newPassword.length < 8) {
      throw new Error('A nova senha deve ter pelo menos 8 caracteres.');
    }

    const { rows } = await pool.query(
      `SELECT id, neon_auth_user_id, email, active_role, reset_password_expires_at
       FROM users
       WHERE reset_password_token = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [params.resetToken]
    );

    const user = rows[0];
    if (
      !user ||
      !user.reset_password_expires_at ||
      new Date(user.reset_password_expires_at) < new Date()
    ) {
      throw new Error('Token de recuperação de senha inválido ou expirado.');
    }

    // Call Managed Better Auth /reset-password to update password hash in neon_auth.account
    const resetRes = await fetch(`${this.authBaseUrl}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        newPassword: params.newPassword,
        token: params.resetToken,
      }),
    });

    if (!resetRes.ok) {
      const errText = await resetRes.text();
      throw new Error(
        `Falha ao redefinir senha no Neon Auth (${resetRes.status}): ${errText}`
      );
    }

    // Invalidate token after use
    await pool.query(
      `UPDATE users
       SET reset_password_token = NULL,
           reset_password_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

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
           status = CASE WHEN status = 'pendente_confirmacao' THEN 'ativo' ELSE status END,
           updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING id, active_role`,
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

    return {
      ok: true,
      onboardingCompleted: true,
      redirectTo: getRedirectPathForRole(updated.active_role as UserRole, true),
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
      `SELECT id, email, roles, active_role, onboarding_completed
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
      // Usuário comum só pode adicionar 'cliente' ou 'prestador' à própria conta
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
      neonAuthUserId: null,
      email: user.email,
      fullName: profRows[0]?.full_name || user.email,
      roles: currentRoles,
      activeRole: params.targetRole,
      status: 'ativo',
      emailVerified: true,
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
