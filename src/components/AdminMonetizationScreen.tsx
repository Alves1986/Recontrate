import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  DollarSign,
  FileText,
  Megaphone,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users,
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
  const [plansList, setPlansList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [adForm, setAdForm] = useState({
    nome: '',
    categoria: 'ferramentas',
    anunciante: '',
    texto: '',
    linkDestino: 'https://fornecedores.confiare.com.br',
    imagemUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758',
  });
  const [adFeedback, setAdFeedback] = useState('');

  const loadAdminDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'x-user-role': 'admin' };
      const [mRes, sRes, pRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }).then((r) => r.json()),
        fetch('/api/admin/subscriptions', { headers }).then((r) => r.json()),
        fetch('/api/plans').then((r) => r.json()),
      ]);
      if (mRes.ok) setMetrics(mRes.metrics);
      if (sRes.ok) setAdminData(sRes);
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
          tipo: 'banner_painel_prestador',
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
            Painel Administrativo — Monetização, Assinaturas e Anúncios
          </h1>
          <p className="text-xs sm:text-sm text-white/80">
            Métricas de MRR, ARR, churn, conversão, auditoria de webhooks idempotentes, limites por plano e publicidade moderada.
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

      {/* Subscriptions & Webhook Events Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#0A2540]/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#1D6FE0]">
                2. Assinaturas & Ciclo de Vida
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

        {/* Moderated Ad Slot Creator */}
        <section className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#0A2540]/10 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#FF6A00]">
              3. Administrador de Anúncios Moderados
            </p>
            <h2 className="font-display font-bold text-lg text-[#0A2540]">
              Cadastrar Patrocínio para Painel Gratuito
            </h2>
            <p className="text-xs text-[#0A2540]/70">
              Bloqueio automático de apostas, empréstimos predatórios, conteúdo adulto e concorrentes. Zero exibição para clientes.
            </p>
          </div>

          <form onSubmit={handleCreateAd} className="space-y-3 text-xs">
            <input
              type="text"
              required
              placeholder="Título da oferta (ex: Alicate Amperímetro NR-10)"
              value={adForm.nome}
              onChange={(e) =>
                setAdForm((prev) => ({ ...prev, nome: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl border border-[#0A2540]/15"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
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
              <input
                type="text"
                required
                placeholder="Nome do anunciante"
                value={adForm.anunciante}
                onChange={(e) =>
                  setAdForm((prev) => ({ ...prev, anunciante: e.target.value }))
                }
                className="px-3 py-2 rounded-xl border border-[#0A2540]/15"
              />
            </div>
            <textarea
              rows={2}
              required
              placeholder="Texto relevante para o profissional autônomo..."
              value={adForm.texto}
              onChange={(e) =>
                setAdForm((prev) => ({ ...prev, texto: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl border border-[#0A2540]/15"
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
        </section>
      </div>
    </div>
  );
};
