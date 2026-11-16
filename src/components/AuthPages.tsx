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
    <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-[#0A2540]/10 space-y-6 my-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#1D6FE0]">
          Acesso Seguro · Neon Auth (Managed Better Auth)
        </p>
        <h1 className="font-display font-bold text-2xl text-[#0A2540]">
          Entrar na sua conta
        </h1>
        <p className="text-xs text-[#0A2540]/70">
          Acesse sua área de cliente, painel do prestador ou mentoria.
        </p>
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
            className="font-semibold text-[#0A2540]"
          >
            E-mail
          </label>
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#0A2540]/15">
            <Mail className="w-4 h-4 text-[#0A2540]/50" />
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
              className="font-semibold text-[#0A2540]"
            >
              Senha
            </label>
            <button
              type="button"
              onClick={() => onNavigateUrl('/recuperar-senha')}
              className="text-[#1D6FE0] hover:underline font-medium cursor-pointer"
            >
              Esqueceu a senha?
            </button>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#0A2540]/15">
            <Lock className="w-4 h-4 text-[#0A2540]/50" />
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
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Autenticando...' : 'Entrar com e-mail e senha'}
        </button>
      </form>

      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-[#0A2540]/10" />
        <span className="flex-shrink mx-3 text-[11px] text-[#0A2540]/55">
          ou continue com
        </span>
        <div className="flex-grow border-t border-[#0A2540]/10" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540] font-semibold text-xs transition-colors cursor-pointer"
      >
        Entrar com Google (Neon Auth OAuth)
      </button>

      <p className="text-center text-xs text-[#0A2540]/70 pt-2">
        Ainda não tem conta?{' '}
        <button
          type="button"
          onClick={() => onNavigateUrl('/criar-conta')}
          className="font-semibold text-[#1D6FE0] hover:underline cursor-pointer"
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
  const [category, setCategory] = useState('Eletricista');
  const [lgpdConsent, setLgpdConsent] = useState(true);
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
      <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 border border-[#0A2540]/10 space-y-5 my-6 text-xs">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h1 className="font-display font-bold text-2xl text-[#0A2540]">
          Confirme seu e-mail para ativar a conta
        </h1>
        <p className="text-[#0A2540]/75 leading-relaxed">
          Enviamos a confirmação para <strong>{pendingVerification.user.email}</strong>. Confirme abaixo para concluir o onboarding obrigatório e acessar seu painel.
        </p>
        <button
          type="button"
          onClick={handleConfirmEmailAndContinue}
          disabled={loading}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold cursor-pointer"
        >
          {loading
            ? 'Confirmando e-mail...'
            : 'Confirmar E-mail e Continuar para Onboarding →'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-[#0A2540]/10 space-y-6 my-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#1D6FE0]">
          Cadastro Real · Cliente e/ou Prestador
        </p>
        <h1 className="font-display font-bold text-2xl text-[#0A2540]">
          Criar conta na Confiare
        </h1>
      </div>

      {/* Role Selector */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <button
          type="button"
          onClick={() => setRole('cliente')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            role === 'cliente'
              ? 'bg-[#0A2540] text-white border-[#0A2540]'
              : 'bg-[#F4F2EF]/60 text-[#0A2540] border-[#0A2540]/10'
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
              ? 'bg-[#0A2540] text-white border-[#0A2540]'
              : 'bg-[#F4F2EF]/60 text-[#0A2540] border-[#0A2540]/10'
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
            <label className="font-semibold text-[#0A2540]">
              Nome completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#0A2540]/15 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[#0A2540]">
              WhatsApp / Telefone
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99000-0000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#0A2540]/15 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-[#0A2540]">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com.br"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#0A2540]/15 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[#0A2540]">
              Senha (mín. 8 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#0A2540]/15 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-[#0A2540]">
              Bairro principal
            </label>
            <input
              type="text"
              required
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#0A2540]/15 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[#0A2540]">
              Especialidade {role === 'cliente' ? 'favorita' : 'de atuação'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#0A2540]/15 text-sm bg-white"
            >
              <option value="Eletricista">Eletricista</option>
              <option value="Encanador">Encanador</option>
              <option value="Diarista">Diarista</option>
              <option value="Pintor">Pintor</option>
              <option value="Técnico de ar-condicionado">
                Técnico de ar-condicionado
              </option>
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
          <span className="text-[#0A2540]/80">
            Desejo usar a plataforma como <strong>Cliente e Prestador</strong> na mesma conta.
          </span>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={lgpdConsent}
            onChange={(e) => setLgpdConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-[#0A2540]/80">
            Aceito os Termos de Uso e a Política de Privacidade LGPD da Confiare.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Criando conta segura...' : 'Criar minha conta'}
        </button>
      </form>

      <p className="text-center text-xs text-[#0A2540]/70">
        Já possui conta?{' '}
        <button
          type="button"
          onClick={() => onNavigateUrl('/entrar')}
          className="font-semibold text-[#1D6FE0] hover:underline cursor-pointer"
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
    <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-[#0A2540]/10 space-y-6 my-6 text-xs">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#1D6FE0]">
          Recuperação Segura de Credenciais
        </p>
        <h1 className="font-display font-bold text-2xl text-[#0A2540]">
          Recuperar senha
        </h1>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800">
          {error}
        </div>
      )}

      {step === 'request' && (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div className="space-y-1">
            <label className="font-semibold text-[#0A2540]">
              E-mail cadastrado
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#0A2540]/15 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#0A2540] text-white font-semibold cursor-pointer"
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
            <label className="font-semibold text-[#0A2540]">
              Token de recuperação
            </label>
            <input
              type="text"
              required
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#0A2540]/15 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-[#0A2540]">
              Nova senha (mín. 8 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#0A2540]/15 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#FF6A00] text-white font-semibold cursor-pointer"
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
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#0A2540] text-white font-semibold cursor-pointer"
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
  const [neighborhood, setNeighborhood] = useState('Pinheiros');
  const [city, setCity] = useState('São Paulo, SP');
  const [bio, setBio] = useState(
    'Profissional autônomo dedicado a atendimentos pontuais e seguros.'
  );
  const [loading, setLoading] = useState(false);

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
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
        }),
      });
      const body = await res.json();
      onComplete(body.redirectTo || '/app');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 border border-[#0A2540]/10 space-y-6 my-6 text-xs">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#FF6A00]">
          Onboarding Obrigatório de Primeiro Acesso
        </p>
        <h1 className="font-display font-bold text-2xl text-[#0A2540]">
          Bem-vindo(a), {user.fullName}!
        </h1>
        <p className="text-[#0A2540]/70">
          Papel ativo: <strong>{user.activeRole.toUpperCase()}</strong>. Confirme seus dados locais para liberar o acesso ao painel.
        </p>
      </div>

      <form onSubmit={handleFinish} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-[#0A2540]">Cidade</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#0A2540]/15"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-[#0A2540]">
              Bairro de referência
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#0A2540]/15"
            />
          </div>
        </div>

        {user.roles.includes('prestador') && (
          <div className="space-y-1">
            <label className="font-semibold text-[#0A2540]">
              Resumo profissional (Vitrine Pública)
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#0A2540]/15"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold cursor-pointer"
        >
          {loading
            ? 'Salvando configurações...'
            : 'Concluir Onboarding e Ir para o Painel →'}
        </button>
      </form>
    </div>
  );
};

export const PadrinhoDashboardPage: React.FC<{
  user: AuthenticatedUserSession;
}> = ({ user }) => {
  return (
    <div className="space-y-6 pb-12">
      <div className="bg-[#0A2540] text-white rounded-3xl p-8 space-y-2">
        <p className="text-xs font-semibold text-[#FF6A00]">
          Área Autenticada Restrita · Papel: Padrinho Verificado (/app/padrinho)
        </p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl">
          Painel do Padrinho — {user.fullName}
        </h1>
        <p className="text-xs sm:text-sm text-white/80">
          Acompanhe apenas os seus apadrinhados autorizados (protegido por RLS na tabela mentorships).
        </p>
      </div>
    </div>
  );
};
