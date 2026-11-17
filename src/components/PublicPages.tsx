import React, { useState } from 'react';
import {
  ArrowRight,
  Droplets,
  MapPin,
  Paintbrush,
  Search,
  Sparkles,
  Wind,
  Zap,
} from 'lucide-react';
import { CategoryName, ProviderProfile } from '../types/confiare';
import { CATEGORIES_LIST } from '../data/seedData';

const CATEGORY_ICONS: Record<CategoryName, React.ReactNode> = {
  Eletricista: <Zap className="w-5 h-5 text-brand-link" />,
  Encanador: <Droplets className="w-5 h-5 text-brand-link" />,
  Diarista: <Sparkles className="w-5 h-5 text-brand-link" />,
  Pintor: <Paintbrush className="w-5 h-5 text-brand-link" />,
  'Técnico de ar-condicionado': <Wind className="w-5 h-5 text-brand-link" />,
};

export const PublicLandingPage: React.FC<{
  providers: ProviderProfile[];
  onStartSearch: (
    query: string,
    location: string,
    category?: CategoryName
  ) => void;
  onSelectCategory: (category: CategoryName) => void;
  onNavigateUrl: (path: string) => void;
}> = ({ providers, onStartSearch, onSelectCategory, onNavigateUrl }) => {
  const [problemInput, setProblemInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const publishedProviders = providers.filter((provider) => provider.isVerified);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSearch(problemInput, locationInput);
  };

  return (
    <div className="space-y-14 sm:space-y-20 pb-14">
      {/* 1. HERO SECTION */}
      <section className="bg-brand-primary text-white rounded-3xl p-6 sm:p-10 lg:p-14 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-brand-accent-contrast">
              <Search className="w-4 h-4" />
              <span>Para clientes e profissionais autônomos</span>
            </div>

            <div className="space-y-4">
              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.14] tracking-tight text-white">
                Busque perfis profissionais para serviços residenciais.
              </h1>
              <p className="text-base sm:text-lg text-white/85 leading-relaxed max-w-2xl">
                Filtre os perfis públicos por categoria e localidade. A busca não confirma disponibilidade nem cobertura de atendimento.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="bg-white rounded-2xl p-2.5 sm:p-3 text-brand-ink shadow-lg space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 items-center">
                <div className="sm:col-span-7 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-brand-background/75">
                  <Search className="w-5 h-5 text-brand-link shrink-0" />
                  <div className="w-full min-w-0">
                    <label
                      htmlFor="landing-search-what"
                      className="block text-[11px] font-medium text-brand-ink/65"
                    >
                      O que você precisa resolver?
                    </label>
                    <input
                      id="landing-search-what"
                      type="text"
                      value={problemInput}
                      onChange={(e) => setProblemInput(e.target.value)}
                      placeholder="Ex.: Disjuntor desarmando, vazamento..."
                      className="w-full bg-transparent text-sm font-medium text-brand-ink placeholder:text-brand-ink/45 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-brand-background/75">
                  <MapPin className="w-5 h-5 text-brand-accent-strong shrink-0" />
                  <div className="w-full min-w-0">
                    <label
                      htmlFor="landing-search-where"
                      className="block text-[11px] font-medium text-brand-ink/65"
                    >
                      Onde?
                    </label>
                    <input
                      id="landing-search-where"
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Bairro ou cidade"
                      className="w-full bg-transparent text-sm font-medium text-brand-ink placeholder:text-brand-ink/45 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Buscar perfis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateUrl('/para-prestadores')}
                  className="min-h-[48px] px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-display font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Conhecer a página para prestadores</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white text-brand-ink rounded-2xl p-6 space-y-4">
              <p className="text-xs font-semibold text-brand-link">Resultados da busca</p>
              <h2 className="font-display font-bold text-lg text-brand-ink">
                Perfis reais, quando estiverem publicados.
              </h2>
              <p className="text-xs text-brand-ink/75 leading-relaxed">
                A busca usa os perfis retornados pela plataforma. Se não houver um perfil verificado que corresponda aos filtros, mostramos um estado vazio — sem criar profissionais ou avaliações de exemplo.
              </p>
            </div>
          </div>
        </div>

        {/* Resumo dos limites da busca pública */}
        <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-sm text-white/90">
            <p className="font-display font-semibold">Filtros de busca</p>
            <p className="text-xs text-white/70">Categoria, nome e localidade informada no perfil.</p>
          </div>
          <div className="text-sm text-white/90">
            <p className="font-display font-semibold">Status do perfil</p>
            <p className="text-xs text-white/70">A busca pública mostra apenas perfis com verificação ativa.</p>
          </div>
          <div className="text-sm text-white/90">
            <p className="font-display font-semibold">Sem cobertura presumida</p>
            <p className="text-xs text-white/70">Localidade informada não confirma agenda ou atendimento.</p>
          </div>
        </div>
      </section>

      {/* 3. CATEGORIAS POPULARES */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-brand-link">
              Categorias cadastradas na plataforma
            </p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
              Categorias para busca
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateUrl('/encontrar-profissional')}
            className="text-xs sm:text-sm font-medium text-brand-link hover:text-brand-ink inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Abrir busca de perfis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CATEGORIES_LIST.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => onSelectCategory(cat.name)}
              className="text-left bg-white rounded-2xl p-5 border border-brand-primary/10 hover:border-brand-link transition-all flex flex-col justify-between gap-4 group cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-brand-background flex items-center justify-center">
                  {CATEGORY_ICONS[cat.name]}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-brand-ink group-hover:text-brand-link">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-brand-ink/70 mt-1 leading-relaxed">
                    {cat.shortDesc}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-brand-primary/10 flex items-center justify-between text-xs text-brand-ink/65 font-mono">
                <span>Ver especialidades</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Vitrine limitada a perfis reais com verificação ativa */}
      <section className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-brand-link">Perfis públicos</p>
          <h2 className="font-display font-bold text-2xl text-brand-ink">
            Perfis verificados publicados
          </h2>
          <p className="text-sm text-brand-ink/70">
            Localidade e descrição são informações do perfil; não confirmam disponibilidade de agenda ou cobertura.
          </p>
        </div>

        {publishedProviders.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-brand-primary/10 text-sm text-brand-ink/75">
            Nenhum perfil verificado está publicado para exibição no momento. A lista de interesse ainda não está disponível; esta página não coleta seus dados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {publishedProviders.slice(0, 3).map((provider) => (
              <div
                key={provider.id}
                className="bg-white rounded-2xl p-6 border border-brand-primary/10 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-bold text-base text-brand-ink">
                      {provider.name}
                    </h3>
                    <span className="text-xs font-semibold text-brand-link">Perfil verificado</span>
                  </div>
                  <p className="text-xs text-brand-link font-semibold">
                    {provider.category}{provider.city ? ` · ${provider.city}` : ''}
                  </p>
                  {provider.neighborhoods.length > 0 && (
                    <p className="text-xs text-brand-ink/65">
                      Localidade informada: {provider.neighborhoods.join(', ')}
                    </p>
                  )}
                  {provider.bio.trim() && (
                    <p className="text-xs text-brand-ink/75">
                      Descrição informada: {provider.bio}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateUrl(`/profissionais/${provider.id}`)}
                  className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink text-xs font-semibold cursor-pointer"
                >
                  Ver informações do perfil
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 8. SEÇÃO DEDICADA AO PRESTADOR */}
      <section className="bg-brand-primary text-white rounded-3xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8 space-y-3">
          <p className="text-xs font-semibold text-brand-accent-contrast">
            Para Profissionais Autônomos
          </p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl">
            Informações claras para prestadores autônomos
          </h2>
          <p className="text-sm text-white/80 leading-relaxed">
            A disponibilidade de perfis e oportunidades varia conforme os cadastros publicados e a região. O cadastro não garante pedidos, clientes, renda ou volume de trabalho.
          </p>
        </div>
        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
          <button
            type="button"
            onClick={() => onNavigateUrl('/para-prestadores')}
            className="min-h-[46px] px-6 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-sm cursor-pointer"
          >
            Conhecer a página para prestadores
          </button>
          <button
            type="button"
            onClick={() => onNavigateUrl('/planos')}
            className="min-h-[46px] px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-display font-semibold text-sm cursor-pointer"
          >
            Conhecer planos de assinatura
          </button>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-brand-primary/10 space-y-6">
        <div>
          <p className="text-xs font-semibold text-brand-link">
            Dúvidas Frequentes
          </p>
          <h2 className="font-display font-bold text-2xl text-brand-ink">
            Perguntas frequentes sobre o Recontrate
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink">A busca garante encontrar alguém?</h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Não. Os resultados dependem dos perfis verificados publicados e dos filtros selecionados. A localidade informada não confirma agenda ou cobertura.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink">As informações do perfil são garantias de atendimento?</h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Não. Descrições e localidade são informações publicadas no perfil e não garantem disponibilidade, contratação ou resultado.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink">Há avaliações ou pontuações públicas?</h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Não exibimos avaliações ou pontuações nesta versão enquanto não houver validação suficiente dos registros.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink">Posso entrar em uma lista de interesse?</h3>
            <p className="text-brand-ink/75 leading-relaxed">
              A lista de interesse ainda não está disponível. Esta página não coleta seus dados quando não há perfis correspondentes.
            </p>
          </div>
        </div>
      </section>

      {/* 10. CTA FINAL DUPLO */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-brand-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
            Consulte os perfis disponíveis na busca.
          </h2>
          <p className="text-xs sm:text-sm text-brand-ink/75">
            Os resultados dependem dos perfis públicos verificados disponíveis.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateUrl('/encontrar-profissional')}
            className="min-h-[46px] px-6 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-xs sm:text-sm cursor-pointer"
          >
            Encontrar um profissional
          </button>
          <button
            type="button"
            onClick={() => onNavigateUrl('/criar-conta')}
            className="min-h-[46px] px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-display font-semibold text-xs sm:text-sm cursor-pointer"
          >
            Criar conta e escolher perfil
          </button>
        </div>
      </section>
    </div>
  );
};

export const ForProvidersPage: React.FC<{
  onNavigateUrl: (path: string) => void;
}> = ({ onNavigateUrl }) => {
  return (
    <div className="space-y-8 pb-12">
      <section className="bg-brand-primary text-white rounded-3xl p-8 sm:p-12 space-y-6">
        <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-brand-accent-contrast">
          Recontrate para Prestadores Autônomos
        </span>
        <h1 className="font-display font-bold text-3xl sm:text-4xl max-w-3xl leading-tight">
          Conheça a plataforma antes de criar seu perfil
        </h1>
        <p className="text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
          A disponibilidade de oportunidades varia conforme os perfis publicados e a região. O cadastro não garante pedidos, clientes, renda ou posição em resultados.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigateUrl('/criar-conta')}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-sm cursor-pointer"
          >
            Criar conta (selecione Prestador)
          </button>
          <button
            type="button"
            onClick={() => onNavigateUrl('/planos')}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-display font-semibold text-sm cursor-pointer"
          >
            Consultar planos e valores
          </button>
        </div>
      </section>

      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-3">
        <h2 className="font-display font-bold text-xl text-brand-ink">Informações antes do cadastro</h2>
        <p className="text-sm text-brand-ink/75 leading-relaxed">
          Na tela de criação de conta, selecione manualmente o perfil Prestador. A busca pública exibe apenas perfis com status de verificação ativo. Categoria e localidade são informações declaradas no perfil e não confirmam agenda ou área de atendimento.
        </p>
      </section>
    </div>
  );
};

export const TermsAndPrivacyPage: React.FC<{
  mode: 'termos' | 'privacidade';
}> = ({ mode }) => {
  const isTerms = mode === 'termos';
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 border border-brand-primary/10 space-y-6 mb-12">
      <p className="text-xs font-semibold text-brand-link">Informações provisórias</p>
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-ink">
        {isTerms ? 'Termos de uso em revisão' : 'Informações de privacidade em revisão'}
      </h1>
      <div className="space-y-4 text-xs sm:text-sm text-brand-ink/80 leading-relaxed">
        <p>
          {isTerms
            ? 'Os termos completos de uso ainda estão em revisão. Esta página não confirma disponibilidade de pedidos, contato direto, contratação ou resultado. Consulte os valores e condições exibidos na página de planos antes de qualquer decisão.'
            : 'O aviso completo de privacidade ainda está em revisão. A lista de interesse não está disponível e esta página não coleta dados para esse fim. Antes de habilitar novas formas de coleta, serão descritos os dados tratados, finalidades, compartilhamentos, retenção e canal de atendimento.'}
        </p>
      </div>
    </div>
  );
};
