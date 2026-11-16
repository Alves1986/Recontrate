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

export const AdminMonetizationScreen: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [adminData, setAdminData] = useState<any>(null);
  const [adsReport, setAdsReport] = useState<any>(null);
  const [plansList, setPlansList] = useState<any[]>([]);
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
    linkDestino: 'https://fornecedores.confiare.com.br',
    imagemUrl:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758',
    prioridade: 5,
    dataInicio: new Date().toISOString().slice(0, 10),
    dataFim: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  });
  const [adFeedback, setAdFeedback] = useState('');
  const [googleForm, setGoogleForm] = useState({
    enabled: true,
    mode: 'hibrido_google_adsense',
    clientId: 'ca-pub-0000000000000000',
    slotId: '1234567890',
  });
  const [googleFeedback, setGoogleFeedback] = useState('');

  const loadAdminDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'x-user-role': 'admin' };
      const [mRes, sRes, aRes, pRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }).then((r) => r.json()),
        fetch('/api/admin/subscriptions', { headers }).then((r) => r.json()),
        fetch('/api/admin/ads', { headers }).then((r) => r.json()),
        fetch('/api/plans').then((r) => r.json()),
      ]);
      if (mRes.ok) setMetrics(mRes.metrics);
      if (sRes.ok) setAdminData(sRes);
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
  }, []);

  useEffect(() => {
    loadAdminDashboard();
  }, [loadAdminDashboard]);

  const handleSaveGoogleAdsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleFeedback('');
    try {
      const res = await fetch('/api/admin/ads/google-config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
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
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
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
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
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
        headers: { 'x-user-role': 'admin' },
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
      <div className="bg-[#0A2540] text-white rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#FF6A00]">
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
          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer self-start lg:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Indicadores</span>
        </button>
      </div>

      {/* KPI Strip */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 font-mono tabular-nums">
          <div className="bg-white rounded-2xl p-4 border border-[#0A2540]/10">
            <p className="text-[11px] font-sans text-[#0A2540]/70">MRR (Mensal)</p>
            <p className="text-lg font-bold text-[#0A2540] mt-1">
              {formatBRLFromCents(metrics.mrrCentavos)}
            </p>
            <p className="text-[11px] font-sans text-[#1D6FE0] mt-0.5">
              ARR: {formatBRLFromCents(metrics.arrCentavos)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#0A2540]/10">
            <p className="text-[11px] font-sans text-[#0A2540]/70">
              Renovação / Churn
            </p>
            <p className="text-lg font-bold text-emerald-700 mt-1">
              {metrics.renewalRatePercent}%
            </p>
            <p className="text-[11px] font-sans text-[#0A2540]/70 mt-0.5">
              Churn: {metrics.churnMonthlyPercent}%
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#0A2540]/10">
            <p className="text-[11px] font-sans text-[#0A2540]/70">
              Conversão Gratuito → Pago
            </p>
            <p className="text-lg font-bold text-[#0A2540] mt-1">
              {metrics.freeToPaidConversionPercent}%
            </p>
            <p className="text-[11px] font-sans text-[#1D6FE0] mt-0.5">
              Upgrades: {metrics.upgradesCount} · Downgrades: {metrics.downgradesCount}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#0A2540]/10">
            <p className="text-[11px] font-sans text-[#0A2540]/70">
              Inadimplência & Tolerância
            </p>
            <p className="text-lg font-bold text-[#FF6A00] mt-1">
              {metrics.overdueProvidersCount} inadimplente(s)
            </p>
            <p className="text-[11px] font-sans text-[#0A2540]/70 mt-0.5">
              {metrics.gracePeriodProvidersCount} em tolerância (7 dias)
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#0A2540]/10">
            <p className="text-[11px] font-sans text-[#0A2540]/70">
              Anúncios (Plano Gratuito)
            </p>
            <p className="text-lg font-bold text-[#0A2540] mt-1">
              {metrics.adImpressionsCount} imp. · {metrics.adClicksCount} cliques
            </p>
            <p className="text-[11px] font-sans text-[#1D6FE0] mt-0.5">
              CTR: {metrics.adCtrPercent}% · Est. {formatBRLFromCents(metrics.estimatedAdRevenueCents)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#0A2540]/10">
            <p className="text-[11px] font-sans text-[#0A2540]/70">
              Assinaturas / Faturas Pagas
            </p>
            <p className="text-lg font-bold text-[#0A2540] mt-1">
              {metrics.newSubscriptionsCount} assinaturas
            </p>
            <p className="text-[11px] font-sans text-emerald-700 mt-0.5">
              {metrics.paidInvoicesCount} faturas pagas
            </p>
          </div>
        </div>
      )}

      {/* Plans Configuration Table */}
      <section className="bg-white rounded-3xl p-6 border border-[#0A2540]/10 space-y-4">
        <div>
          <p className="text-xs font-semibold text-[#1D6FE0]">
            1. Planos Configuráveis no Banco (Valores em Centavos)
          </p>
          <h2 className="font-display font-bold text-lg text-[#0A2540]">
            Matriz de Planos, Limites Mensais e Bônus Moderado de Matching
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#0A2540]/10 text-[#0A2540]/70">
                <th className="py-2.5 pr-4">Plano</th>
                <th className="py-2.5 pr-4">Mensal</th>
                <th className="py-2.5 pr-4">Anual</th>
                <th className="py-2.5 pr-4">Limite Oport./Mês</th>
                <th className="py-2.5 pr-4">Bônus Matching</th>
                <th className="py-2.5 pr-4">Anúncios no Painel</th>
                <th className="py-2.5 pr-4">Receita Mensal Ativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0A2540]/10 font-mono">
              {plansList.map((p: any) => (
                <tr key={p.id}>
                  <td className="py-3 pr-4 font-sans font-semibold text-[#0A2540]">
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
                  <td className="py-3 pr-4 font-bold text-[#1D6FE0]">
                    {formatBRLFromCents(metrics?.revenueByPlan?.[p.slug] || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CRUD Administrativo de Anúncios + Relatório de Impressões, Cliques, CTR e Receita Estimada */}
      <section className="bg-white rounded-3xl p-6 border border-[#0A2540]/10 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#0A2540]/10 pb-4">
          <div>
            <p className="text-xs font-semibold text-[#FF6A00]">
              2. Administrador de Anúncios Moderados (Exclusivo Plano Gratuito · Painel do Prestador)
            </p>
            <h2 className="font-display font-bold text-lg text-[#0A2540]">
              CRUD de Anúncios e Relatório de Impressões, Cliques, CTR e Receita Estimada
            </h2>
            <p className="text-xs text-[#0A2540]/70 mt-0.5">
              Limites ativos: máx. 1 banner por sessão · máx. 3 impressões/prestador/dia · 0 anúncios no fluxo do cliente · Selo obrigatório &quot;Patrocinado&quot;.
            </p>
          </div>

          {adsReport && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-[#F4F2EF] px-4 py-2.5 rounded-2xl">
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
              <span className="text-[#1D6FE0] font-bold">
                Receita Est.: {formatBRLFromCents(adsReport.estimatedRevenueCents)}
              </span>
            </div>
          )}
        </div>

        {/* Configuração Google AdSense & ads.txt (Modo Híbrido / NPA=1) */}
        <form
          onSubmit={handleSaveGoogleAdsConfig}
          className="bg-[#0A2540]/5 rounded-2xl p-4 border border-[#0A2540]/10 space-y-3 text-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-[#0A2540]">
                Integração Google AdSense / Google Ad Manager (NPA=1 · Auto Ads Desativado)
              </p>
              <p className="text-[11px] text-[#0A2540]/70 font-mono">
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
              className="px-3 py-2 rounded-xl border border-[#0A2540]/15 bg-white font-mono"
            />
            <input
              type="text"
              placeholder="Slot ID (ex: 1234567890)"
              value={googleForm.slotId}
              onChange={(e) =>
                setGoogleForm((prev) => ({ ...prev, slotId: e.target.value }))
              }
              className="px-3 py-2 rounded-xl border border-[#0A2540]/15 bg-white font-mono"
            />
            <select
              aria-label="Modo de exibição Google AdSense"
              value={googleForm.mode}
              onChange={(e) =>
                setGoogleForm((prev) => ({ ...prev, mode: e.target.value }))
              }
              className="px-3 py-2 rounded-xl border border-[#0A2540]/15 bg-white"
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
              className="min-h-[38px] px-4 py-2 rounded-xl bg-[#1D6FE0] hover:bg-[#1559b8] text-white font-semibold cursor-pointer"
            >
              Salvar Google AdSense &amp; ads.txt
            </button>
          </div>

          {googleFeedback && (
            <p className="text-xs font-semibold text-[#1D6FE0]">
              ✓ {googleFeedback}
            </p>
          )}
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulário de Criação/Agendamento */}
          <form
            onSubmit={handleCreateAd}
            className="lg:col-span-5 bg-[#F4F2EF]/60 rounded-2xl p-4 border border-[#0A2540]/10 space-y-3 text-xs"
          >
            <p className="font-semibold text-[#0A2540]">
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
              className="w-full px-3 py-2 rounded-xl border border-[#0A2540]/15 bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Categoria do anúncio"
                value={adForm.categoria}
                onChange={(e) =>
                  setAdForm((prev) => ({ ...prev, categoria: e.target.value }))
                }
                className="px-3 py-2 rounded-xl border border-[#0A2540]/15 bg-white"
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
                className="px-3 py-2 rounded-xl border border-[#0A2540]/15 bg-white"
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
                className="px-3 py-2 rounded-xl border border-[#0A2540]/15 bg-white"
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
                className="px-3 py-2 rounded-xl border border-[#0A2540]/15 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[11px] text-[#0A2540]/70">Início</span>
                <input
                  type="date"
                  value={adForm.dataInicio}
                  onChange={(e) =>
                    setAdForm((prev) => ({
                      ...prev,
                      dataInicio: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-[#0A2540]/15 bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-[#0A2540]/70">Fim</span>
                <input
                  type="date"
                  value={adForm.dataFim}
                  onChange={(e) =>
                    setAdForm((prev) => ({ ...prev, dataFim: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-[#0A2540]/15 bg-white"
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
              className="w-full px-3 py-2 rounded-xl border border-[#0A2540]/15 bg-white"
            />
            {adFeedback && (
              <p className="text-xs font-semibold text-[#1D6FE0]">
                {adFeedback}
              </p>
            )}
            <button
              type="submit"
              className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-[#0A2540] hover:bg-[#13385c] text-white font-semibold cursor-pointer"
            >
              Validar Diretrizes e Publicar Anúncio
            </button>
          </form>

          {/* Tabela de Anúncios e Métricas por Slot */}
          <div className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#0A2540]/10 text-[#0A2540]/70">
                  <th className="py-2 pr-3">Anúncio / Selo</th>
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Imp. / Cliques</th>
                  <th className="py-2 pr-3">CTR</th>
                  <th className="py-2 pr-3">Receita Est.</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0A2540]/10 font-mono">
                {(adsReport?.ads || []).map((ad: any) => (
                  <tr key={ad.id}>
                    <td className="py-3 pr-3 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#0A2540]/10 text-[#0A2540] font-mono text-[10px] font-bold">
                          {ad.badge || 'Patrocinado'}
                        </span>
                        <span className="font-semibold text-[#0A2540]">
                          {ad.nome}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#0A2540]/65">
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
                    <td className="py-3 pr-3 font-bold text-[#1D6FE0]">
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
                          className="p-1.5 rounded-lg bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540] cursor-pointer"
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
      <section className="bg-white rounded-3xl p-6 border border-[#0A2540]/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#1D6FE0]">
              3. Assinaturas & Ciclo de Vida
            </p>
            <h2 className="font-display font-bold text-lg text-[#0A2540]">
              Busca por Prestador, Plano e Status ({filteredSubscriptions.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Buscar prestador ou plano..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#0A2540]/15 text-xs"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#0A2540]/15 text-xs bg-white"
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

        <div className="max-h-72 overflow-y-auto divide-y divide-[#0A2540]/10 text-xs">
          {filteredSubscriptions.slice(0, 12).map((s: any) => (
            <div
              key={s.id}
              className="py-2.5 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <p className="font-semibold text-[#0A2540]">
                  Prestador: {s.providerProfileId} · Plano: {s.planId}
                </p>
                <p className="text-[#0A2540]/65 font-mono">
                  ID: {s.id} · Ciclo: {s.ciclo}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#F4F2EF] font-mono font-semibold text-[#0A2540]">
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
