import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';

interface ReportContentModalProps {
  open: boolean;
  onClose: () => void;
  defaultTargetType?: 'provider_profile' | 'review' | 'other';
  defaultTargetId?: string;
  targetLabel?: string;
  authToken?: string;
}

export const ReportContentModal: React.FC<ReportContentModalProps> = ({
  open,
  onClose,
  defaultTargetType = 'other',
  defaultTargetId = 'geral',
  targetLabel,
  authToken,
}) => {
  const [category, setCategory] = useState<
    | 'conteudo_ilicito'
    | 'direitos_autorais'
    | 'fraude_golpe'
    | 'dados_pessoais'
    | 'assedio'
  >('conteudo_ilicito');
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (description.trim().length < 10) {
      setFeedback({
        type: 'error',
        message: 'Descreva o ocorrido com pelo menos 10 caracteres.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/reports', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && authToken.split('.').length === 3
            ? { Authorization: `Bearer ${authToken}` }
            : {}),
        },
        body: JSON.stringify({
          targetType: defaultTargetType,
          targetId: defaultTargetId,
          category,
          description: description.trim(),
          ...(reporterEmail.trim()
            ? { reporterEmail: reporterEmail.trim() }
            : {}),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setFeedback({
          type: 'error',
          message:
            body?.error || 'Não foi possível enviar a denúncia no momento.',
        });
        return;
      }
      setFeedback({
        type: 'success',
        message: `Protocolo ${body.reportId} registrado para análise de moderação.`,
      });
      setDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-brand-primary/15 text-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-brand-ink">
            <Flag className="w-5 h-5 text-brand-accent-strong" aria-hidden="true" />
            <div>
              <h2
                id="report-modal-title"
                className="font-display font-bold text-base sm:text-lg"
              >
                Denunciar Conteúdo ou Violação de Direitos Autorais
              </h2>
              {targetLabel && (
                <p className="text-[11px] text-brand-ink/70">
                  Item sinalizado: {targetLabel} ({defaultTargetId})
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de denúncia"
            className="p-2 rounded-xl hover:bg-brand-background text-brand-ink cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback && (
          <div
            role="status"
            className={`p-3.5 rounded-xl font-medium ${
              feedback.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="report-category"
              className="block font-semibold text-brand-ink mb-1"
            >
              Categoria da denúncia *
            </label>
            <select
              id="report-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 bg-brand-background/50 text-sm text-brand-ink"
            >
              <option value="conteudo_ilicito">Conteúdo ilícito ou impróprio</option>
              <option value="direitos_autorais">
                Violação de direitos autorais / propriedade intelectual
              </option>
              <option value="fraude_golpe">Tentativa de fraude ou golpe</option>
              <option value="dados_pessoais">
                Exposição indevida de dados pessoais (LGPD)
              </option>
              <option value="assedio">Assédio ou conduta abusiva</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="report-email"
              className="block font-semibold text-brand-ink mb-1"
            >
              E-mail para retorno (opcional)
            </label>
            <input
              id="report-email"
              type="email"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              placeholder="seuemail@exemplo.com.br"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 bg-brand-background/50 text-sm text-brand-ink"
            />
          </div>

          <div>
            <label
              htmlFor="report-description"
              className="block font-semibold text-brand-ink mb-1"
            >
              Descrição detalhada (incluindo URL ou obra protegida, se aplicável) *
            </label>
            <textarea
              id="report-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os fatos para análise da equipe de moderação..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/15 bg-brand-background/50 text-sm text-brand-ink"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[40px] px-5 py-2 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover disabled:opacity-60 text-white font-display font-semibold cursor-pointer"
            >
              {submitting ? 'Enviando...' : 'Registrar denúncia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
