import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Cookie,
  Download,
  FileJson,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { getLegalIdentity } from '../config/legalIdentity';

interface ConsentHistoryRow {
  id: string;
  consent_type: string;
  granted: boolean;
  document_version: string | null;
  created_at: string;
}

interface PrivacyCenterPageProps {
  authToken?: string;
  userEmail: string;
  onOpenCookieBanner: () => void;
  onAccountDeleted: () => void;
  onNavigateUrl: (path: string) => void;
}

export const PrivacyCenterPage: React.FC<PrivacyCenterPageProps> = ({
  authToken,
  userEmail,
  onOpenCookieBanner,
  onAccountDeleted,
  onNavigateUrl,
}) => {
  const legal = getLegalIdentity();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [aiTrainingOptOut, setAiTrainingOptOut] = useState(true);
  const [termsVersion, setTermsVersion] = useState('');
  const [privacyVersion, setPrivacyVersion] = useState('');
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);
  const [consentHistory, setConsentHistory] = useState<ConsentHistoryRow[]>([]);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const headers = useCallback(
    (json = false): Record<string, string> => ({
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken && authToken.split('.').length === 3
        ? { Authorization: `Bearer ${authToken}` }
        : {}),
    }),
    [authToken]
  );

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/app/privacidade/preferences', {
        credentials: 'include',
        headers: headers(false),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        setMarketingOptIn(Boolean(body.preferences?.marketingOptIn));
        setAiTrainingOptOut(body.preferences?.aiTrainingOptOut !== false);
        setTermsVersion(body.preferences?.termsVersion || '2026-04-v1');
        setPrivacyVersion(body.preferences?.privacyVersion || '2026-04-v1');
        setTermsAcceptedAt(body.preferences?.termsAcceptedAt || null);
        setConsentHistory(
          Array.isArray(body.consentHistory) ? body.consentHistory : []
        );
      }
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleSavePreferences = async () => {
    setFeedback(null);
    setSaving(true);
    try {
      const res = await fetch('/api/app/privacidade/preferences', {
        method: 'PATCH',
        credentials: 'include',
        headers: headers(true),
        body: JSON.stringify({
          marketingOptIn,
          aiTrainingOptOut,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setFeedback({
          type: 'error',
          message:
            body?.error || 'Não foi possível salvar suas preferências LGPD.',
        });
        return;
      }
      setFeedback({
        type: 'success',
        message: 'Preferências de privacidade, marketing e IA atualizadas.',
      });
      await loadPreferences();
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadExport = async (format: 'json' | 'csv') => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/app/privacidade/export?format=${format}`, {
        credentials: 'include',
        headers: headers(false),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setFeedback({
          type: 'error',
          message:
            body?.error || `Falha ao exportar dados em formato ${format.toUpperCase()}.`,
        });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recontrate-meus-dados.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setFeedback({
        type: 'success',
        message: `Cópia dos seus dados gerada em ${format.toUpperCase()} com sucesso.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Erro de conexão ao gerar exportação de dados.',
      });
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (confirmText.trim() !== 'EXCLUIR MINHA CONTA') {
      setFeedback({
        type: 'error',
        message: 'Digite exatamente EXCLUIR MINHA CONTA para confirmar.',
      });
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/app/privacidade/delete-account', {
        method: 'POST',
        credentials: 'include',
        headers: headers(true),
        body: JSON.stringify({
          confirmationText: confirmText.trim(),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setFeedback({
          type: 'error',
          message:
            body?.error || 'Não foi possível concluir a exclusão da conta.',
        });
        return;
      }
      onAccountDeleted();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <section className="bg-brand-primary text-white rounded-3xl p-6 sm:p-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-brand-accent-contrast">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Central de Privacidade e Direitos do Titular · LGPD art. 18</span>
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl">
          Seus Dados, Consentimentos e Portabilidade
        </h1>
        <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
          Titular conectado: <strong>{userEmail}</strong> · Versão vigente aceita: Termos{' '}
          <span className="font-mono">{termsVersion || '2026-04-v1'}</span> / Privacidade{' '}
          <span className="font-mono">{privacyVersion || '2026-04-v1'}</span>
          {termsAcceptedAt
            ? ` (aceite UTC em ${new Date(termsAcceptedAt).toISOString()})`
            : ''}
          .
        </p>
      </section>

      {feedback && (
        <div
          role="status"
          className={`p-4 rounded-2xl border text-xs font-medium ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Preferências de Marketing, IA e Cookies */}
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-bold text-lg text-brand-ink">
            1. Preferências de Comunicação, IA e Cookies
          </h2>
          <button
            type="button"
            onClick={onOpenCookieBanner}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Cookie className="w-4 h-4" aria-hidden="true" />
            Gerenciar Cookies (ANPD)
          </button>
        </div>

        {loading ? (
          <p className="text-brand-ink/70">Carregando preferências...</p>
        ) : (
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-brand-background/70 border border-brand-primary/10 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-brand-primary"
              />
              <span className="leading-relaxed text-brand-ink">
                <strong>Comunicações de Marketing e Novidades (LGPD art. 8º §4º):</strong>{' '}
                Autorizo o recebimento de comunicações promocionais por e-mail (desmarcado por padrão; você pode revogar a qualquer momento aqui ou via link de 1 clique nos e-mails).
              </span>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-2xl bg-brand-background/70 border border-brand-primary/10 cursor-pointer">
              <input
                type="checkbox"
                checked={aiTrainingOptOut}
                onChange={(e) => setAiTrainingOptOut(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-brand-primary"
              />
              <span className="leading-relaxed text-brand-ink">
                <strong className="inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand-link" aria-hidden="true" />
                  Oposição ao uso de dados para treino de Inteligência Artificial (Opt-out IA):
                </strong>{' '}
                Não utilizar minhas descrições de serviços, avaliações ou conversas para treinar modelos generativos externos ou de terceiros.
              </span>
            </label>

            <button
              type="button"
              disabled={saving}
              onClick={handleSavePreferences}
              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-60 text-white font-display font-semibold cursor-pointer"
            >
              {saving ? 'Salvando...' : 'Salvar preferências de privacidade'}
            </button>
          </div>
        )}
      </section>

      {/* Exportação de Dados (LGPD art. 18 V) */}
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4 text-xs">
        <h2 className="font-display font-bold text-lg text-brand-ink">
          2. Acesso e Portabilidade dos Meus Dados (JSON / CSV)
        </h2>
        <p className="text-brand-ink/80 leading-relaxed">
          Baixe uma cópia completa dos seus dados cadastrais, solicitações, avaliações, assinaturas e histórico de consentimentos em formato aberto estruturado. Segredos internos (hashes de senha/tokens) nunca são exportados.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleDownloadExport('json')}
            className="min-h-[42px] px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <FileJson className="w-4 h-4" aria-hidden="true" />
            Exportar Meus Dados (JSON)
          </button>
          <button
            type="button"
            onClick={() => handleDownloadExport('csv')}
            className="min-h-[42px] px-4 py-2.5 rounded-xl bg-brand-background hover:bg-brand-surface-hover border border-brand-primary/15 text-brand-ink font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Exportar Meus Dados (CSV)
          </button>
        </div>
      </section>

      {/* Histórico de Consentimentos */}
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-3 text-xs">
        <h2 className="font-display font-bold text-lg text-brand-ink">
          3. Trilha Auditável de Consentimentos (UTC)
        </h2>
        {consentHistory.length === 0 ? (
          <p className="text-brand-ink/70">
            Nenhum evento adicional registrado ainda na trilha de consentimentos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-primary/10 text-brand-ink/70">
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Decisão</th>
                  <th className="py-2 pr-3">Versão</th>
                  <th className="py-2">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {consentHistory.slice(0, 15).map((row) => (
                  <tr key={row.id} className="border-b border-brand-primary/5">
                    <td className="py-2 pr-3 font-mono">{row.consent_type}</td>
                    <td className="py-2 pr-3 font-semibold">
                      {row.granted ? 'Concedido' : 'Recusado / Opt-out'}
                    </td>
                    <td className="py-2 pr-3 font-mono">
                      {row.document_version || '2026-04-v1'}
                    </td>
                    <td className="py-2 font-mono text-[11px]">
                      {new Date(row.created_at).toISOString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Encarregado DPO & Exclusão / Anonimização (LGPD art. 18 VI) */}
      <section className="bg-white rounded-3xl p-6 border border-red-200 space-y-4 text-xs">
        <div className="flex items-start gap-2.5 text-red-900">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="font-display font-bold text-lg">
              4. Exclusão de Conta e Eliminação/Anonimização de Dados
            </h2>
            <p className="text-red-900/80 leading-relaxed">
              Ao confirmar a exclusão definitiva, seus dados pessoais diretos (nome, e-mail, telefone, data de nascimento, perfil profissional e contatos em solicitações) são anonimizados e seu acesso é revogado imediatamente. Faturas fiscais anonimizadas e registros contábeis permanecem retidos pelo prazo legal mínimo de 5 anos (CTN / obrigações fiscais, LGPD art. 16, I).
            </p>
          </div>
        </div>

        <form onSubmit={handleDeleteAccount} className="space-y-3">
          <div>
            <label
              htmlFor="delete-confirm-input"
              className="block font-semibold text-brand-ink mb-1"
            >
              Digite <code className="font-mono font-bold">EXCLUIR MINHA CONTA</code> para prosseguir:
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="EXCLUIR MINHA CONTA"
              className="w-full max-w-md px-3.5 py-2.5 rounded-xl border border-red-300 bg-red-50/40 text-sm font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={deleting}
            className="min-h-[42px] px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white font-display font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            {deleting ? 'Excluindo conta...' : 'Excluir minha conta e anonimizar dados'}
          </button>
        </form>

        <p className="text-[11px] text-brand-ink/70 pt-2 border-t border-brand-primary/10">
          Canal do Encarregado (DPO): <strong>{legal.dpoName}</strong> ({legal.dpoEmail}) ·{' '}
          <button
            type="button"
            onClick={() => onNavigateUrl('/privacidade')}
            className="underline font-semibold text-brand-link cursor-pointer"
          >
            Ver Política de Privacidade completa
          </button>
        </p>
      </section>
    </div>
  );
};
