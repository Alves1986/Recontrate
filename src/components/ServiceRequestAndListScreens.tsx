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
import {
  hasSufficientReputationHistory,
  rankCompatibleProviders,
} from '../utils/marketplaceRules';

interface CreateServiceRequestScreenProps {
  initialCategory?: CategoryName;
  initialQuery?: string;
  initialLocation?: string;
  providers: ProviderProfile[];
  requests: ServiceRequest[];
  onCreateRequest: (req: ServiceRequest) => Promise<void> | void;
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
  const [preferredPreviousProviderId, setPreferredPreviousProviderId] = useState<string>('');
  const [photosCount, setPhotosCount] = useState(2);
  const [lgpdContactConsent, setLgpdContactConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const trustedProviders = providers.filter((p) => p.previouslyHiredByCurrentUser);
  const selectedCategoryInfo = CATEGORIES_LIST.find((c) => c.name === category);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setSubmitting(true);
    try {
      await onCreateRequest(newReq);
    } catch (err) {
      setError(
        (err as Error).message ||
          'Não foi possível registrar sua solicitação no servidor. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-brand-primary/10 pb-6">
        <div>
          <p className="text-xs font-semibold text-brand-accent-strong">
            Tela 03 · Criação de Solicitação em menos de 2 minutos
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-ink mt-1">
            Criação de solicitação de serviço
          </h1>
          <p className="text-sm text-brand-ink/75 mt-1">
            Descreva o que precisa resolver. A plataforma não define nem impõe preço — você negocia diretamente com o profissional.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('profissionais-compativeis')}
          className="text-left text-xs font-semibold text-brand-link hover:text-brand-ink underline underline-offset-4 sm:whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          Ver lista de profissionais compatíveis →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-6"
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
            <label className="block text-xs font-semibold text-brand-ink">
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
                      ? 'bg-brand-primary text-white font-semibold'
                      : 'bg-brand-background text-brand-ink hover:bg-brand-surface-hover'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sugestões rápidas da categoria */}
          {selectedCategoryInfo && (
            <div className="p-3.5 rounded-2xl bg-brand-background/60 space-y-2">
              <p className="text-[11px] font-semibold text-brand-ink/65">
                Exemplos comuns em {category} (clique para preencher):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCategoryInfo.commonProblems.map((prob) => (
                  <button
                    key={prob}
                    type="button"
                    onClick={() => setProblemTitle(prob)}
                    className="text-left text-xs text-brand-link hover:text-brand-ink underline underline-offset-2 cursor-pointer"
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
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                2. Resumo do que você precisa resolver *
              </label>
              <input
                id="req-title"
                type="text"
                value={problemTitle}
                onChange={(e) => setProblemTitle(e.target.value)}
                placeholder="Ex.: Troca de disjuntor DR ou instalação de chuveiro"
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus:outline-none focus:border-brand-link"
              />
            </div>

            <div>
              <label
                htmlFor="req-desc"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                3. Detalhes do problema ou necessidade *
              </label>
              <textarea
                id="req-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus:outline-none focus:border-brand-link"
              />
            </div>
          </div>

          {/* Bairro, Urgência e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="req-neighborhood"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Bairro ou endereço aprox. *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-brand-accent-strong absolute left-3.5 top-3.5" />
                <input
                  id="req-neighborhood"
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus:outline-none focus:border-brand-link"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="req-urgency"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus:outline-none focus:border-brand-link"
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
                className="block text-xs font-semibold text-brand-ink mb-1.5"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus:outline-none focus:border-brand-link"
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
              <label className="block text-xs font-semibold text-brand-ink mb-1.5">
                4. Fotos ou vídeo curto do local (Opcional)
              </label>
              <div className="px-3.5 py-2 rounded-xl bg-brand-background/60 border border-brand-primary/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Camera className="w-4 h-4 text-brand-link shrink-0" />
                  <span className="text-xs font-medium text-brand-ink font-mono tabular-nums">
                    {photosCount} foto(s) anexada(s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotosCount((c) => (c >= 5 ? 1 : c + 1))}
                  className="px-2.5 py-1 rounded-lg bg-white border border-brand-primary/15 text-xs font-medium text-brand-ink hover:bg-brand-primary/5 cursor-pointer whitespace-nowrap"
                >
                  + Adicionar
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="req-prev-prov"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                5. Preferência por profissional anterior (Opcional)
              </label>
              <select
                id="req-prev-prov"
                value={preferredPreviousProviderId}
                onChange={(e) => setPreferredPreviousProviderId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
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
          <div className="p-4 rounded-2xl bg-brand-background/80 border border-brand-primary/10">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={lgpdContactConsent}
                onChange={(e) => setLgpdContactConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-brand-link rounded"
              />
              <span className="text-xs text-brand-ink leading-relaxed">
                <strong>Autorização de contato (LGPD):</strong> Autorizo que os prestadores compatíveis visualizem o resumo do serviço e o bairro aproximado ({neighborhood}). Meu WhatsApp só será liberado após minha confirmação.
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover disabled:opacity-60 text-white font-display font-semibold text-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span>{submitting ? 'Registrando...' : 'Encontrar profissionais compatíveis'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-brand-ink/65">
              Orçamento negociado diretamente · Sem pagamento no app
            </span>
          </div>
        </form>

        {/* Right Column: Pedidos Recentes e Como Funciona o Matching */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-brand-primary text-white rounded-3xl p-6 space-y-4">
            <p className="text-xs font-semibold text-brand-accent-contrast">
              Motor de compatibilidade Recontrate
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

          <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-3">
            <h3 className="font-display font-bold text-sm text-brand-ink">
              Suas solicitações ativas ({requests.length})
            </h3>
            {requests.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-2xl bg-brand-background/70 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between text-brand-ink/65">
                  <span>{r.category}</span>
                  <span>{r.createdAt}</span>
                </div>
                <p className="font-semibold text-brand-ink">{r.problemTitle}</p>
                <p className="text-white/85 font-medium">
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
  onChangeCategory,
  onChangeSearch,
  onChangeLocation,
  onSelectProvider,
}) => {
  const publishedProviders = providers.filter((provider) => provider.isVerified);
  const rankedList = rankCompatibleProviders(publishedProviders, {
    category: activeCategory,
    searchQuery,
    locationQuery,
  });

  const clearFilters = () => {
    onChangeCategory('Todas');
    onChangeSearch('');
    onChangeLocation('');
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="border-b border-brand-primary/10 pb-6">
        <p className="text-xs font-semibold text-brand-link">Busca de perfis públicos</p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-ink mt-1">
          Profissionais com perfil verificado
        </h1>
        <p className="text-sm text-brand-ink/75 mt-1">
          Use categoria, nome e localidade informada para filtrar os perfis publicados. Localidade não confirma agenda ou cobertura de atendimento.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-brand-primary/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7 relative">
            <Search className="w-4 h-4 text-brand-link absolute left-3.5 top-3.5" />
            <input
              type="text"
              aria-label="Filtrar por problema ou nome do profissional"
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Buscar por especialidade ou nome..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
            />
          </div>
          <div className="sm:col-span-5 relative">
            <MapPin className="w-4 h-4 text-brand-accent-strong absolute left-3.5 top-3.5" />
            <input
              type="text"
              aria-label="Filtrar por localidade informada"
              value={locationQuery}
              onChange={(e) => onChangeLocation(e.target.value)}
              placeholder="Bairro ou cidade informados"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(['Todas', ...CATEGORIES_LIST.map((category) => category.name)] as const).map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onChangeCategory(category as CategoryName | 'Todas')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeCategory === category
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'bg-brand-background/80 text-brand-ink/80 hover:text-brand-ink'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {rankedList.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center space-y-4 border border-brand-primary/10">
          <p className="font-display font-bold text-lg text-brand-ink">
            {publishedProviders.length === 0
              ? 'Nenhum perfil verificado está publicado no momento.'
              : 'Nenhum perfil verificado corresponde a estes filtros.'}
          </p>
          <p className="text-xs text-brand-ink/70 max-w-md mx-auto">
            {publishedProviders.length === 0
              ? 'A lista de interesse ainda não está disponível. Esta tela não coleta seus dados quando não encontra perfis.'
              : 'Ajuste categoria, nome ou localidade informada, ou limpe os filtros para consultar os perfis publicados.'}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold cursor-pointer"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rankedList.map(({ provider }) => (
            <article
              key={provider.id}
              className="bg-white rounded-3xl p-6 border border-brand-primary/10 hover:border-brand-link transition-all"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex flex-wrap items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-brand-primary text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
                      {provider.initials}
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-lg text-brand-ink">{provider.name}</h2>
                      <p className="text-xs text-brand-link font-semibold">{provider.category}</p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-brand-link">
                    ✓ Perfil verificado e aprovado ·{' '}
                    {hasSufficientReputationHistory(provider)
                      ? `Nota ★ ${provider.ratingAvg.toFixed(2)} (${provider.reviewsCount} avaliações · ${provider.completedJobs} atendimentos)`
                      : 'Em avaliação inicial (histórico mínimo em formação)'}
                  </p>
                  {(provider.city || provider.neighborhoods.length > 0) && (
                    <p className="text-xs text-brand-ink/70">
                      Localidade informada: {[provider.city, ...provider.neighborhoods].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {provider.specialties.length > 0 && (
                    <p className="text-xs text-brand-ink/65">
                      Especialidades informadas: {provider.specialties.join(' / ')}
                    </p>
                  )}
                  {provider.bio.trim() && (
                    <p className="text-xs sm:text-sm text-brand-ink/80 leading-relaxed">
                      Descrição informada: {provider.bio}
                    </p>
                  )}
                </div>

                <div className="lg:col-span-4 lg:border-l lg:border-brand-primary/10 lg:pl-6">
                  <button
                    type="button"
                    onClick={() => onSelectProvider(provider.id)}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-display font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Ver informações do perfil
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
