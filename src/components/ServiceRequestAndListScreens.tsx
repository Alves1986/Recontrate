import React, { useState } from 'react';
import {
  Camera,
  Clock,
  MapPin,
  Search,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  SlidersHorizontal,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import {
  CategoryName,
  ProviderProfile,
  ScreenId,
  ServiceRequest,
} from '../types/confiare';
import { CATEGORIES_LIST } from '../data/seedData';
import { rankCompatibleProviders } from '../utils/marketplaceRules';

interface CreateServiceRequestScreenProps {
  initialCategory?: CategoryName;
  initialQuery?: string;
  initialLocation?: string;
  providers: ProviderProfile[];
  requests: ServiceRequest[];
  onCreateRequest: (req: ServiceRequest) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

export const CreateServiceRequestScreen: React.FC<CreateServiceRequestScreenProps> = ({
  initialCategory = 'Eletricista',
  initialQuery = '',
  initialLocation = 'Pinheiros',
  providers,
  requests,
  onCreateRequest,
  onNavigate,
}) => {
  const [category, setCategory] = useState<CategoryName>(initialCategory);
  const [problemTitle, setProblemTitle] = useState(
    initialQuery || 'Disjuntor do chuveiro desarmando e revisão de tomada 20A'
  );
  const [description, setDescription] = useState(
    'Preciso de avaliação técnica no quadro interno pois o disjuntor bifásico aquece durante o banho. Também gostaria de revisar uma tomada de 20A na bancada da cozinha.'
  );
  const [neighborhood, setNeighborhood] = useState(
    initialLocation.split(',')[0]?.trim() || 'Pinheiros'
  );
  const [urgency, setUrgency] = useState<'Hoje' | 'Amanhã' | 'Esta semana' | 'Flexível'>('Hoje');
  const [preferredTime, setPreferredTime] = useState<
    'Manhã (08h–12h)' | 'Tarde (13h–18h)' | 'Noite (18h–21h)' | 'Comercial'
  >('Tarde (13h–18h)');
  const [estimatedBudget, setEstimatedBudget] = useState('A combinar direto com o prestador');
  const [preferredPreviousProviderId, setPreferredPreviousProviderId] = useState<string>('prov-joao');
  const [photosCount, setPhotosCount] = useState(2);
  const [lgpdContactConsent, setLgpdContactConsent] = useState(true);
  const [error, setError] = useState('');

  const trustedProviders = providers.filter((p) => p.previouslyHiredByCurrentUser);
  const selectedCategoryInfo = CATEGORIES_LIST.find((c) => c.name === category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemTitle.trim() || !description.trim() || !neighborhood.trim()) {
      setError('Descreva o problema e informe o bairro para encontrarmos profissionais compatíveis.');
      return;
    }
    if (!lgpdContactConsent) {
      setError(
        'Autorize o compartilhamento de contato apenas com o profissional que você escolher.'
      );
      return;
    }
    setError('');

    const newReq: ServiceRequest = {
      id: `req-${Date.now()}`,
      category,
      problemTitle: problemTitle.trim(),
      description: description.trim(),
      neighborhood: neighborhood.trim(),
      city: 'São Paulo, SP',
      urgency,
      preferredTime,
      estimatedBudget: estimatedBudget.trim(),
      preferredPreviousProviderId: preferredPreviousProviderId || undefined,
      lgpdContactConsent,
      createdAt: 'Agora mesmo',
      status: 'em_matching',
      photosCount,
    };

    onCreateRequest(newReq);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#0A2540]/10 pb-6">
        <div>
          <p className="text-xs font-semibold text-[#FF6A00]">
            Tela 03 · Criação de Solicitação em menos de 2 minutos
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0A2540] mt-1">
            Criação de solicitação de serviço
          </h1>
          <p className="text-sm text-[#0A2540]/75 mt-1">
            Descreva o que precisa resolver. A plataforma não define nem impõe preço — você negocia diretamente com o profissional.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('profissionais-compativeis')}
          className="text-left text-xs font-semibold text-[#1D6FE0] hover:text-[#0A2540] underline underline-offset-4 sm:whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          Ver lista de profissionais compatíveis →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-[#0A2540]/10 space-y-6"
        >
          {error && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
            >
              {error}
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#0A2540]">
              1. Escolha a categoria do serviço *
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES_LIST.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategory(cat.name)}
                  className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    category === cat.name
                      ? 'bg-[#0A2540] text-white font-semibold'
                      : 'bg-[#F4F2EF] text-[#0A2540] hover:bg-[#e6e3de]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sugestões rápidas da categoria */}
          {selectedCategoryInfo && (
            <div className="p-3.5 rounded-2xl bg-[#F4F2EF]/60 space-y-2">
              <p className="text-[11px] font-semibold text-[#0A2540]/65">
                Exemplos comuns em {category} (clique para preencher):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCategoryInfo.commonProblems.map((prob) => (
                  <button
                    key={prob}
                    type="button"
                    onClick={() => setProblemTitle(prob)}
                    className="text-left text-xs text-[#1D6FE0] hover:text-[#0A2540] underline underline-offset-2 cursor-pointer"
                  >
                    {prob}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Título e Descrição */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="req-title"
                className="block text-xs font-semibold text-[#0A2540] mb-1.5"
              >
                2. Resumo do que você precisa resolver *
              </label>
              <input
                id="req-title"
                type="text"
                value={problemTitle}
                onChange={(e) => setProblemTitle(e.target.value)}
                placeholder="Ex.: Troca de disjuntor DR ou instalação de chuveiro"
                className="w-full px-4 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540] focus:outline-none focus:border-[#1D6FE0]"
              />
            </div>

            <div>
              <label
                htmlFor="req-desc"
                className="block text-xs font-semibold text-[#0A2540] mb-1.5"
              >
                3. Detalhes do problema ou necessidade *
              </label>
              <textarea
                id="req-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540] focus:outline-none focus:border-[#1D6FE0]"
              />
            </div>
          </div>

          {/* Bairro, Urgência e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="req-neighborhood"
                className="block text-xs font-semibold text-[#0A2540] mb-1.5"
              >
                Bairro ou endereço aprox. *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#FF6A00] absolute left-3.5 top-3.5" />
                <input
                  id="req-neighborhood"
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540] focus:outline-none focus:border-[#1D6FE0]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="req-urgency"
                className="block text-xs font-semibold text-[#0A2540] mb-1.5"
              >
                Urgência *
              </label>
              <select
                id="req-urgency"
                value={urgency}
                onChange={(e) =>
                  setUrgency(
                    e.target.value as 'Hoje' | 'Amanhã' | 'Esta semana' | 'Flexível'
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540] focus:outline-none focus:border-[#1D6FE0]"
              >
                <option value="Hoje">Hoje (Urgente)</option>
                <option value="Amanhã">Amanhã</option>
                <option value="Esta semana">Esta semana</option>
                <option value="Flexível">Flexível</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="req-time"
                className="block text-xs font-semibold text-[#0A2540] mb-1.5"
              >
                Horário preferencial
              </label>
              <select
                id="req-time"
                value={preferredTime}
                onChange={(e) =>
                  setPreferredTime(
                    e.target.value as
                      | 'Manhã (08h–12h)'
                      | 'Tarde (13h–18h)'
                      | 'Noite (18h–21h)'
                      | 'Comercial'
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540] focus:outline-none focus:border-[#1D6FE0]"
              >
                <option value="Manhã (08h–12h)">Manhã (08h–12h)</option>
                <option value="Tarde (13h–18h)">Tarde (13h–18h)</option>
                <option value="Noite (18h–21h)">Noite (18h–21h)</option>
                <option value="Comercial">Horário Comercial</option>
              </select>
            </div>
          </div>

          {/* Fotos & Preferência por profissional anterior */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-[#0A2540] mb-1.5">
                4. Fotos ou vídeo curto do local (Opcional)
              </label>
              <div className="px-3.5 py-2 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Camera className="w-4 h-4 text-[#1D6FE0] shrink-0" />
                  <span className="text-xs font-medium text-[#0A2540] font-mono tabular-nums">
                    {photosCount} foto(s) anexada(s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotosCount((c) => (c >= 5 ? 1 : c + 1))}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#0A2540]/15 text-xs font-medium text-[#0A2540] hover:bg-[#0A2540]/5 cursor-pointer whitespace-nowrap"
                >
                  + Adicionar
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="req-prev-prov"
                className="block text-xs font-semibold text-[#0A2540] mb-1.5"
              >
                5. Preferência por profissional anterior (Opcional)
              </label>
              <select
                id="req-prev-prov"
                value={preferredPreviousProviderId}
                onChange={(e) => setPreferredPreviousProviderId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540]"
              >
                <option value="">Buscar em toda a rede compatível</option>
                {trustedProviders.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    Priorizar {tp.name} ({tp.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Consentimento LGPD */}
          <div className="p-4 rounded-2xl bg-[#F4F2EF]/80 border border-[#0A2540]/10">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={lgpdContactConsent}
                onChange={(e) => setLgpdContactConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#1D6FE0] rounded"
              />
              <span className="text-xs text-[#0A2540] leading-relaxed">
                <strong>Autorização de contato (LGPD):</strong> Autorizo que os prestadores compatíveis visualizem o resumo do serviço e o bairro aproximado ({neighborhood}). Meu WhatsApp só será liberado após minha confirmação.
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="submit"
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Encontrar profissionais compatíveis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-[#0A2540]/65">
              Orçamento negociado diretamente · Sem pagamento no app
            </span>
          </div>
        </form>

        {/* Right Column: Pedidos Recentes e Como Funciona o Matching */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-[#0A2540] text-white rounded-3xl p-6 space-y-4">
            <p className="text-xs font-semibold text-[#FF6A00]">
              Motor de Matching Confiare
            </p>
            <h2 className="font-display font-bold text-lg">
              Como selecionamos quem recebe seu pedido
            </h2>
            <p className="text-xs text-white/80 leading-relaxed">
              Cruzamos especialidade, bairro, urgência e reputação composta. Planos pagos não compram estrelas nem furam a fila de qualidade.
            </p>
            <div className="pt-3 border-t border-white/15 space-y-2 text-xs">
              <p className="font-mono text-white/90">
                Prioridade = Compatibilidade + Disponibilidade + Reputação + Bônus Moderado
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#0A2540]/10 space-y-3">
            <h3 className="font-display font-bold text-sm text-[#0A2540]">
              Suas solicitações ativas ({requests.length})
            </h3>
            {requests.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-2xl bg-[#F4F2EF]/70 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between text-[#0A2540]/65">
                  <span>{r.category}</span>
                  <span>{r.createdAt}</span>
                </div>
                <p className="font-semibold text-[#0A2540]">{r.problemTitle}</p>
                <p className="text-[#1D6FE0] font-medium">
                  {r.neighborhood} · Urgência: {r.urgency}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

interface CompatibleProvidersListScreenProps {
  providers: ProviderProfile[];
  activeCategory: CategoryName | 'Todas';
  searchQuery: string;
  locationQuery: string;
  latestRequest?: ServiceRequest;
  onChangeCategory: (cat: CategoryName | 'Todas') => void;
  onChangeSearch: (q: string) => void;
  onChangeLocation: (loc: string) => void;
  onSelectProvider: (providerId: string) => void;
  onRepeatProvider: (providerId: string) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

export const CompatibleProvidersListScreen: React.FC<
  CompatibleProvidersListScreenProps
> = ({
  providers,
  activeCategory,
  searchQuery,
  locationQuery,
  latestRequest,
  onChangeCategory,
  onChangeSearch,
  onChangeLocation,
  onSelectProvider,
  onRepeatProvider,
  onNavigate,
}) => {
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false);
  const [onlyPreviouslyHired, setOnlyPreviouslyHired] = useState(false);
  const [contactAuthorizedIds, setContactAuthorizedIds] = useState<string[]>([]);

  const rankedList = rankCompatibleProviders(providers, {
    category: activeCategory,
    searchQuery,
    locationQuery,
    onlyAvailableToday,
    onlyPreviouslyHired,
  });

  const toggleContactAuthorization = (id: string) => {
    setContactAuthorizedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Active Request Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#0A2540]/10 pb-6">
        <div>
          <p className="text-xs font-semibold text-[#1D6FE0]">
            Tela 04 · Matching Justo por Compatibilidade, Disponibilidade e Reputação
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0A2540] mt-1">
            Lista de profissionais compatíveis
          </h1>
          <p className="text-sm text-[#0A2540]/75 mt-1">
            Compare sinais reais de confiança, tempo médio de resposta, vínculo de apadrinhamento e histórico.
          </p>
        </div>

        {latestRequest && (
          <div className="bg-[#0A2540] text-white rounded-2xl p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full lg:w-auto min-w-0">
            <div className="min-w-0">
              <p className="text-[#FF6A00] font-semibold">
                Solicitação ativa: {latestRequest.category} em {latestRequest.neighborhood}
              </p>
              <p className="text-white/85 break-words sm:truncate sm:max-w-md mt-0.5">
                {latestRequest.problemTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('criar-solicitacao')}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
            >
              Editar pedido
            </button>
          </div>
        )}
      </div>

      {/* Interactive Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#0A2540]/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-[#1D6FE0] absolute left-3.5 top-3.5" />
            <input
              type="text"
              aria-label="Filtrar por problema ou nome do profissional"
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Buscar por especialidade ou nome..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540]"
            />
          </div>

          <div className="sm:col-span-4 relative">
            <MapPin className="w-4 h-4 text-[#FF6A00] absolute left-3.5 top-3.5" />
            <input
              type="text"
              aria-label="Filtrar por bairro"
              value={locationQuery}
              onChange={(e) => onChangeLocation(e.target.value)}
              placeholder="Bairro (ex.: Pinheiros)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F2EF]/60 border border-[#0A2540]/15 text-sm text-[#0A2540]"
            />
          </div>

          <div className="sm:col-span-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOnlyAvailableToday((v) => !v)}
              className={`w-full min-h-[42px] px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-center ${
                onlyAvailableToday
                  ? 'bg-[#1D6FE0] text-white font-semibold'
                  : 'bg-[#F4F2EF] text-[#0A2540] hover:bg-[#e6e3de]'
              }`}
            >
              Disponível hoje
            </button>
            <button
              type="button"
              onClick={() => setOnlyPreviouslyHired((v) => !v)}
              className={`w-full min-h-[42px] px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-center ${
                onlyPreviouslyHired
                  ? 'bg-[#FF6A00] text-white font-semibold'
                  : 'bg-[#F4F2EF] text-[#0A2540] hover:bg-[#e6e3de]'
              }`}
            >
              Já me atendeu
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(['Todas', ...CATEGORIES_LIST.map((c) => c.name)] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onChangeCategory(cat as CategoryName | 'Todas')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeCategory === cat
                  ? 'bg-[#0A2540] text-white font-semibold'
                  : 'bg-[#F4F2EF]/80 text-[#0A2540]/80 hover:text-[#0A2540]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      {rankedList.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center space-y-4 border border-[#0A2540]/10">
          <p className="font-display font-bold text-lg text-[#0A2540]">
            Nenhum profissional encontrado com esses filtros exatos
          </p>
          <p className="text-xs text-[#0A2540]/70 max-w-md mx-auto">
            Amplie a busca para todas as categorias ou limpe o filtro de bairro para visualizar toda a rede verificada.
          </p>
          <button
            type="button"
            onClick={() => {
              onChangeCategory('Todas');
              onChangeSearch('');
              onChangeLocation('');
              setOnlyAvailableToday(false);
              setOnlyPreviouslyHired(false);
            }}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0A2540] text-white text-xs font-semibold cursor-pointer"
          >
            Mostrar todos os profissionais verificados
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rankedList.map(({ provider, matchPercentage, compositeScore, matchReasons }) => {
            const isContactOpen = contactAuthorizedIds.includes(provider.id);

            return (
              <article
                key={provider.id}
                className="bg-white rounded-3xl p-6 border border-[#0A2540]/10 hover:border-[#1D6FE0] transition-all"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left: Identity & Trust Lineage */}
                  <div className="lg:col-span-8 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-[#0A2540] text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
                          {provider.initials}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-display font-bold text-lg text-[#0A2540]">
                              {provider.name}
                            </h2>
                            <span className="text-xs text-[#0A2540]/40" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-xs font-semibold text-[#1D6FE0]">
                              {provider.category}
                            </span>
                          </div>
                          <p className="text-xs text-[#0A2540]/70 mt-0.5">
                            {provider.yearsExperience} anos de experiência ·{' '}
                            <span className="font-mono tabular-nums">
                              {provider.completedJobs} atendimentos concluídos
                            </span>{' '}
                            · Responde em ~{provider.responseTimeMinutes} min
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right font-mono tabular-nums">
                        <p className="text-base font-bold text-[#0A2540]">
                          ★ {compositeScore.toFixed(2)}{' '}
                          <span className="text-xs font-normal text-[#0A2540]/65">
                            ({provider.reviewsCount} avaliações)
                          </span>
                        </p>
                        <p className="text-xs font-semibold text-[#1D6FE0]">
                          {matchPercentage}% compatível com seu pedido
                        </p>
                      </div>
                    </div>

                    {/* Unboxed Trust Metadata Signals */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#0A2540]/85 pt-1">
                      {provider.isVerified && (
                        <span className="font-semibold text-[#1D6FE0]">
                          ✓ Selo Verificado
                        </span>
                      )}
                      {provider.isTopRegion && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-[#0A2540]">
                            Destaque na região
                          </span>
                        </>
                      )}
                      {provider.isMentor && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#0A2540]">
                            Padrinho Verificado ({provider.menteesCount} indicados)
                          </span>
                        </>
                      )}
                      {provider.mentorName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#1D6FE0]">
                            Indicado por {provider.mentorName}
                          </span>
                        </>
                      )}
                      {provider.previouslyHiredByCurrentUser && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#FF6A00]">
                            Atendeu você em {provider.lastServiceDate}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-[#0A2540]/80 leading-relaxed">
                      {provider.bio}
                    </p>

                    <div className="text-xs text-[#0A2540]/65">
                      <span>Especialidades: {provider.specialties.join(' / ')}</span>
                      <span className="mx-2" aria-hidden="true">
                        ·
                      </span>
                      <span>Motivos do match: {matchReasons.join(' · ')}</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="lg:col-span-4 flex flex-col gap-2.5 lg:border-l lg:border-[#0A2540]/10 lg:pl-6">
                    <button
                      type="button"
                      onClick={() => onSelectProvider(provider.id)}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#13385c] text-white font-display font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Ver perfil completo, selos e portfólio
                    </button>

                    {provider.previouslyHiredByCurrentUser && (
                      <button
                        type="button"
                        onClick={() => onRepeatProvider(provider.id)}
                        className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Solicitar novamente este profissional</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleContactAuthorization(provider.id)}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F4F2EF] hover:bg-[#e6e3de] text-[#0A2540] font-semibold text-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#1D6FE0]" />
                      <span>
                        {isContactOpen
                          ? `WhatsApp liberado: ${provider.whatsapp}`
                          : 'Autorizar e falar no WhatsApp'}
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
