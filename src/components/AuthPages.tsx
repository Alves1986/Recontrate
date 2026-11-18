import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { authClient } from '../lib/neonClient';
import type { AuthenticatedUserSession } from '../services/authService';
import { INITIAL_TAXONOMY_CATEGORIES } from '../data/taxonomySeed';
import { ProviderSpecialtiesManager } from './ProviderSpecialtiesManager';
import { BrandLogo } from './BrandLogo';

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error || 'E-mail ou senha inválidos.');
        return;
      }
      onAuthenticated(body.user, body.token, body.redirectTo);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
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
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
        >
          {error}
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
            <Mail className="w-4 h-4 text-brand-ink/50" />
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              className="w-full focus:outline-none text-sm"
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
            <Lock className="w-4 h-4 text-brand-ink/50" />
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full focus:outline-none text-sm"
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
  const [role, setRole] = useState<'cliente' | 'prestador'>('cliente');
  const [alsoEnableSecondRole, setAlsoEnableSecondRole] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [neighborhood, setNeighborhood] = useState('Pinheiros');
  const [category, setCategory] = useState('Elétrica');
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [websiteHoneypot, setWebsiteHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingVerification, setPendingVerification] = useState<{
    user: AuthenticatedUserSession;
    token: string;
    verificationToken: string;
  } | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (websiteHoneypot.trim() !== '') {
      return;
    }
    if (!lgpdConsent) {
      setError(
        'Para continuar no pré-cadastro/piloto, marque a caixa de consentimento concordando com os avisos de uso e privacidade.'
      );
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          alsoEnableSecondRole,
          fullName,
          email,
          password,
          phone,
          neighborhood,
          category,
          lgpdConsent,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error || 'Não foi possível criar a conta.');
        return;
      }
      setPendingVerification({
        user: body.user,
        token: body.token,
        verificationToken: body.verificationToken,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmailAndContinue = async () => {
    if (!pendingVerification) return;
    setLoading(true);
    try {
      await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationToken: pendingVerification.verificationToken,
        }),
      });
      onAuthenticated(
        {
          ...pendingVerification.user,
          emailVerified: true,
          status: 'ativo',
        },
        pendingVerification.token,
        '/app/onboarding'
      );
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 border border-brand-primary/10 space-y-5 my-6 text-xs">
        <BrandLogo variant="dark" size="sm" />
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h1 className="font-display font-bold text-2xl text-brand-ink">
          Confirme seu e-mail para ativar a conta
        </h1>
        <p className="text-brand-ink/75 leading-relaxed">
          Enviamos a confirmação para <strong>{pendingVerification.user.email}</strong>. Confirme abaixo para concluir o onboarding obrigatório e acessar seu painel.
        </p>
        <button
          type="button"
          onClick={handleConfirmEmailAndContinue}
          disabled={loading}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold cursor-pointer"
        >
          {loading
            ? 'Confirmando e-mail...'
            : 'Confirmar E-mail e Continuar para Onboarding →'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-6 my-6">
      <div className="space-y-3">
        <BrandLogo variant="dark" size="sm" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-brand-link">
            Cadastro Real · Cliente e/ou Prestador
          </p>
          <h1 className="font-display font-bold text-2xl text-brand-ink">
            Criar conta no Recontrate
          </h1>
        </div>
      </div>


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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">
              Nome completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">
              WhatsApp / Telefone
            </label>
            <input
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
            <label className="font-semibold text-brand-ink">
              Bairro principal
            </label>
            <input
              type="text"
              required
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-brand-ink">
              Especialidade {role === 'cliente' ? 'favorita' : 'de atuação'}
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
        </div>

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

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={lgpdConsent}
            onChange={(e) => setLgpdConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-brand-ink/80 leading-relaxed">
            Autorizo o uso dos dados mínimos informados acima para acesso ao ambiente de piloto do Recontrate, ciente dos{' '}
            <button
              type="button"
              onClick={() => onNavigateUrl('/termos')}
              className="underline font-semibold text-brand-link cursor-pointer"
            >
              Termos de Uso
            </button>{' '}
            e da{' '}
            <button
              type="button"
              onClick={() => onNavigateUrl('/privacidade')}
              className="underline font-semibold text-brand-link cursor-pointer"
            >
              Política de Privacidade LGPD (em revisão)
            </button>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Registrando participação...' : 'Participar do piloto / Criar conta'}
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
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Erro ao solicitar recuperação.');
      return;
    }
    if (body.resetToken) {
      setResetToken(body.resetToken);
    }
    setMessage(
      'Instruções de recuperação geradas. Informe o código/token e defina sua nova senha.'
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
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Falha ao redefinir senha.');
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
  const [neighborhood, setNeighborhood] = useState('Pinheiros');
  const [city, setCity] = useState('São Paulo, SP');
  const [bio, setBio] = useState(
    'Profissional autônomo dedicado a atendimentos pontuais e seguros.'
  );
  const [officialSpecialtiesCount, setOfficialSpecialtiesCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          city,
          neighborhood,
          bio,
          enforceOfficialSpecialties: isProviderOnboarding,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error || 'Não foi possível concluir o onboarding.');
        return;
      }
      onComplete(body.redirectTo || '/app');
    } catch (err) {
      setError((err as Error).message);
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
      });
      const body = await res.json();
      if (res.ok && body.ok) {
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
    });
    const body = await res.json();
    if (res.ok && body.ok) {
      setFeedback('Apadrinhado autorizado com sucesso no PostgreSQL!');
      loadMentees();
    } else {
      setFeedback(body.error || 'Erro ao vincular apadrinhado.');
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
