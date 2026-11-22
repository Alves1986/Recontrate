import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import { authClient } from '../lib/neonClient';
import type { AuthenticatedUserSession } from '../services/authService';
import { INITIAL_TAXONOMY_CATEGORIES } from '../data/taxonomySeed';
import { ProviderSpecialtiesManager } from './ProviderSpecialtiesManager';
import { BrandLogo } from './BrandLogo';
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from '../config/legalIdentity';

async function safeParseJson<T = any>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function isValidJwtToken(token?: string | null): boolean {
  return Boolean(token && token.split('.').length === 3);
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SignupOfficialCategory {
  id: string;
  slug: string;
  nome: string;
  specialties: Array<{
    id: string;
    nome: string;
    sinonimos?: string[];
  }>;
}

export const LoginPage: React.FC<{
  onAuthenticated: (
    user: AuthenticatedUserSession,
    token: string,
    redirectTo: string
  ) => void;
  onNavigateUrl: (path: string) => void;
}> = ({ onAuthenticated, onNavigateUrl }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMessage('');
    setNeedsEmailVerification(false);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).catch(() => null);
      const body = res ? await safeParseJson(res) : null;
      if (res && res.ok && body?.ok && isValidJwtToken(body.token)) {
        onAuthenticated(body.user, body.token, body.redirectTo);
        return;
      }
      if (res && res.status === 403 && body?.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsEmailVerification(true);
        setError(
          body.error ||
            'Confirme seu e-mail pelo link enviado antes de entrar no Recontrate.'
        );
        return;
      }
      if (!res || res.status >= 500) {
        setError(
          body?.error ||
            'Não foi possível conectar ao servidor para autenticar agora. Aguarde alguns segundos e tente novamente.'
        );
        return;
      }
      setError(body?.error || 'E-mail ou senha inválidos.');
    } catch (err) {
      setError((err as Error).message || 'Não foi possível autenticar no momento.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setResendMessage('');
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    }).catch(() => null);
    const body = res ? await safeParseJson(res) : null;
    if (res && res.ok) {
      setResendMessage(
        body?.message ||
          'Se o e-mail estiver aguardando confirmação, enviamos um novo link.'
      );
    } else {
      setResendMessage(
        body?.error || 'Não foi possível reenviar o e-mail agora.'
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/app`,
      });
    } catch (err) {
      setError(`Login Google: ${(err as Error).message}`);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-6 my-6">
      <div className="space-y-3">
        <BrandLogo variant="dark" size="sm" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-brand-link">
            Acesso seguro
          </p>
          <h1 className="font-display font-bold text-2xl text-brand-ink">
            Entrar na sua conta
          </h1>
          <p className="text-xs text-brand-ink/70">
            Acesse sua área de cliente, painel do prestador ou mentoria.
          </p>
        </div>
      </div>


      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium space-y-2"
        >
          <p>{error}</p>
          {needsEmailVerification && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleResendVerification}
                className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-[11px] font-semibold cursor-pointer"
              >
                Reenviar e-mail de confirmação
              </button>
              <button
                type="button"
                onClick={() =>
                  onNavigateUrl(
                    `/verificar-email${
                      email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''
                    }`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-900 text-[11px] font-semibold cursor-pointer"
              >
                Inserir código de verificação
              </button>
            </div>
          )}
          {resendMessage && (
            <p className="text-[11px] text-emerald-800 font-semibold">
              {resendMessage}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        <div className="space-y-1">
          <label
            htmlFor="login-email"
            className="font-semibold text-brand-ink"
          >
            E-mail
          </label>
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-brand-primary/15">
            <Mail className="w-4 h-4 text-brand-ink/70" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              className="w-full focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="font-semibold text-brand-ink"
            >
              Senha
            </label>
            <button
              type="button"
              onClick={() => onNavigateUrl('/recuperar-senha')}
              className="text-brand-link hover:underline font-medium cursor-pointer"
            >
              Esqueceu a senha?
            </button>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-brand-primary/15">
            <Lock className="w-4 h-4 text-brand-ink/70" aria-hidden="true" />
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 rounded-md text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Autenticando...' : 'Entrar com e-mail e senha'}
        </button>
      </form>

      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-brand-primary/10" />
        <span className="flex-shrink mx-3 text-[11px] text-brand-ink/55">
          ou continue com
        </span>
        <div className="flex-grow border-t border-brand-primary/10" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold text-xs transition-colors cursor-pointer"
      >
        Entrar com Google
      </button>

      <p className="text-center text-xs text-brand-ink/70 pt-2">
        Ainda não tem conta?{' '}
        <button
          type="button"
          onClick={() => onNavigateUrl('/criar-conta')}
          className="font-semibold text-brand-link hover:underline cursor-pointer"
        >
          Criar conta gratuita
        </button>
      </p>
    </div>
  );
};

export const SignupPage: React.FC<{
  onAuthenticated: (
    user: AuthenticatedUserSession,
    token: string,
    redirectTo: string
  ) => void;
  onNavigateUrl: (path: string) => void;
}> = ({ onAuthenticated, onNavigateUrl }) => {
  const initialParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const initialRefParam = (initialParams?.get('ref') || '')
    .trim()
    .toUpperCase();
  const initialRoleParam =
    initialParams?.get('role') === 'prestador' ||
    (Boolean(initialRefParam) && initialParams?.get('role') !== 'cliente')
      ? 'prestador'
      : 'cliente';
  const selectedPlanParam = initialParams?.get('plan') || '';
  const selectedCycleParam =
    initialParams?.get('cycle') === 'anual' ? 'anual' : 'mensal';

  const [role, setRole] = useState<'cliente' | 'prestador'>(initialRoleParam);
  const [referralCode, setReferralCode] = useState(initialRefParam);
  const [referralPreview, setReferralPreview] = useState<{
    valid: boolean;
    referrerFirstName?: string;
    rewardDaysForReferrer?: number;
    rewardDaysForReferred?: number;
  } | null>(null);

  useEffect(() => {
    const code = referralCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      setReferralPreview(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/public/referrals/validate/${encodeURIComponent(code)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (cancelled) return;
          if (body?.ok && body.valid) {
            setReferralPreview({
              valid: true,
              referrerFirstName: body.referrerFirstName,
              rewardDaysForReferrer:
                body.rewardDaysForReferrer ?? body.rewardDays ?? 15,
              rewardDaysForReferred: body.rewardDaysForReferred ?? 10,
            });
          } else {
            setReferralPreview({ valid: false });
          }
        })
        .catch(() => null);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [referralCode]);
  const [alsoEnableSecondRole, setAlsoEnableSecondRole] = useState(false);
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('São Paulo, SP');
  const [neighborhood, setNeighborhood] = useState('');
  const [category, setCategory] = useState('Elétrica');
  const [bio, setBio] = useState('');
  const [officialCategories, setOfficialCategories] = useState<
    SignupOfficialCategory[]
  >([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<string[]>([]);
  const [principalSpecialtyId, setPrincipalSpecialtyId] = useState('');
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [aiTrainingOptOut, setAiTrainingOptOut] = useState(true);
  const [websiteHoneypot, setWebsiteHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isProviderSignup = role === 'prestador' || alsoEnableSecondRole;

  useEffect(() => {
    let cancelled = false;
    setLoadingTaxonomy(true);
    fetch('/api/taxonomy/categories', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled) return;
        const cats: SignupOfficialCategory[] = Array.isArray(body?.categories)
          ? body.categories
          : [];
        setOfficialCategories(cats);
        if (cats.length > 0) {
          setSelectedCategoryId((prev) =>
            cats.some((c) => c.id === prev) ? prev : cats[0].id
          );
          setCategory((prev) => prev || cats[0].nome);
        }
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoadingTaxonomy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCategoryObj =
    officialCategories.find((c) => c.id === selectedCategoryId) ||
    officialCategories[0] ||
    null;

  const filteredSpecialties = (selectedCategoryObj?.specialties || []).filter(
    (spec) => {
      const q = specialtySearch.trim().toLowerCase();
      if (!q) return true;
      if (spec.nome.toLowerCase().includes(q)) return true;
      return (spec.sinonimos || []).some((syn) =>
        syn.toLowerCase().includes(q)
      );
    }
  );

  const toggleSignupSpecialty = (specId: string) => {
    setError('');
    setSelectedSpecialtyIds((prev) => {
      if (prev.includes(specId)) {
        const next = prev.filter((id) => id !== specId);
        if (principalSpecialtyId === specId) {
          setPrincipalSpecialtyId(next[0] || '');
        }
        return next;
      }
      if (prev.length >= 5) {
        setError('Você pode selecionar no máximo 5 especialidades oficiais.');
        return prev;
      }
      if (!principalSpecialtyId) {
        setPrincipalSpecialtyId(specId);
      }
      return [...prev, specId];
    });
  };

  const persistPendingPlanSelection = () => {
    if (
      typeof window !== 'undefined' &&
      selectedPlanParam &&
      selectedPlanParam !== 'gratuito'
    ) {
      try {
        window.sessionStorage.setItem(
          'recontrate_pending_plan',
          JSON.stringify({
            plan: selectedPlanParam,
            cycle: selectedCycleParam,
          })
        );
      } catch {
        // ignore storage errors
      }
    }
  };

  const computeAgeYears = (isoDate: string): number | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
    const [y, m, d] = isoDate.split('-').map(Number);
    const now = new Date();
    let age = now.getUTCFullYear() - y;
    const diffMonth = now.getUTCMonth() + 1 - m;
    if (diffMonth < 0 || (diffMonth === 0 && now.getUTCDate() < d)) {
      age -= 1;
    }
    return age;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (websiteHoneypot.trim() !== '') {
      return;
    }
    const age = computeAgeYears(birthDate);
    if (age === null) {
      setError('Informe sua data de nascimento completa para continuar.');
      return;
    }
    if (age < 12) {
      setError(
        'Cadastro bloqueado para menores de 12 anos (LGPD art. 14 §1º): o tratamento de dados pessoais de crianças exige consentimento específico e em destaque de ao menos um dos pais ou responsável legal e não permite abertura de conta autônoma.'
      );
      return;
    }
    if (age < 18) {
      setError(
        'Cadastro permitido apenas para maiores de 18 anos completos (LGPD art. 14 / Código Civil).'
      );
      return;
    }
    if (!lgpdConsent) {
      setError(
        'Para criar sua conta no Recontrate, marque a caixa de consentimento concordando com os Termos de Uso e Política de Privacidade.'
      );
      return;
    }
    if (isProviderSignup) {
      if (!UUID_REGEX.test(selectedCategoryId)) {
        setError(
          'Aguarde o carregamento das categorias oficiais para concluir seu cadastro de prestador.'
        );
        return;
      }
      if (selectedSpecialtyIds.length < 1) {
        setError(
          'Selecione entre 1 e 5 especialidades oficiais para concluir seu cadastro de prestador.'
        );
        return;
      }
    }
    setLoading(true);

    const resolvedCategoryName = isProviderSignup
      ? selectedCategoryObj?.nome || category
      : category;
    const sendUnifiedTaxonomy =
      isProviderSignup &&
      UUID_REGEX.test(selectedCategoryId) &&
      selectedSpecialtyIds.length >= 1;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          alsoEnableSecondRole,
          fullName,
          birthDate,
          email,
          password,
          phone,
          city,
          neighborhood,
          category: resolvedCategoryName,
          ...(sendUnifiedTaxonomy
            ? {
                categoryId: selectedCategoryId,
                specialtyIds: selectedSpecialtyIds,
                principalSpecialtyId:
                  principalSpecialtyId || selectedSpecialtyIds[0],
                bio: bio.trim() || undefined,
              }
            : {}),
          referralCode: referralCode.trim()
            ? referralCode.trim().toUpperCase()
            : undefined,
          lgpdConsent,
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_VERSION,
          marketingOptIn,
          aiTrainingOptOut,
        }),
      }).catch(() => null);
      const body = res ? await safeParseJson(res) : null;
      if (res && res.ok && body?.ok) {
        if (body.requiresEmailVerification || !isValidJwtToken(body.token)) {
          persistPendingPlanSelection();
          onNavigateUrl(
            `/verificar-email?email=${encodeURIComponent(
              email.trim().toLowerCase()
            )}`
          );
          return;
        }
        const activeUser: AuthenticatedUserSession = body.user;
        let nextTarget =
          activeUser.redirectTo ||
          (activeUser.activeRole === 'prestador' ? '/app/prestador' : '/app');
        if (!activeUser.onboardingCompleted) {
          persistPendingPlanSelection();
          nextTarget = '/app/onboarding';
        } else if (
          isProviderSignup &&
          selectedPlanParam &&
          selectedPlanParam !== 'gratuito'
        ) {
          nextTarget = `/planos?checkout=${encodeURIComponent(
            selectedPlanParam
          )}&cycle=${encodeURIComponent(selectedCycleParam)}`;
        }
        onAuthenticated(activeUser, body.token, nextTarget);
        return;
      }
      setError(
        body?.error ||
          'Não foi possível conectar ao servidor para criar sua conta agora. Aguarde alguns segundos e tente novamente.'
      );
    } catch (err) {
      setError(
        (err as Error).message || 'Não foi possível concluir o cadastro agora.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`${
        isProviderSignup ? 'max-w-2xl' : 'max-w-xl'
      } mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-6 my-6`}
    >
      <div className="space-y-3">
        <BrandLogo variant="dark" size="sm" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-brand-link">
            Cadastro Único · Cliente e/ou Prestador
          </p>
          <h1 className="font-display font-bold text-2xl text-brand-ink">
            Criar conta no Recontrate
          </h1>
          <p className="text-xs text-brand-ink/70">
            Preencha tudo em uma única etapa — você vai direto para o painel sem precisar repetir dados.
          </p>
        </div>
      </div>

      {selectedPlanParam && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
          <strong>Plano selecionado:</strong>{' '}
          <span className="uppercase font-bold">{selectedPlanParam}</span> (
          {selectedCycleParam}). Conclua seu cadastro de prestador e especialidades para finalizar sua assinatura.
        </div>
      )}

      {referralPreview?.valid && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
          <p className="font-bold">
            Indicado por{' '}
            {referralPreview.referrerFirstName || 'um usuário Recontrate'}
          </p>
          <p>
            Código{' '}
            <span className="font-mono font-bold">
              {referralCode.trim().toUpperCase()}
            </span>{' '}
            validado: ao concluir seu cadastro profissional, você ganha +
            {referralPreview.rewardDaysForReferred ?? 10} dias grátis extras na sua
            assinatura (acumuláveis com os 90 dias grátis de lançamento) e quem
            indicou ganha +{referralPreview.rewardDaysForReferrer ?? 15} dias grátis.
          </p>
        </div>
      )}


      {/* Role Selector */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <button
          type="button"
          onClick={() => setRole('cliente')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            role === 'cliente'
              ? 'bg-brand-primary text-white border-brand-primary'
              : 'bg-brand-background/60 text-brand-ink border-brand-primary/10'
          }`}
        >
          <p className="font-display font-bold text-sm">Sou cliente</p>
          <p className="opacity-80 mt-0.5">
            Quero encontrar e recontratar profissionais de confiança
          </p>
        </button>

        <button
          type="button"
          onClick={() => setRole('prestador')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            role === 'prestador'
              ? 'bg-brand-primary text-white border-brand-primary'
              : 'bg-brand-background/60 text-brand-ink border-brand-primary/10'
          }`}
        >
          <p className="font-display font-bold text-sm">Sou prestador</p>
          <p className="opacity-80 mt-0.5">
            Quero receber oportunidades compatíveis no meu bairro
          </p>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-1">
            <label
              htmlFor="signup-fullname"
              className="font-semibold text-brand-ink"
            >
              Nome completo *
            </label>
            <input
              id="signup-fullname"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label
              htmlFor="signup-birthdate"
              className="font-semibold text-brand-ink"
            >
              Data de nascimento (+18) *
            </label>
            <input
              id="signup-birthdate"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label
              htmlFor="signup-phone"
              className="font-semibold text-brand-ink"
            >
              WhatsApp / Telefone *
            </label>
            <input
              id="signup-phone"
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99000-0000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com.br"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">
              Senha (mín. 8 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">Cidade *</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="São Paulo, SP"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">
              Bairro principal *
            </label>
            <input
              type="text"
              required
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Ex.: Pinheiros"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
            />
          </div>
        </div>

        {!isProviderSignup && (
          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">
              Especialidade favorita
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm bg-white"
            >
              {INITIAL_TAXONOMY_CATEGORIES.map((cat) => (
                <option key={cat.slug} value={cat.nome}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {isProviderSignup && (
          <div className="rounded-2xl bg-brand-background/55 border border-brand-primary/10 p-4 space-y-3.5">
            <div>
              <p className="text-[11px] font-semibold text-brand-accent-strong">
                Perfil Profissional · Etapa Única
              </p>
              <p className="text-[11px] text-brand-ink/70">
                Defina sua categoria, 1 a 5 especialidades oficiais e resumo para já liberar seu painel pronto.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink">
                  1. Categoria Principal Oficial *
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedCategoryId(nextId);
                    setSelectedSpecialtyIds([]);
                    setPrincipalSpecialtyId('');
                    setSpecialtySearch('');
                    const matched = officialCategories.find(
                      (c) => c.id === nextId
                    );
                    if (matched) setCategory(matched.nome);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-primary/15 bg-white text-xs font-medium"
                >
                  {officialCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-brand-ink">
                  2. Filtrar Especialidade (com sinônimos)
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-primary/15 bg-white">
                  <Search className="w-3.5 h-3.5 text-brand-ink/50 shrink-0" />
                  <input
                    type="text"
                    value={specialtySearch}
                    onChange={(e) => setSpecialtySearch(e.target.value)}
                    placeholder="Ex.: chuveiro, porcelanato, split..."
                    aria-label="Filtrar especialidade oficial"
                    className="w-full focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 rounded-md text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-brand-ink">
                3. Especialidades Oficiais ({selectedSpecialtyIds.length}/5 selecionadas) *
              </p>
              {loadingTaxonomy && officialCategories.length === 0 ? (
                <p className="text-[11px] text-brand-ink/60">
                  Carregando especialidades oficiais...
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {filteredSpecialties.map((spec) => {
                    const isSelected = selectedSpecialtyIds.includes(spec.id);
                    const isPrincipal =
                      (principalSpecialtyId || selectedSpecialtyIds[0]) ===
                      spec.id;
                    return (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => toggleSignupSpecialty(spec.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-white text-brand-ink border-brand-primary/15 hover:bg-brand-surface-hover'
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-accent-strong" />
                        )}
                        <span>{spec.nome}</span>
                        {isSelected && isPrincipal && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-accent-strong text-white">
                            Principal
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-brand-ink">
                Resumo profissional (opcional — Vitrine Pública)
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ex.: Eletricista residencial com 8 anos de experiência, atendimento pontual e garantia no serviço."
                className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 bg-white text-xs"
              />
            </div>
          </div>
        )}

        {(role === 'prestador' || alsoEnableSecondRole) && (
          <div className="space-y-1">
            <label
              htmlFor="signup-referral-code"
              className="font-semibold text-brand-ink block"
            >
              Código de indicação (opcional)
            </label>
            <input
              id="signup-referral-code"
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Ex: REC-JOAO4F"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 bg-white font-mono text-xs uppercase"
            />
            <p className="text-[11px] text-brand-ink/65">
              Tem código de indicação? Informe aqui para você ganhar <strong>+10 dias grátis extras</strong> na sua assinatura e liberar +15 dias grátis para quem indicou após concluir seu cadastro profissional.
            </p>
          </div>
        )}

        <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={alsoEnableSecondRole}
            onChange={(e) => setAlsoEnableSecondRole(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-brand-ink/80">
            Desejo usar a plataforma como <strong>Cliente e Prestador</strong> na mesma conta.
          </span>
        </label>

        <div className="hidden" aria-hidden="true">
          <label htmlFor="signup-company-site">Não preencher</label>
          <input
            id="signup-company-site"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={websiteHoneypot}
            onChange={(e) => setWebsiteHoneypot(e.target.value)}
          />
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={lgpdConsent}
              onChange={(e) => setLgpdConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-brand-ink/80 leading-relaxed">
              Declaro ter <strong>18 anos ou mais</strong> (cadastro bloqueado para menores de 12 anos — LGPD art. 14 §1º) e aceito os{' '}
              <button
                type="button"
                onClick={() => onNavigateUrl('/termos')}
                className="underline font-semibold text-brand-link cursor-pointer"
              >
                Termos de Uso ({CURRENT_TERMS_VERSION})
              </button>{' '}
              e a{' '}
              <button
                type="button"
                onClick={() => onNavigateUrl('/privacidade')}
                className="underline font-semibold text-brand-link cursor-pointer"
              >
                Política de Privacidade e LGPD ({CURRENT_PRIVACY_VERSION})
              </button>
              . *
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-brand-ink/75 leading-relaxed">
              (Opcional — LGPD art. 8º §4º) Autorizo receber novidades comerciais, campanhas e avisos promocionais do Recontrate por e-mail.
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={aiTrainingOptOut}
              onChange={(e) => setAiTrainingOptOut(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-brand-ink/75 leading-relaxed">
              Não utilizar meus dados de perfil ou descrições para treinamento de modelos externos de Inteligência Artificial (opt-out padrão LGPD/IA).
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Criando sua conta...' : 'Criar conta grátis'}
        </button>
      </form>


      <p className="text-center text-xs text-brand-ink/70">
        Já possui conta?{' '}
        <button
          type="button"
          onClick={() => onNavigateUrl('/entrar')}
          className="font-semibold text-brand-link hover:underline cursor-pointer"
        >
          Entrar
        </button>
      </p>
    </div>
  );
};

export const ForgotAndResetPasswordPage: React.FC<{
  onNavigateUrl: (path: string) => void;
}> = ({ onNavigateUrl }) => {
  const initialToken =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('resetToken') || ''
      : '';
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset' | 'done'>(
    initialToken ? 'reset' : 'request'
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const body = res ? await safeParseJson(res) : null;
    if (!res || !res.ok || !body?.ok) {
      setError(
        body?.error ||
          'Não foi possível solicitar a recuperação de senha agora. Tente novamente em instantes.'
      );
      return;
    }
    setMessage(
      body?.message ||
        'Se o e-mail estiver cadastrado, enviamos as instruções com o token de uso único para a sua caixa de entrada.'
    );
    setStep('reset');
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newPassword }),
    }).catch(() => null);
    const body = res ? await safeParseJson(res) : null;
    if (!res || !res.ok || !body?.ok) {
      setError(
        body?.error ||
          'Token inválido/expirado ou falha ao conectar com o servidor.'
      );
      return;
    }
    setStep('done');
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-6 my-6 text-xs">
      <div className="space-y-3">
        <BrandLogo variant="dark" size="sm" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-brand-link">
            Recuperação Segura de Credenciais
          </p>
          <h1 className="font-display font-bold text-2xl text-brand-ink">
            Recuperar senha
          </h1>
        </div>
      </div>


      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800">
          {error}
        </div>
      )}

      {step === 'request' && (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">
              E-mail cadastrado
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-brand-primary text-white font-semibold cursor-pointer"
          >
            Enviar instruções de recuperação
          </button>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={handleConfirmReset} className="space-y-4">
          {message && (
            <p className="p-3 rounded-xl bg-emerald-50 text-emerald-900">
              {message}
            </p>
          )}
          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">
              Token de recuperação
            </label>
            <input
              type="text"
              required
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/15 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">
              Nova senha (mín. 8 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/15 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-brand-accent-strong text-white font-semibold cursor-pointer"
          >
            Redefinir senha agora
          </button>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <p className="p-4 rounded-xl bg-emerald-50 text-emerald-900 font-semibold">
            ✓ Senha redefinida com sucesso! Você já pode fazer login com a nova senha.
          </p>
          <button
            type="button"
            onClick={() => onNavigateUrl('/entrar')}
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-brand-primary text-white font-semibold cursor-pointer"
          >
            Ir para Login
          </button>
        </div>
      )}
    </div>
  );
};

export const OnboardingPage: React.FC<{
  user: AuthenticatedUserSession;
  token: string;
  onComplete: (redirectTo: string) => void;
}> = ({ user, token, onComplete }) => {
  const isProviderOnboarding = Boolean(
    user.roles.includes('prestador') && user.providerProfileId
  );
  const [neighborhood, setNeighborhood] = useState(user.neighborhood || '');
  const [city, setCity] = useState(user.city || 'São Paulo, SP');
  const [bio, setBio] = useState(
    user.bio ||
      'Profissional autônomo dedicado a atendimentos pontuais e seguros.'
  );
  const [officialSpecialtiesCount, setOfficialSpecialtiesCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user.neighborhood) {
      setNeighborhood((prev) => prev || user.neighborhood!);
    }
    if (user.city) {
      setCity((prev) => prev || user.city!);
    }
    if (user.bio) {
      setBio(user.bio);
    }
  }, [user.neighborhood, user.city, user.bio]);

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isProviderOnboarding && officialSpecialtiesCount < 1) {
      setError(
        'Selecione e salve entre 1 e 5 especialidades oficiais antes de concluir o onboarding.'
      );
      return;
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(isValidJwtToken(token) ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          city,
          neighborhood,
          bio,
          enforceOfficialSpecialties: isProviderOnboarding,
        }),
      }).catch(() => null);
      const consumePendingPlanRedirect = (defaultRedirect: string) => {
        if (typeof window !== 'undefined' && isProviderOnboarding) {
          try {
            const rawPending = window.sessionStorage.getItem(
              'recontrate_pending_plan'
            );
            if (rawPending) {
              window.sessionStorage.removeItem('recontrate_pending_plan');
              const parsed = JSON.parse(rawPending);
              if (parsed?.plan && parsed.plan !== 'gratuito') {
                return `/planos?checkout=${encodeURIComponent(
                  parsed.plan
                )}&cycle=${encodeURIComponent(parsed.cycle || 'mensal')}`;
              }
            }
          } catch {
            // ignore storage errors
          }
        }
        return defaultRedirect;
      };

      const body = res ? await safeParseJson(res) : null;
      if (res && res.ok && body?.ok) {
        onComplete(consumePendingPlanRedirect(body.redirectTo || '/app'));
        return;
      }
      setError(
        body?.error ||
          'Não foi possível concluir o onboarding agora. Verifique sua sessão e tente novamente.'
      );
    } catch (err) {
      setError((err as Error).message || 'Não foi possível concluir o onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`${
        isProviderOnboarding ? 'max-w-3xl' : 'max-w-lg'
      } mx-auto space-y-6 my-6 text-xs`}
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-6">
        <div className="space-y-3">
          <BrandLogo variant="dark" size="sm" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-brand-accent-strong">
              Onboarding Obrigatório de Primeiro Acesso
            </p>
            <h1 className="font-display font-bold text-2xl text-brand-ink">
              Bem-vindo(a), {user.fullName}!
            </h1>
            <p className="text-brand-ink/70">
              Papel ativo: <strong>{user.activeRole.toUpperCase()}</strong>. Confirme seus dados locais
              {isProviderOnboarding
                ? ' e escolha de 1 a 5 especialidades oficiais para liberar o acesso ao painel.'
                : ' para liberar o acesso ao painel.'}
            </p>
          </div>
        </div>


        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 font-medium"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleFinish} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-brand-ink">Cidade</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-primary/15"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-brand-ink">
                Bairro de referência
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-primary/15"
              />
            </div>
          </div>

          {user.roles.includes('prestador') && (
            <div className="space-y-1">
              <label className="font-semibold text-brand-ink">
                Resumo profissional (Vitrine Pública)
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-primary/15"
              />
            </div>
          )}

          {isProviderOnboarding && officialSpecialtiesCount < 1 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium">
              Abaixo, selecione 1 categoria principal e salve entre 1 e 5 especialidades oficiais para habilitar a conclusão do seu cadastro.
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading || (isProviderOnboarding && officialSpecialtiesCount < 1)
            }
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold cursor-pointer disabled:opacity-50"
          >
            {loading
              ? 'Salvando configurações...'
              : isProviderOnboarding && officialSpecialtiesCount < 1
                ? 'Salve ao menos 1 especialidade oficial abaixo para continuar'
                : 'Concluir Onboarding e Ir para o Painel →'}
          </button>
        </form>
      </div>

      {isProviderOnboarding && user.providerProfileId && (
        <ProviderSpecialtiesManager
          providerProfileId={user.providerProfileId}
          authToken={token}
          initialCategoryName={user.category || undefined}
          onOfficialSpecialtiesChange={setOfficialSpecialtiesCount}
        />
      )}
    </div>
  );
};

export const PadrinhoDashboardPage: React.FC<{
  user: AuthenticatedUserSession;
  token?: string;
}> = ({ user, token }) => {
  const [mentees, setMentees] = React.useState<any[]>([]);
  const [menteeProviderId, setMenteeProviderId] = React.useState('prov-carlos');
  const [mentorCode, setMentorCode] = React.useState('PADRINHO-JOAO-2026');
  const [feedback, setFeedback] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const loadMentees = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/app/padrinho/mentees', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => null);
      const body = res ? await safeParseJson(res) : null;
      if (res && res.ok && body?.ok) {
        setMentees(body.mentees || []);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadMentees();
  }, [loadMentees]);

  const handleCreateMentorship = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');
    const res = await fetch('/api/app/padrinho/mentorships', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ menteeProviderId, mentorCode }),
    }).catch(() => null);
    const body = res ? await safeParseJson(res) : null;
    if (res && res.ok && body?.ok) {
      setFeedback('Apadrinhado autorizado com sucesso no PostgreSQL!');
      loadMentees();
    } else {
      setFeedback(body?.error || 'Erro ao vincular apadrinhado.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-brand-primary text-white rounded-3xl p-8 space-y-3">
        <BrandLogo variant="light" size="sm" decorative />
        <p className="text-xs font-semibold text-brand-accent-strong">
          Área Autenticada Restrita · Papel: Padrinho Verificado (/app/padrinho)
        </p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl">
          Painel do Padrinho — {user.fullName}
        </h1>
        <p className="text-xs sm:text-sm text-white/80">
          Acompanhe apenas os seus apadrinhados autorizados (protegido por RLS na tabela mentorships).
        </p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        <form
          onSubmit={handleCreateMentorship}
          className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4"
        >
          <h2 className="font-display font-bold text-base text-brand-ink">
            Autorizar Novo Apadrinhado
          </h2>
          {feedback && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 font-medium">
              {feedback}
            </div>
          )}
          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">
              ID do Profissional Apadrinhado
            </label>
            <input
              type="text"
              value={menteeProviderId}
              onChange={(e) => setMenteeProviderId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/15"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">
              Código de Mentoria Verificada
            </label>
            <input
              type="text"
              value={mentorCode}
              onChange={(e) => setMentorCode(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/15 font-mono"
            />
          </div>
          <button
            type="submit"
            className="min-h-[42px] px-4 py-2 rounded-xl bg-brand-accent-strong text-white font-semibold cursor-pointer"
          >
            Vincular Apadrinhado
          </button>
        </form>

        <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4">
          <h2 className="font-display font-bold text-base text-brand-ink">
            Meus Apadrinhados Autorizados ({mentees.length})
          </h2>
          {loading ? (
            <p className="text-brand-ink/60">Carregando apadrinhados...</p>
          ) : mentees.length === 0 ? (
            <p className="text-brand-ink/60">
              Nenhum apadrinhado vinculado ainda para este padrinho.
            </p>
          ) : (
            <div className="space-y-2.5">
              {mentees.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl bg-brand-background/60 border border-brand-primary/10 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-brand-ink">
                      {m.mentee_name || m.mentee_provider_id}
                    </p>
                    <p className="text-[11px] text-brand-ink/65">
                      Código: {m.mentor_code} · Categoria:{' '}
                      {m.mentee_category || 'Serviços'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const VerifyEmailPage: React.FC<{
  onAuthenticated: (
    user: AuthenticatedUserSession,
    token: string,
    redirectTo: string
  ) => void;
  onNavigateUrl: (path: string) => void;
}> = ({ onAuthenticated, onNavigateUrl }) => {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const initialToken = params?.get('token') || '';
  const initialEmail = params?.get('email') || '';

  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submitVerification = async (verificationToken: string) => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationToken: verificationToken.trim() }),
      }).catch(() => null);
      const body = res ? await safeParseJson(res) : null;
      if (res && res.ok && body?.ok && isValidJwtToken(body.token)) {
        let nextTarget =
          body.redirectTo || body.user?.redirectTo || '/app';
        try {
          const pendingPlanRaw =
            typeof window !== 'undefined'
              ? window.sessionStorage.getItem('recontrate_pending_plan')
              : null;
          if (pendingPlanRaw && body.user?.onboardingCompleted) {
            const parsed = JSON.parse(pendingPlanRaw);
            window.sessionStorage.removeItem('recontrate_pending_plan');
            if (parsed?.plan && parsed.plan !== 'gratuito') {
              nextTarget = `/planos?checkout=${encodeURIComponent(
                parsed.plan
              )}&cycle=${encodeURIComponent(parsed.cycle || 'mensal')}`;
            }
          }
        } catch {
          // ignore sessionStorage errors
        }
        onAuthenticated(body.user, body.token, nextTarget);
        return;
      }
      setError(
        body?.error ||
          'Token de verificação inválido, expirado ou servidor indisponível.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken && initialToken.length >= 6) {
      submitVerification(initialToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Informe seu e-mail para reenviar o link de confirmação.');
      return;
    }
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      }).catch(() => null);
      const body = res ? await safeParseJson(res) : null;
      if (res && res.ok && body?.ok) {
        setMessage(
          body.message ||
            'Se o e-mail estiver pendente de confirmação, enviamos um novo link.'
        );
      } else {
        setError(body?.error || 'Não foi possível reenviar o e-mail agora.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-5 my-6 text-xs">
      <div className="space-y-3">
        <BrandLogo variant="dark" size="sm" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-brand-link">
            Verificação Obrigatória de E-mail
          </p>
          <h1 className="font-display font-bold text-2xl text-brand-ink">
            Confirme seu endereço de e-mail
          </h1>
          <p className="text-brand-ink/75 leading-relaxed">
            Enviamos um link de confirmação de uso único para{' '}
            <strong>{email || 'seu e-mail cadastrado'}</strong>. Clique no link
            do e-mail ou cole o código recebido abaixo.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 font-medium"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium"
        >
          {message}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (token.trim()) {
            submitVerification(token.trim());
          }
        }}
        className="space-y-3"
      >
        <div className="space-y-1">
          <label
            htmlFor="verify-token"
            className="font-semibold text-brand-ink"
          >
            Código / Token de confirmação
          </label>
          <input
            id="verify-token"
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="vfy_..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 font-mono text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-semibold cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Verificando...' : 'Confirmar e ativar minha conta'}
        </button>
      </form>

      <form
        onSubmit={handleResend}
        className="pt-4 border-t border-brand-primary/10 space-y-2.5"
      >
        <label
          htmlFor="resend-email"
          className="block font-semibold text-brand-ink"
        >
          Não recebeu o e-mail? Reenviar link
        </label>
        <div className="flex gap-2">
          <input
            id="resend-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com.br"
            className="flex-1 px-3 py-2 rounded-xl border border-brand-primary/15 text-sm"
          />
          <button
            type="submit"
            disabled={resending}
            className="px-3.5 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold cursor-pointer disabled:opacity-60"
          >
            {resending ? 'Enviando...' : 'Reenviar'}
          </button>
        </div>
      </form>

      <div className="text-center pt-1">
        <button
          type="button"
          onClick={() => onNavigateUrl('/entrar')}
          className="text-brand-link font-semibold hover:underline cursor-pointer"
        >
          Voltar para entrar
        </button>
      </div>
    </div>
  );
};
