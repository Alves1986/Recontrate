import React, { useCallback, useEffect, useState } from 'react';
import {
  Pause,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react';

function formatBRLFromCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export const AdminMonetizationScreen: React.FC<{ authToken?: string }> = ({
  authToken,
}) => {
  const buildAdminHeaders = useCallback(
    (withJson = false): Record<string, string> => ({
      ...(withJson ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }),
    [authToken]
  );

  const [metrics, setMetrics] = useState<any>(null);
  const [adminData, setAdminData] = useState<any>(null);
  const [adsReport, setAdsReport] = useState<any>(null);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [providersRegistry, setProvidersRegistry] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [promoAnalytics, setPromoAnalytics] = useState<any>(null);
  const [promoFeedback, setPromoFeedback] = useState('');
  const [referralAnalytics, setReferralAnalytics] = useState<any>(null);
  const [taxonomyQueue, setTaxonomyQueue] = useState<any>({
    suggestions: [],
    customTags: [],
  });
  const [officialSpecialtiesCatalog, setOfficialSpecialtiesCatalog] = useState<any[]>([]);
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [taxonomyFeedback, setTaxonomyFeedback] = useState('');
  const [backupResult, setBackupResult] = useState<any>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [adForm, setAdForm] = useState({
    nome: '',
    tipo: 'banner_painel_prestador' as
      | 'banner_painel_prestador'
      | 'banner_perfil_prestador'
      | 'card_oferta',
    categoria: 'ferramentas',
    anunciante: '',
    texto: '',
    linkDestino: '',
    imagemUrl: '',
    prioridade: 5,
    dataInicio: new Date().toISOString().slice(0, 10),
    dataFim: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  });
  const [adFeedback, setAdFeedback] = useState('');
  const [googleForm, setGoogleForm] = useState({
    enabled: false,
    mode: 'hibrido_google_adsense',
    clientId: '',
    slotId: '',
  });
  const [googleFeedback, setGoogleFeedback] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planEditForm, setPlanEditForm] = useState({
    nome: '',
    descricao: '',
    precoMensalReais: '0.00',
    precoAnualReais: '0.00',
    limiteOportunidadesMensal: 5,
    prioridadeMatching: 0,
    prioridadeLabel: 'Baixa',
    selo: '',
    ativo: true,
    exibeAnuncios: false,
    permiteDestaque: false,
    permiteRelatoriosAvancados: false,
    permitePortfolioIlimitado: false,
    suportePrioritario: false,
  });
  const [planSaveLoading, setPlanSaveLoading] = useState(false);
  const [planSaveFeedback, setPlanSaveFeedback] = useState('');

  const loadAdminDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const headers = buildAdminHeaders(false);
      const reqInit: RequestInit = { credentials: 'include', headers };
      const [mRes, sRes, aRes, pRes, provRes, healthRes, promoRes, taxRes, specsRes, refRes] = await Promise.all([
        fetch('/api/admin/metrics', reqInit).then((r) => r.json()),
        fetch('/api/admin/subscriptions', reqInit).then((r) => r.json()),
        fetch('/api/admin/ads', reqInit).then((r) => r.json()),
        fetch('/api/plans').then((r) => r.json()),
        fetch('/api/admin/providers', reqInit)
          .then((r) => (r.ok ? r.json() : { ok: false }))
          .catch(() => ({ ok: false })),
        fetch('/api/admin/system-health', reqInit)
          .then((r) => (r.ok ? r.json() : fetch('/api/health').then((h) => h.json())))
          .catch(() => ({ ok: false })),
        fetch('/api/admin/promotions', reqInit)
          .then((r) => (r.ok ? r.json() : { ok: false }))
          .catch(() => ({ ok: false })),
        fetch('/api/admin/taxonomy/suggestions', reqInit)
          .then((r) => (r.ok ? r.json() : { ok: false }))
          .catch(() => ({ ok: false })),
        fetch('/api/taxonomy/specialties')
          .then((r) => (r.ok ? r.json() : { ok: false }))
          .catch(() => ({ ok: false })),
        fetch('/api/admin/referrals', reqInit)
          .then((r) => (r.ok ? r.json() : { ok: false }))
          .catch(() => ({ ok: false })),
      ]);
      if (mRes.ok) setMetrics(mRes.metrics);
      if (sRes.ok) setAdminData(sRes);
      if (provRes?.ok) setProvidersRegistry(provRes.providers || []);
      if (healthRes?.ok) setSystemHealth(healthRes);
      if (promoRes?.ok) setPromoAnalytics(promoRes);
      if (refRes?.ok) setReferralAnalytics(refRes);
      if (taxRes?.ok) {
        setTaxonomyQueue({
          suggestions: taxRes.suggestions || [],
          customTags: taxRes.customTags || [],
        });
      }
      if (specsRes?.ok) {
        setOfficialSpecialtiesCatalog(specsRes.specialties || []);
      }
      if (aRes.ok) {
        setAdsReport(aRes);
        if (aRes.googleAdSense) {
          setGoogleForm({
            enabled: aRes.googleAdSense.enabled,
            mode: aRes.googleAdSense.mode,
            clientId: aRes.googleAdSense.clientId,
            slotId: aRes.googleAdSense.slotId,
          });
        }
      }
      if (pRes.ok) setPlansList(pRes.plans || []);
    } catch (err) {
      console.error('Erro ao carregar painel admin:', err);
    } finally {
      setLoading(false);
    }
  }, [buildAdminHeaders]);

  useEffect(() => {
    loadAdminDashboard();
  }, [loadAdminDashboard]);

  const handleStartEditPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setPlanSaveFeedback('');
    setPlanEditForm({
      nome: plan.nome || '',
      descricao: plan.descricao || '',
      precoMensalReais: ((plan.precoMensalCentavos ?? 0) / 100).toFixed(2),
      precoAnualReais: ((plan.precoAnualCentavos ?? 0) / 100).toFixed(2),
      limiteOportunidadesMensal: Number(plan.limiteOportunidadesMensal ?? 5),
      prioridadeMatching: Number(plan.prioridadeMatching ?? 0),
      prioridadeLabel: plan.prioridadeLabel || 'Baixa',
      selo: plan.selo || '',
      ativo: plan.ativo !== false,
      exibeAnuncios: Boolean(plan.exibeAnuncios),
      permiteDestaque: Boolean(plan.permiteDestaque),
      permiteRelatoriosAvancados: Boolean(plan.permiteRelatoriosAvancados),
      permitePortfolioIlimitado: Boolean(plan.permitePortfolioIlimitado),
      suportePrioritario: Boolean(plan.suportePrioritario),
    });
  };

  const handleSavePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanId) return;
    setPlanSaveLoading(true);
    setPlanSaveFeedback('');
    try {
      const precoMensalCentavos = Math.max(
        0,
        Math.round(Number(planEditForm.precoMensalReais.replace(',', '.')) * 100)
      );
      const precoAnualCentavos = Math.max(
        0,
        Math.round(Number(planEditForm.precoAnualReais.replace(',', '.')) * 100)
      );
      const res = await fetch(`/api/admin/plans/${encodeURIComponent(editingPlanId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: buildAdminHeaders(true),
        body: JSON.stringify({
          nome: planEditForm.nome.trim(),
          descricao: planEditForm.descricao.trim(),
          precoMensalCentavos,
          precoAnualCentavos,
          limiteOportunidadesMensal: Math.max(
            1,
            Number(planEditForm.limiteOportunidadesMensal) || 1
          ),
          prioridadeMatching: Math.min(
            12,
            Math.max(0, Number(planEditForm.prioridadeMatching) || 0)
          ),
          prioridadeLabel: planEditForm.prioridadeLabel,
          selo: planEditForm.selo.trim() || null,
          ativo: planEditForm.ativo,
          exibeAnuncios: planEditForm.exibeAnuncios,
          permiteDestaque: planEditForm.permiteDestaque,
          permiteRelatoriosAvancados: planEditForm.permiteRelatoriosAvancados,
          permitePortfolioIlimitado: planEditForm.permitePortfolioIlimitado,
          suportePrioritario: planEditForm.suportePrioritario,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error || 'Erro ao atualizar plano.');
      }
      setPlanSaveFeedback(
        `Plano "${body.plan?.nome || planEditForm.nome}" atualizado com sucesso no banco de dados!`
      );
      setEditingPlanId(null);
      await loadAdminDashboard();
    } catch (err) {
      setPlanSaveFeedback(`Erro: ${(err as Error).message}`);
    } finally {
      setPlanSaveLoading(false);
    }
  };

  const handleSaveGoogleAdsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleFeedback('');
    try {
      const res = await fetch('/api/admin/ads/google-config', {
        method: 'PATCH',
        credentials: 'include',
        headers: buildAdminHeaders(true),
        body: JSON.stringify(googleForm),
      });
      const body = await res.json();
      if (res.ok) {
        setGoogleFeedback(
          `Google AdSense atualizado! Linha ads.txt: ${body.googleAdSense.adsTxtLine}`
        );
        loadAdminDashboard();
      }
    } catch (err) {
      setGoogleFeedback(`Falha: ${(err as Error).message}`);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdFeedback('');
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'POST',
        credentials: 'include',
        headers: buildAdminHeaders(true),
        body: JSON.stringify({
          ...adForm,
          prioridade: Number(adForm.prioridade) || 5,
          dataInicio: new Date(adForm.dataInicio).toISOString(),
          dataFim: new Date(adForm.dataFim).toISOString(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAdFeedback(`Erro: ${body.error}`);
        return;
      }
      setAdFeedback('Anúncio patrocinado criado e validado com sucesso!');
      setAdForm((prev) => ({ ...prev, nome: '', anunciante: '', texto: '' }));
      loadAdminDashboard();
    } catch (err) {
      setAdFeedback(`Falha: ${(err as Error).message}`);
    }
  };

  const handleToggleAdStatus = async (ad: any) => {
    const nextStatus = ad.status === 'ativo' ? 'pausado' : 'ativo';
    try {
      const res = await fetch(`/api/admin/ads/${ad.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: buildAdminHeaders(true),
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setAdFeedback(
          `Anúncio "${ad.nome}" atualizado para status "${nextStatus}".`
        );
        loadAdminDashboard();
      }
    } catch (err) {
      setAdFeedback(`Falha ao atualizar anúncio: ${(err as Error).message}`);
    }
  };

  const handleDeleteAd = async (ad: any) => {
    try {
      const res = await fetch(`/api/admin/ads/${ad.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: buildAdminHeaders(false),
      });
      if (res.ok) {
        setAdFeedback(`Anúncio "${ad.nome}" removido com sucesso.`);
        loadAdminDashboard();
      }
    } catch (err) {
      setAdFeedback(`Falha ao remover anúncio: ${(err as Error).message}`);
    }
  };

  const filteredSubscriptions = (adminData?.subscriptions || []).filter(
    (s: any) => {
      if (statusFilter !== 'todos' && s.status !== statusFilter) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          s.providerProfileId?.toLowerCase().includes(q) ||
          s.planId?.toLowerCase().includes(q) ||
          s.status?.toLowerCase().includes(q)
        );
      }
      return true;
    }
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-brand-primary text-white rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-brand-accent-strong">
            Governança Financeira & Operacional · Asaas + Neon Lakebase Postgres
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl">
            Painel Administrativo — Monetização, Assinaturas e Anúncios Moderados
          </h1>
          <p className="text-xs sm:text-sm text-white/80">
            Métricas de MRR, ARR, churn, conversão, auditoria de webhooks idempotentes, CRUD de anúncios e relatórios de CTR e receita estimada.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAdminDashboard}
          disabled={loading}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer self-start lg:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Indicadores</span>
        </button>
      </div>

      {/* KPI Strip */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 font-mono tabular-nums">
          <div className="bg-white rounded-2xl p-4 border border-brand-primary/10">
            <p className="text-[11px] font-sans text-brand-ink/70">MRR (Mensal)</p>
            <p className="text-lg font-bold text-brand-ink mt-1">
              {formatBRLFromCents(metrics.mrrCentavos)}
            </p>
            <p className="text-[11px] font-sans text-brand-link mt-0.5">
              ARR: {formatBRLFromCents(metrics.arrCentavos)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-brand-primary/10">
            <p className="text-[11px] font-sans text-brand-ink/70">
              Renovação / Churn
            </p>
            <p className="text-lg font-bold text-emerald-700 mt-1">
              {metrics.renewalRatePercent}%
            </p>
            <p className="text-[11px] font-sans text-brand-ink/70 mt-0.5">
              Churn: {metrics.churnMonthlyPercent}%
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-brand-primary/10">
            <p className="text-[11px] font-sans text-brand-ink/70">
              Conversão Gratuito → Pago
            </p>
            <p className="text-lg font-bold text-brand-ink mt-1">
              {metrics.freeToPaidConversionPercent}%
            </p>
            <p className="text-[11px] font-sans text-brand-link mt-0.5">
              Upgrades: {metrics.upgradesCount} · Downgrades: {metrics.downgradesCount}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-brand-primary/10">
            <p className="text-[11px] font-sans text-brand-ink/70">
              Inadimplência & Tolerância
            </p>
            <p className="text-lg font-bold text-brand-accent-strong mt-1">
              {metrics.overdueProvidersCount} inadimplente(s)
            </p>
            <p className="text-[11px] font-sans text-brand-ink/70 mt-0.5">
              {metrics.gracePeriodProvidersCount} em tolerância (7 dias)
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-brand-primary/10">
            <p className="text-[11px] font-sans text-brand-ink/70">
              Anúncios (Plano Gratuito)
            </p>
            <p className="text-lg font-bold text-brand-ink mt-1">
              {metrics.adImpressionsCount} imp. · {metrics.adClicksCount} cliques
            </p>
            <p className="text-[11px] font-sans text-brand-link mt-0.5">
              CTR: {metrics.adCtrPercent}% · Est. {formatBRLFromCents(metrics.estimatedAdRevenueCents)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-brand-primary/10">
            <p className="text-[11px] font-sans text-brand-ink/70">
              Assinaturas / Faturas Pagas
            </p>
            <p className="text-lg font-bold text-brand-ink mt-1">
              {metrics.newSubscriptionsCount} assinaturas
            </p>
            <p className="text-[11px] font-sans text-emerald-700 mt-0.5">
              {metrics.paidInvoicesCount} faturas pagas
            </p>
          </div>
        </div>
      )}

      {/* Plans Configuration Table */}
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4">
        <div>
          <p className="text-xs font-semibold text-brand-link">
            1. Planos Configuráveis no Banco (Valores em Centavos)
          </p>
          <h2 className="font-display font-bold text-lg text-brand-ink">
            Matriz de Planos, Limites Mensais e Bônus Moderado de Matching
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-brand-primary/10 text-brand-ink/70">
                <th className="py-2.5 pr-4">Plano</th>
                <th className="py-2.5 pr-4">Mensal</th>
                <th className="py-2.5 pr-4">Anual</th>
                <th className="py-2.5 pr-4">Limite Oport./Mês</th>
                <th className="py-2.5 pr-4">Bônus Matching</th>
                <th className="py-2.5 pr-4">Anúncios no Painel</th>
                <th className="py-2.5 pr-4">Status</th>
                <th className="py-2.5 pr-4">Receita Mensal Ativa</th>
                <th className="py-2.5 pr-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-primary/10 font-mono">
              {plansList.map((p: any) => (
                <tr key={p.id}>
                  <td className="py-3 pr-4 font-sans font-semibold text-brand-ink">
                    {p.nome} ({p.slug})
                  </td>
                  <td className="py-3 pr-4">
                    {formatBRLFromCents(p.precoMensalCentavos)}
                  </td>
                  <td className="py-3 pr-4">
                    {formatBRLFromCents(p.precoAnualCentavos)}
                  </td>
                  <td className="py-3 pr-4">
                    {p.limiteOportunidadesMensal} / mês
                  </td>
                  <td className="py-3 pr-4">+{p.prioridadeMatching} pts</td>
                  <td className="py-3 pr-4">
                    {p.exibeAnuncios ? 'Sim (Moderado)' : 'Não'}
                  </td>
                  <td className="py-3 pr-4 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.ativo !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {p.ativo !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-bold text-brand-link">
                    {formatBRLFromCents(metrics?.revenueByPlan?.[p.slug] || 0)}
                  </td>
                  <td className="py-3 pr-2 font-sans">
                    <button
                      type="button"
                      onClick={() => handleStartEditPlan(p)}
                      className="px-3 py-1.5 rounded-lg bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold text-[11px] cursor-pointer"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {planSaveFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              planSaveFeedback.startsWith('Erro')
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            }`}
          >
            {planSaveFeedback}
          </div>
        )}

        {editingPlanId && (
          <form
            onSubmit={handleSavePlanEdit}
            className="p-5 rounded-2xl bg-brand-background/70 border border-brand-primary/15 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-brand-ink">
                Editar Plano ({editingPlanId})
              </h3>
              <button
                type="button"
                onClick={() => setEditingPlanId(null)}
                className="text-brand-ink/70 hover:text-brand-ink font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">Nome</label>
                <input
                  type="text"
                  required
                  value={planEditForm.nome}
                  onChange={(e) =>
                    setPlanEditForm((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  Preço Mensal (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={planEditForm.precoMensalReais}
                  onChange={(e) =>
                    setPlanEditForm((prev) => ({
                      ...prev,
                      precoMensalReais: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 bg-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  Preço Anual (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={planEditForm.precoAnualReais}
                  onChange={(e) =>
                    setPlanEditForm((prev) => ({
                      ...prev,
                      precoAnualReais: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 bg-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  Limite Oport./Mês
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={planEditForm.limiteOportunidadesMensal}
                  onChange={(e) =>
                    setPlanEditForm((prev) => ({
                      ...prev,
                      limiteOportunidadesMensal: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 bg-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  Bônus Matching (0–12)
                </label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  required
                  value={planEditForm.prioridadeMatching}
                  onChange={(e) =>
                    setPlanEditForm((prev) => ({
                      ...prev,
                      prioridadeMatching: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 bg-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-brand-ink block">
                  Rótulo de Prioridade
                </label>
                <select
                  value={planEditForm.prioridadeLabel}
                  onChange={(e) =>
                    setPlanEditForm((prev) => ({
                      ...prev,
                      prioridadeLabel: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 bg-white"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Leve">Leve</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="font-semibold text-brand-ink block">
                  Selo Oficial do Plano
                </label>
                <input
                  type="text"
                  value={planEditForm.selo}
                  onChange={(e) =>
                    setPlanEditForm((prev) => ({ ...prev, selo: e.target.value }))
                  }
                  placeholder="Ex: Top Recontrate (opcional)"
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-brand-ink block">
                Descrição comercial do plano
              </label>
              <input
                type="text"
                required
                value={planEditForm.descricao}
                onChange={(e) =>
                  setPlanEditForm((prev) => ({
                    ...prev,
                    descricao: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 bg-white"
              />
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              {(
                [
                  ['ativo', 'Plano Ativo'],
                  ['exibeAnuncios', 'Exibe anúncios no painel'],
                  ['permiteDestaque', 'Permite destaque'],
                  ['permiteRelatoriosAvancados', 'Relatórios avançados'],
                  ['permitePortfolioIlimitado', 'Portfólio ilimitado'],
                  ['suportePrioritario', 'Suporte prioritário'],
                ] as const
              ).map(([field, label]) => (
                <label
                  key={field}
                  className="inline-flex items-center gap-2 cursor-pointer text-brand-ink"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(planEditForm[field])}
                    onChange={(e) =>
                      setPlanEditForm((prev) => ({
                        ...prev,
                        [field]: e.target.checked,
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPlanId(null)}
                className="px-4 py-2 rounded-xl bg-white border border-brand-primary/15 text-brand-ink font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={planSaveLoading}
                className="px-5 py-2 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-semibold cursor-pointer disabled:opacity-60"
              >
                {planSaveLoading ? 'Salvando...' : 'Salvar alterações do plano'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* CRUD Administrativo de Anúncios + Relatório de Impressões, Cliques, CTR e Receita Estimada */}
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-brand-primary/10 pb-4">
          <div>
            <p className="text-xs font-semibold text-brand-accent-strong">
              2. Administrador de Anúncios Moderados (Exclusivo Plano Gratuito · Painel do Prestador)
            </p>
            <h2 className="font-display font-bold text-lg text-brand-ink">
              CRUD de Anúncios e Relatório de Impressões, Cliques, CTR e Receita Estimada
            </h2>
            <p className="text-xs text-brand-ink/70 mt-0.5">
              Limites ativos: máx. 1 banner por sessão · máx. 3 impressões/prestador/dia · 0 anúncios no fluxo do cliente · Selo obrigatório &quot;Patrocinado&quot;.
            </p>
          </div>

          {adsReport && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-brand-background px-4 py-2.5 rounded-2xl">
              <span>
                <strong>Impressões:</strong> {adsReport.totalImpressions}
              </span>
              <span>·</span>
              <span>
                <strong>Cliques:</strong> {adsReport.totalClicks}
              </span>
              <span>·</span>
              <span>
                <strong>CTR:</strong> {adsReport.ctrPercent}%
              </span>
              <span>·</span>
              <span className="text-brand-link font-bold">
                Receita Est.: {formatBRLFromCents(adsReport.estimatedRevenueCents)}
              </span>
            </div>
          )}
        </div>

        {/* Configuração Google AdSense & ads.txt (Modo Híbrido / NPA=1) */}
        <form
          onSubmit={handleSaveGoogleAdsConfig}
          className="bg-brand-primary/5 rounded-2xl p-4 border border-brand-primary/10 space-y-3 text-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-brand-ink">
                Integração Google AdSense / Google Ad Manager (NPA=1 · Auto Ads Desativado)
              </p>
              <p className="text-[11px] text-brand-ink/70 font-mono">
                ads.txt ativo: {adsReport?.googleAdSense?.adsTxtLine || 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold">
              requestNonPersonalizedAds = 1 (LGPD)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
            <input
              type="text"
              placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              value={googleForm.clientId}
              onChange={(e) =>
                setGoogleForm((prev) => ({ ...prev, clientId: e.target.value }))
              }
              className="px-3 py-2 rounded-xl border border-brand-primary/15 bg-white font-mono"
            />
            <input
              type="text"
              placeholder="Slot ID (ex: 1234567890)"
              value={googleForm.slotId}
              onChange={(e) =>
                setGoogleForm((prev) => ({ ...prev, slotId: e.target.value }))
              }
              className="px-3 py-2 rounded-xl border border-brand-primary/15 bg-white font-mono"
            />
            <select
              aria-label="Modo de exibição Google AdSense"
              value={googleForm.mode}
              onChange={(e) =>
                setGoogleForm((prev) => ({ ...prev, mode: e.target.value }))
              }
              className="px-3 py-2 rounded-xl border border-brand-primary/15 bg-white"
            >
              <option value="hibrido_google_adsense">
                Modo Híbrido (Direto + Google Backfill)
              </option>
              <option value="google_adsense_preferencial">
                Google AdSense Preferencial
              </option>
              <option value="direto_apenas">
                Apenas Anunciantes Diretos
              </option>
            </select>
            <button
              type="submit"
              className="min-h-[38px] px-4 py-2 rounded-xl bg-brand-link hover:bg-brand-link text-white font-semibold cursor-pointer"
            >
              Salvar Google AdSense &amp; ads.txt
            </button>
          </div>

          {googleFeedback && (
            <p className="text-xs font-semibold text-brand-link">
              ✓ {googleFeedback}
            </p>
          )}
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulário de Criação/Agendamento */}
          <form
            onSubmit={handleCreateAd}
            className="lg:col-span-5 bg-brand-background/60 rounded-2xl p-4 border border-brand-primary/10 space-y-3 text-xs"
          >
            <p className="font-semibold text-brand-ink">
              Criar e Agendar Novo Anúncio Patrocinado
            </p>
            <input
              type="text"
              required
              placeholder="Título (ex: Alicate Amperímetro NR-10)"
              value={adForm.nome}
              onChange={(e) =>
                setAdForm((prev) => ({ ...prev, nome: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Categoria do anúncio"
                value={adForm.categoria}
                onChange={(e) =>
                  setAdForm((prev) => ({ ...prev, categoria: e.target.value }))
                }
                className="px-3 py-2 rounded-xl border border-brand-primary/15 bg-white"
              >
                <option value="ferramentas">Ferramentas</option>
                <option value="materiais">Materiais</option>
                <option value="epis">EPIs</option>
                <option value="cursos">Cursos Técnicos</option>
                <option value="seguros">Seguros Profissionais</option>
                <option value="maquininhas">Maquininhas</option>
                <option value="credito_empresarial">Crédito Empresarial</option>
                <option value="fornecedores_locais">Fornecedores Locais</option>
              </select>
              <select
                aria-label="Tipo de slot do anúncio"
                value={adForm.tipo}
                onChange={(e) =>
                  setAdForm((prev) => ({
                    ...prev,
                    tipo: e.target.value as any,
                  }))
                }
                className="px-3 py-2 rounded-xl border border-brand-primary/15 bg-white"
              >
                <option value="banner_painel_prestador">
                  Banner Painel Prestador
                </option>
                <option value="card_oferta">Card Oferta</option>
                <option value="banner_perfil_prestador">
                  Banner Perfil Prestador
                </option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Nome do anunciante"
                value={adForm.anunciante}
                onChange={(e) =>
                  setAdForm((prev) => ({ ...prev, anunciante: e.target.value }))
                }
                className="px-3 py-2 rounded-xl border border-brand-primary/15 bg-white"
              />
              <input
                type="number"
                min={1}
                max={100}
                placeholder="Prioridade (1-100)"
                value={adForm.prioridade}
                onChange={(e) =>
                  setAdForm((prev) => ({
                    ...prev,
                    prioridade: Number(e.target.value),
                  }))
                }
                className="px-3 py-2 rounded-xl border border-brand-primary/15 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[11px] text-brand-ink/70">Início</span>
                <input
                  type="date"
                  value={adForm.dataInicio}
                  onChange={(e) =>
                    setAdForm((prev) => ({
                      ...prev,
                      dataInicio: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-brand-primary/15 bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-brand-ink/70">Fim</span>
                <input
                  type="date"
                  value={adForm.dataFim}
                  onChange={(e) =>
                    setAdForm((prev) => ({ ...prev, dataFim: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-brand-primary/15 bg-white"
                />
              </label>
            </div>
            <textarea
              rows={2}
              required
              placeholder="Texto relevante para o profissional autônomo..."
              value={adForm.texto}
              onChange={(e) =>
                setAdForm((prev) => ({ ...prev, texto: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl border border-brand-primary/15 bg-white"
            />
            {adFeedback && (
              <p className="text-xs font-semibold text-brand-link">
                {adFeedback}
              </p>
            )}
            <button
              type="submit"
              className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold cursor-pointer"
            >
              Validar Diretrizes e Publicar Anúncio
            </button>
          </form>

          {/* Tabela de Anúncios e Métricas por Slot */}
          <div className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-primary/10 text-brand-ink/70">
                  <th className="py-2 pr-3">Anúncio / Selo</th>
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Imp. / Cliques</th>
                  <th className="py-2 pr-3">CTR</th>
                  <th className="py-2 pr-3">Receita Est.</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-primary/10 font-mono">
                {(adsReport?.ads || []).map((ad: any) => (
                  <tr key={ad.id}>
                    <td className="py-3 pr-3 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-ink font-mono text-[10px] font-bold">
                          {ad.badge || 'Patrocinado'}
                        </span>
                        <span className="font-semibold text-brand-ink">
                          {ad.nome}
                        </span>
                      </div>
                      <p className="text-[11px] text-brand-ink/65">
                        {ad.anunciante}
                      </p>
                    </td>
                    <td className="py-3 pr-3">{ad.categoria}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ad.status === 'ativo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ad.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      {ad.impressoes} / {ad.cliques}
                    </td>
                    <td className="py-3 pr-3">{ad.ctrPercent ?? 0}%</td>
                    <td className="py-3 pr-3 font-bold text-brand-link">
                      {formatBRLFromCents(ad.receitaEstimadaCentavos || 0)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleAdStatus(ad)}
                          title={
                            ad.status === 'ativo'
                              ? 'Pausar anúncio'
                              : 'Ativar anúncio'
                          }
                          className="p-1.5 rounded-lg bg-brand-background hover:bg-brand-surface-hover text-brand-ink cursor-pointer"
                        >
                          {ad.status === 'ativo' ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAd(ad)}
                          title="Remover anúncio"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Subscriptions Audit */}
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-brand-link">
              3. Assinaturas & Ciclo de Vida
            </p>
            <h2 className="font-display font-bold text-lg text-brand-ink">
              Busca por Prestador, Plano e Status ({filteredSubscriptions.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Buscar prestador ou plano..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-brand-primary/15 text-xs"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-brand-primary/15 text-xs bg-white"
            >
              <option value="todos">Todos os status</option>
              <option value="ativa">Ativa</option>
              <option value="pendente">Pendente</option>
              <option value="inadimplente">Inadimplente (Tolerância)</option>
              <option value="cancelada">Cancelada</option>
              <option value="expirada">Expirada</option>
            </select>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-brand-primary/10 text-xs">
          {filteredSubscriptions.slice(0, 12).map((s: any) => (
            <div
              key={s.id}
              className="py-2.5 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <p className="font-semibold text-brand-ink">
                  Prestador: {s.providerProfileId} · Plano: {s.planId}
                </p>
                <p className="text-brand-ink/65 font-mono">
                  ID: {s.id} · Ciclo: {s.ciclo}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-brand-background font-mono font-semibold text-brand-ink">
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Aprovação de Cadastros de Prestadores */}
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4">
        <div>
          <p className="text-xs font-semibold text-brand-accent-strong">
            4. Governança Operacional · Curadoria de Prestadores
          </p>
          <h2 className="font-display font-bold text-lg text-brand-ink">
            Aprovação de Cadastros e Verificação Documental ({providersRegistry.length})
          </h2>
        </div>

        <div className="divide-y divide-brand-primary/10 text-xs">
          {providersRegistry.slice(0, 12).map((prov: any) => (
            <div
              key={prov.id}
              className="py-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-brand-ink">
                  {prov.name} ({prov.category}) — {prov.city}
                </p>
                <p className="text-brand-ink/65 font-mono">
                  ID: {prov.id} · Nota: {prov.rating_avg} · Status:{' '}
                  <strong>{prov.verification_status}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/admin/providers/${prov.id}/verify`, {
                      method: 'PATCH',
                      credentials: 'include',
                      headers: buildAdminHeaders(true),
                      body: JSON.stringify({ decision: 'aprovado' }),
                    });
                    loadAdminDashboard();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                >
                  Aprovar Cadastro
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/admin/providers/${prov.id}/verify`, {
                      method: 'PATCH',
                      credentials: 'include',
                      headers: buildAdminHeaders(true),
                      body: JSON.stringify({ decision: 'rejeitado' }),
                    });
                    loadAdminDashboard();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-semibold cursor-pointer"
                >
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Infraestrutura de Produção: Disponibilidade, Backups e Alertas */}
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-brand-link">
              5. Infraestrutura de Produção · Neon Lakebase + Object Storage
            </p>
            <h2 className="font-display font-bold text-lg text-brand-ink">
              Disponibilidade, Backups e Alertas
            </h2>
          </div>

          <button
            type="button"
            disabled={backupLoading}
            onClick={async () => {
              setBackupLoading(true);
              setBackupError('');
              try {
                const res = await fetch('/api/admin/backups/snapshot', {
                  method: 'POST',
                  credentials: 'include',
                  headers: buildAdminHeaders(true),
                });
                const body = await res.json();
                if (!res.ok || !body.ok) {
                  setBackupError(body.error || 'Falha ao gerar backup.');
                } else {
                  setBackupResult(body.backup);
                }
              } catch (err) {
                setBackupError((err as Error).message);
              } finally {
                setBackupLoading(false);
              }
            }}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
          >
            {backupLoading
              ? 'Gerando Snapshot...'
              : 'Gerar Backup Agora (Neon Object Storage)'}
          </button>
        </div>

        {systemHealth && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-brand-background/60 border border-brand-primary/10">
              <p className="text-brand-ink/65">Status (/api/health)</p>
              <p className="font-bold text-emerald-700 mt-1 uppercase">
                {systemHealth.status}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand-background/60 border border-brand-primary/10">
              <p className="text-brand-ink/65">Latência PostgreSQL</p>
              <p className="font-mono font-bold text-brand-ink mt-1">
                {systemHealth.dbLatencyMs} ms
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand-background/60 border border-brand-primary/10">
              <p className="text-brand-ink/65">Tabelas com RLS Ativo</p>
              <p className="font-mono font-bold text-brand-ink mt-1">
                {systemHealth.rlsProtectedTablesCount}/
                {systemHealth.expectedRlsTablesCount}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand-background/60 border border-brand-primary/10">
              <p className="text-brand-ink/65">Ambiente / Branch</p>
              <p className="font-mono font-bold text-brand-ink mt-1">
                {systemHealth.environment} ({systemHealth.branch})
              </p>
            </div>
          </div>
        )}

        {backupError && (
          <p className="p-3 rounded-xl bg-red-50 text-red-800 text-xs font-medium">
            {backupError}
          </p>
        )}

        {backupResult && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
            <p className="font-semibold">
              ✓ Backup snapshot armazenado no bucket privado Neon Object Storage
            </p>
            <p className="font-mono">
              Object Key: {backupResult.objectKey} · Tamanho:{' '}
              {backupResult.sizeBytes} bytes
            </p>
          </div>
        )}
      </section>

      {/* 6. Campanha de Lançamento (90 dias grátis / 3 meses) · Conversão, Cancelamento & Renovação Pós-Promoção */}
      {promoAnalytics?.campaign && (
        <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-brand-accent-strong">
                6. Campanhas Promocionais · {promoAnalytics.campaign.slug}
              </p>
              <h2 className="font-display font-bold text-lg text-brand-ink">
                {promoAnalytics.campaign.nome}
              </h2>
              <p className="text-xs text-brand-ink/70">
                Status:{' '}
                <strong className="uppercase">
                  {promoAnalytics.campaign.status}
                </strong>{' '}
                · Limite total: {promoAnalytics.campaign.limite_total_resgates}{' '}
                resgates
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={async () => {
                  setPromoFeedback('');
                  const nextStatus =
                    promoAnalytics.campaign.status === 'ativo'
                      ? 'pausado'
                      : 'ativo';
                  const res = await fetch(
                    `/api/admin/promotions/${promoAnalytics.campaign.id}`,
                    {
                      method: 'PATCH',
                      credentials: 'include',
                      headers: buildAdminHeaders(true),
                      body: JSON.stringify({ status: nextStatus }),
                    }
                  );
                  if (res.ok) {
                    setPromoFeedback(
                      `Campanha atualizada para status "${nextStatus}".`
                    );
                    loadAdminDashboard();
                  }
                }}
                className="min-h-[38px] px-3.5 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold cursor-pointer"
              >
                {promoAnalytics.campaign.status === 'ativo'
                  ? 'Pausar Campanha'
                  : 'Reativar Campanha'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setPromoFeedback('');
                  const res = await fetch('/api/admin/promotions/notify-ending', {
                    method: 'POST',
                    credentials: 'include',
                    headers: buildAdminHeaders(true),
                    body: JSON.stringify({ daysBeforeEnd: 7 }),
                  });
                  const body = await res.json();
                  if (res.ok && body.ok) {
                    setPromoFeedback(
                      `Avisos de término (E-mail + WhatsApp) disparados para ${body.sentCount} prestador(es) no 3º ciclo.`
                    );
                  }
                }}
                className="min-h-[38px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold cursor-pointer"
              >
                Disparar Avisos de Término (E-mail + WhatsApp)
              </button>
            </div>
          </div>

          {promoFeedback && (
            <p className="p-3 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-medium">
              {promoFeedback}
            </p>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono tabular-nums">
            <div className="p-3.5 rounded-2xl bg-brand-background/60 border border-brand-primary/10">
              <p className="font-sans text-brand-ink/65">Resgates Totais</p>
              <p className="text-lg font-bold text-brand-ink mt-1">
                {promoAnalytics.metrics.totalRedemptions}
              </p>
              <p className="font-sans text-[11px] text-brand-ink/60">
                Ativos na promo: {promoAnalytics.metrics.activeInPromoCount}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand-background/60 border border-brand-primary/10">
              <p className="font-sans text-brand-ink/65">Conversão da Oferta</p>
              <p className="text-lg font-bold text-emerald-700 mt-1">
                {promoAnalytics.metrics.conversionRatePercent}%
              </p>
              <p className="font-sans text-[11px] text-brand-ink/60">
                Elegíveis: {promoAnalytics.metrics.eligibleChecksCount}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand-background/60 border border-brand-primary/10">
              <p className="font-sans text-brand-ink/65">
                Cancelamentos na Promo
              </p>
              <p className="text-lg font-bold text-brand-accent-strong mt-1">
                {promoAnalytics.metrics.cancelDuringPromoRatePercent}%
              </p>
              <p className="font-sans text-[11px] text-brand-ink/60">
                Cancelados: {promoAnalytics.metrics.canceledDuringPromoCount}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand-background/60 border border-brand-primary/10">
              <p className="font-sans text-brand-ink/65">
                Renovação Pós-Promoção
              </p>
              <p className="text-lg font-bold text-brand-link mt-1">
                {promoAnalytics.metrics.postPromoRenewalRatePercent}%
              </p>
              <p className="font-sans text-[11px] text-brand-ink/60">
                No preço cheio: {promoAnalytics.metrics.renewedAfterPromoCount}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand-background/60 border border-brand-primary/10">
              <p className="font-sans text-brand-ink/65">
                Bloqueios Antifraude
              </p>
              <p className="text-lg font-bold text-red-700 mt-1">
                {promoAnalytics.metrics.blockedFraudCount}
              </p>
              <p className="font-sans text-[11px] text-brand-ink/60">
                Multi-conta / reuso
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 7. Moderação de Especialidades Sugeridas & Tags Livres */}
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-5 text-xs">
        <div>
          <p className="font-semibold text-brand-link">
            7. Governança de Taxonomia · Catálogo Oficial
          </p>
          <h2 className="font-display font-bold text-lg text-brand-ink">
            Moderação de Especialidades Sugeridas ({taxonomyQueue.suggestions.length})
          </h2>
        </div>

        {taxonomyFeedback && (
          <p className="p-3 rounded-xl bg-emerald-50 text-emerald-900 font-medium">
            {taxonomyFeedback}
          </p>
        )}

        {taxonomyQueue.suggestions.length === 0 ? (
          <p className="text-brand-ink/60">
            Nenhuma sugestão de especialidade registrada no momento.
          </p>
        ) : (
          <div className="space-y-3">
            {taxonomyQueue.suggestions.map((sug: any) => (
              <div
                key={sug.id}
                className="p-4 rounded-2xl bg-brand-background/50 border border-brand-primary/10 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm text-brand-ink">
                      {sug.nome_sugerido}
                    </p>
                    <p className="text-brand-ink/70">
                      Prestador: <strong>{sug.provider_name}</strong> · Categoria:{' '}
                      <strong>{sug.category_name}</strong> · Frequência:{' '}
                      <strong>{sug.similar_frequency} pedido(s)</strong>
                    </p>
                    {sug.descricao && (
                      <p className="text-brand-ink/75 italic mt-1">
                        “{sug.descricao}”
                      </p>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white border border-brand-primary/10 font-mono font-semibold">
                    {sug.status}
                  </span>
                </div>

                {sug.status === 'pendente' && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-primary/10">
                    <button
                      type="button"
                      onClick={async () => {
                        setTaxonomyFeedback('');
                        const res = await fetch(
                          `/api/admin/taxonomy/suggestions/${sug.id}/moderate`,
                          {
                            method: 'POST',
                            credentials: 'include',
                            headers: buildAdminHeaders(true),
                            body: JSON.stringify({ decision: 'aprovar_nova' }),
                          }
                        );
                        const body = await res.json();
                        if (res.ok && body.ok) {
                          setTaxonomyFeedback(
                            `"${sug.nome_sugerido}" aprovada como nova especialidade oficial!`
                          );
                          loadAdminDashboard();
                        } else {
                          setTaxonomyFeedback(body.error || 'Erro ao aprovar.');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                    >
                      Aprovar como Nova Oficial
                    </button>

                    <select
                      value={
                        mergeTargets[sug.id] ||
                        officialSpecialtiesCatalog[0]?.id ||
                        ''
                      }
                      onChange={(e) =>
                        setMergeTargets((prev) => ({
                          ...prev,
                          [sug.id]: e.target.value,
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-brand-primary/15 bg-white"
                    >
                      {officialSpecialtiesCatalog.map((sp: any) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.nome} ({sp.category_name})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={async () => {
                        setTaxonomyFeedback('');
                        const targetId =
                          mergeTargets[sug.id] ||
                          officialSpecialtiesCatalog[0]?.id;
                        const res = await fetch(
                          `/api/admin/taxonomy/suggestions/${sug.id}/moderate`,
                          {
                            method: 'POST',
                            credentials: 'include',
                            headers: buildAdminHeaders(true),
                            body: JSON.stringify({
                              decision: 'aprovar_sinonimo',
                              targetSpecialtyId: targetId,
                            }),
                          }
                        );
                        if (res.ok) {
                          setTaxonomyFeedback(
                            `"${sug.nome_sugerido}" vinculada como sinônimo oficial.`
                          );
                          loadAdminDashboard();
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-link text-white font-semibold cursor-pointer"
                    >
                      Mesclar / Sinônimo
                    </button>

                    <input
                      type="text"
                      placeholder="Motivo da reprovação/correção..."
                      value={rejectionReasons[sug.id] || ''}
                      onChange={(e) =>
                        setRejectionReasons((prev) => ({
                          ...prev,
                          [sug.id]: e.target.value,
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-brand-primary/15 bg-white"
                    />

                    <button
                      type="button"
                      onClick={async () => {
                        setTaxonomyFeedback('');
                        const reason =
                          rejectionReasons[sug.id] ||
                          'Fora do padrão da categoria informada.';
                        const res = await fetch(
                          `/api/admin/taxonomy/suggestions/${sug.id}/moderate`,
                          {
                            method: 'POST',
                            credentials: 'include',
                            headers: buildAdminHeaders(true),
                            body: JSON.stringify({
                              decision: 'reprovar',
                              motivoRejeicao: reason,
                            }),
                          }
                        );
                        if (res.ok) {
                          setTaxonomyFeedback(
                            `Sugestão "${sug.nome_sugerido}" reprovada com aviso ao prestador.`
                          );
                          loadAdminDashboard();
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-semibold cursor-pointer"
                    >
                      Reprovar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. PROGRAMA DE INDICAÇÃO DE PROFISSIONAIS (+15 DIAS GRÁTIS) */}
      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-brand-link">
              Aquisição Orgânica · +15 Dias (Indicador) e +10 Dias (Indicado)
            </p>
            <h2 className="font-display font-bold text-lg text-brand-ink">
              Métricas Globais de Indicação de Profissionais
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            Exclusivo para usuários cadastrados
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-brand-background/70">
            <p className="text-brand-ink/60 font-medium">Códigos Ativos</p>
            <p className="font-mono font-bold text-lg text-brand-ink mt-1">
              {referralAnalytics?.metrics?.totalCodesGenerated ?? 0}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-brand-background/70">
            <p className="text-brand-ink/60 font-medium">Cliques nos Links</p>
            <p className="font-mono font-bold text-lg text-brand-ink mt-1">
              {referralAnalytics?.metrics?.clicksCount ?? 0}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <p className="text-emerald-800 font-medium">Indicações Validadas</p>
            <p className="font-mono font-bold text-lg text-emerald-700 mt-1">
              {referralAnalytics?.metrics?.validatedReferrals ?? 0}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-brand-background/70">
            <p className="text-brand-ink/60 font-medium">Taxa de Conversão</p>
            <p className="font-mono font-bold text-lg text-brand-primary mt-1">
              {referralAnalytics?.metrics?.conversionRatePercent ?? 0}%
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-brand-background/70">
            <p className="text-brand-ink/60 font-medium">Dias Grátis Concedidos</p>
            <p className="font-mono font-bold text-lg text-brand-accent-strong mt-1">
              +{referralAnalytics?.metrics?.totalFreeDaysEarned ?? 0} dias
            </p>
            <p className="text-[11px] text-brand-ink/65 mt-0.5">
              +{referralAnalytics?.metrics?.totalReferredBonusDays ?? 0}d bônus indicados
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-brand-background/70">
            <p className="text-brand-ink/60 font-medium">Dias já Aplicados</p>
            <p className="font-mono font-bold text-lg text-brand-ink mt-1">
              {referralAnalytics?.metrics?.appliedFreeDays ?? 0} dias
            </p>
          </div>
        </div>

        {(referralAnalytics?.topReferrers || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-primary/10 text-brand-ink/70">
                  <th className="py-2 pr-4 font-semibold">Usuário Indicador</th>
                  <th className="py-2 px-3 font-semibold">Código</th>
                  <th className="py-2 px-3 font-semibold">Prestadores Validados</th>
                  <th className="py-2 pl-3 font-semibold">Dias Grátis Ganhos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-primary/10">
                {referralAnalytics.topReferrers.map((item: any) => (
                  <tr key={item.userId}>
                    <td className="py-2.5 pr-4 font-semibold text-brand-ink">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-brand-primary">
                      {item.code}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {item.validatedCount}
                    </td>
                    <td className="py-2.5 pl-3 font-mono font-bold text-emerald-700">
                      +{item.totalDaysGranted} dias
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-brand-ink/65">
            Ainda não há indicações registradas no programa. Assim que usuários cadastrados compartilharem seus códigos, o ranking e métricas aparecerão aqui.
          </p>
        )}
      </section>
    </div>
  );
};
