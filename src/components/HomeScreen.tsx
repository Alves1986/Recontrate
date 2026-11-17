import React, { useState } from 'react';
import {
  Search,
  MapPin,
  ShieldCheck,
  Star,
  RotateCcw,
  Zap,
  Droplets,
  Sparkles,
  Paintbrush,
  Wind,
  ArrowRight,
  Users,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { CategoryName, ProviderProfile, ScreenId } from '../types/confiare';
import { CATEGORIES_LIST } from '../data/seedData';
import { BrandLogo } from './BrandLogo';
import { calculateCompositeScore } from '../utils/marketplaceRules';

interface HomeScreenProps {
  providers: ProviderProfile[];
  onStartSearch: (query: string, location: string, category?: CategoryName) => void;
  onSelectCategory: (category: CategoryName) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

const CATEGORY_ICONS: Record<CategoryName, React.ReactNode> = {
  Eletricista: <Zap className="w-5 h-5 text-brand-link" />,
  Encanador: <Droplets className="w-5 h-5 text-brand-link" />,
  Diarista: <Sparkles className="w-5 h-5 text-brand-link" />,
  Pintor: <Paintbrush className="w-5 h-5 text-brand-link" />,
  'Técnico de ar-condicionado': <Wind className="w-5 h-5 text-brand-link" />,
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  providers,
  onStartSearch,
  onSelectCategory,
  onNavigate,
}) => {
  const [problemInput, setProblemInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSearch(problemInput, locationInput);
  };

  const featuredProviders = providers.slice(0, 3);

  return (
    <div className="space-y-12 sm:space-y-16 pb-12">
      {/* HERO SECTION */}
      <section className="bg-brand-primary text-white rounded-3xl p-6 sm:p-10 lg:p-14 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Hero Copy + Search */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-4">
              <BrandLogo variant="light" size="md" />
              <span className="text-white/40" aria-hidden="true">
                ·
              </span>
              <span className="text-xs sm:text-sm text-white/80 font-medium">
                Para clientes e profissionais autônomos
              </span>
            </div>

            <div className="space-y-4">
              <h1
                className="font-display font-bold text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.14] tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                Encontre um bom profissional. Conte com ele de novo.
              </h1>
              <p className="text-base sm:text-lg text-white/85 leading-relaxed max-w-2xl">
                Busque serviços residenciais e mantenha por perto quem já fez um bom trabalho.
              </p>
            </div>

            {/* Search Bar Form + Primary & Secondary CTAs */}
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="bg-white rounded-2xl p-2.5 sm:p-3 text-brand-ink shadow-lg space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 items-center">
                <div className="sm:col-span-7 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-brand-background/75 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-link">
                  <Search className="w-5 h-5 text-brand-link shrink-0" />
                  <div className="w-full min-w-0">
                    <label
                      htmlFor="home-search-what"
                      className="block text-[11px] font-medium text-brand-ink/65"
                    >
                      O que você precisa resolver?
                    </label>
                    <input
                      id="home-search-what"
                      type="text"
                      value={problemInput}
                      onChange={(e) => setProblemInput(e.target.value)}
                      placeholder="Ex.: Disjuntor desarmando, vazamento..."
                      className="w-full bg-transparent text-sm font-medium text-brand-ink placeholder:text-brand-ink/45 focus:outline-none truncate"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-brand-background/75 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-link">
                  <MapPin className="w-5 h-5 text-brand-accent-strong shrink-0" />
                  <div className="w-full min-w-0">
                    <label
                      htmlFor="home-search-where"
                      className="block text-[11px] font-medium text-brand-ink/65"
                    >
                      Onde?
                    </label>
                    <input
                      id="home-search-where"
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Bairro ou cidade"
                      className="w-full bg-transparent text-sm font-medium text-brand-ink placeholder:text-brand-ink/45 focus:outline-none truncate"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3.5 pt-1">
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
                  <button
                    type="submit"
                    className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-md whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Encontrar um profissional</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('cadastro-prestador')}
                    className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-display font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Quero receber clientes</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('solicitar-novamente')}
                  className="text-left sm:text-right text-xs sm:text-sm font-medium text-white/85 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Já contratou antes? Solicitar novamente →
                </button>
              </div>
            </form>
          </div>

          {/* Right Hero Trust Architecture Card */}
          <div className="lg:col-span-5 min-w-0">
            <div className="bg-white text-brand-ink rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 border border-white/15">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-primary/10 pb-3.5">
                <BrandLogo variant="dark" size="sm" />
                <span className="text-xs font-mono tabular-nums text-brand-ink/65">
                  Zero leilão de leads
                </span>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-brand-link tracking-wide">
                  Exemplo ilustrativo
                </p>
                <h2 className="font-display font-bold text-base sm:text-lg text-brand-ink leading-snug">
                  Guarde o histórico de quem já fez um bom trabalho.
                </h2>
                <p className="text-xs sm:text-sm text-brand-ink/75 leading-relaxed">
                  A tela abaixo demonstra como um contato pode aparecer na sua lista. Não representa um profissional ou atendimento real.
                </p>
              </div>

              <div className="bg-brand-background rounded-xl p-3.5 sm:p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-brand-ink/75">
                  <span className="font-semibold text-brand-ink">
                    Profissional salvo por você
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-brand-ink">Seu histórico</span>
                </div>
                <p className="text-xs text-brand-ink/70">
                  Informações e avaliações só aparecem quando houver registros válidos.
                </p>
                <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                onClick={() => onNavigate('solicitar-novamente')}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary-hover transition-colors text-center cursor-pointer"
                  >
                    Solicitar novamente
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('indicacao-substituto')}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white border border-brand-primary/15 text-brand-ink text-xs font-medium hover:bg-brand-primary/5 transition-colors text-center cursor-pointer"
                  >
                    Ver indicação de substituto
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PROVA SOCIAL BAR */}
        <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-link/25 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-brand-accent-strong" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm text-white">
                Cadastro com verificação
              </p>
              <p className="text-xs text-white/70">
                Etapas para envio e análise de informações do perfil
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-link/25 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-brand-accent-strong" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm text-white">
                Histórico de atendimento
              </p>
              <p className="text-xs text-white/70">
                Avaliações aparecem após atendimentos registrados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-link/25 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-brand-accent-strong" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm text-white">
                Recontrate quem já fez bom trabalho
              </p>
              <p className="text-xs text-white/70">
                Histórico salvo em Meus Profissionais ou substituto de confiança
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIAS PRINCIPAIS */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-brand-link">
              Categorias de serviço da plataforma
            </p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
              Categorias em destaque
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('profissionais-compativeis')}
            className="text-xs sm:text-sm font-medium text-brand-link hover:text-brand-ink transition-colors inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>Explorar todos os profissionais compatíveis</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CATEGORIES_LIST.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => onSelectCategory(cat.name)}
              className="text-left bg-white hover:bg-white/95 rounded-2xl p-5 border border-brand-primary/10 hover:border-brand-link transition-all flex flex-col justify-between gap-4 group cursor-pointer min-w-0"
            >
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-brand-background group-hover:bg-brand-link/10 flex items-center justify-center transition-colors">
                  {CATEGORY_ICONS[cat.name]}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-brand-ink group-hover:text-brand-link transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-brand-ink/70 mt-1 leading-relaxed">
                    {cat.shortDesc}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-primary/10 flex items-center justify-between text-xs text-brand-ink/65 font-mono tabular-nums">
                <span>Conheça a categoria</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* PROFISSIONAIS DE CONFIANÇA EM DESTAQUE */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-brand-link">
              Perfis e informações de atendimento
            </p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
              Profissionais cadastrados
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('solicitar-novamente')}
            className="text-xs sm:text-sm font-medium text-brand-ink hover:text-brand-link transition-colors inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>Acessar Meus Profissionais de Confiança</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {featuredProviders.map((provider) => {
            const composite = calculateCompositeScore(provider).totalScore;
            return (
              <div
                key={provider.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-primary/10 flex flex-col justify-between gap-5 min-w-0"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white font-display font-bold text-base flex items-center justify-center shrink-0">
                        {provider.initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-base text-brand-ink leading-snug">
                          {provider.name}
                        </h3>
                        <p className="text-xs text-brand-ink/70 leading-snug mt-0.5">
                          {provider.category}
                        </p>
                      </div>
                    </div>
                    {provider.reviewsCount > 0 && (
                      <div className="text-right font-mono tabular-nums shrink-0">
                        <span className="text-sm font-bold text-brand-ink">
                          ★ {composite.toFixed(2)}
                        </span>
                        <p className="text-[11px] text-brand-ink/60">
                          {provider.reviewsCount} avaliações
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Clean unboxed trust metadata */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-brand-link font-medium">
                    {provider.isVerified && <span>✓ Cadastro analisado</span>}
                    {provider.isMentor && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Padrinho Verificado</span>
                      </>
                    )}
                    {provider.mentorName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Indicado por {provider.mentorName}</span>
                      </>
                    )}
                    {provider.previouslyHiredByCurrentUser && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-brand-accent-strong font-semibold">
                          Já atendeu você
                        </span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-brand-ink/75 line-clamp-2 leading-relaxed">
                    {provider.bio}
                  </p>

                  <p className="text-xs text-brand-ink/60">
                    Consulte o perfil para ver os detalhes informados pelo profissional.
                  </p>
                </div>

                <div className="pt-4 border-t border-brand-primary/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('perfil-prestador', provider.id)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-medium transition-colors text-center cursor-pointer"
                  >
                    Ver perfil e portfólio
                  </button>
                  {provider.previouslyHiredByCurrentUser ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('solicitar-novamente', provider.id)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white text-xs font-medium transition-colors text-center cursor-pointer"
                    >
                      Solicitar novamente
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate('criar-solicitacao', provider.id)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink text-xs font-medium transition-colors text-center cursor-pointer"
                    >
                      Pedir orçamento
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MAPA COMPLETO DE VALIDAÇÃO DAS 9 TELAS DO PROTÓTIPO */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-primary/10 pb-5">
          <div>
            <p className="text-xs font-semibold text-brand-accent-strong">
              Roteiro de Validação de Experiência — Cliente & Prestador
            </p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
              Navegue pelas 9 jornadas essenciais da plataforma Recontrate
            </h2>
          </div>
          <p className="text-xs text-brand-ink/70 max-w-md">
            Sem comissão sobre o serviço e sem pagamento dentro do app no MVP: o cliente negocia diretamente com o profissional de confiança.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              num: '01',
              title: 'Cadastro de cliente',
              desc: 'Onboarding rápido com bairro principal, categorias favoritas e controle de privacidade LGPD.',
              screen: 'cadastro-cliente' as ScreenId,
              audience: 'Público: Cliente',
            },
            {
              num: '02',
              title: 'Cadastro de prestador',
              desc: 'Especialidades, raio de atendimento, verificação de documentos e vínculo de apadrinhamento.',
              screen: 'cadastro-prestador' as ScreenId,
              audience: 'Público: Prestador',
            },
            {
              num: '03',
              title: 'Criação de solicitação de serviço',
              desc: 'Descrição do problema, fotos, bairro, urgência e autorização granular de contato.',
              screen: 'criar-solicitacao' as ScreenId,
              audience: 'Público: Cliente',
            },
            {
              num: '04',
              title: 'Lista de profissionais compatíveis',
              desc: 'Matching justo por compatibilidade, disponibilidade e reputação composta sem leilão.',
              screen: 'profissionais-compativeis' as ScreenId,
              audience: 'Público: Cliente',
            },
            {
              num: '05',
              title: 'Perfil do prestador com portfólio',
              desc: 'Vitrine pública com selo verificado, apadrinhamento, antes/depois e avaliações reais.',
              screen: 'perfil-prestador' as ScreenId,
              audience: 'Vitrine Pública',
            },
            {
              num: '06',
              title: 'Tela "Solicitar novamente"',
              desc: 'Recontratação em 1 clique de quem já atendeu você bem com histórico preservado.',
              screen: 'solicitar-novamente' as ScreenId,
              audience: 'Retenção / Recompra',
            },
            {
              num: '07',
              title: 'Tela de indicação de substituto',
              desc: 'Quando indisponível, o profissional indica até 2 colegas ou apadrinhados rastreáveis.',
              screen: 'indicacao-substituto' as ScreenId,
              audience: 'Rede de Confiança',
            },
            {
              num: '08',
              title: 'Avaliação pós-atendimento',
              desc: 'Avaliação multi-critério (qualidade, pontualidade, comunicação, organização) vinculada ao serviço.',
              screen: 'avaliacao-pos-atendimento' as ScreenId,
              audience: 'Reputação Auditável',
            },
            {
              num: '09',
              title: 'Painel do prestador',
              desc: 'Gestão de oportunidades via WhatsApp, score composto detalhado e planos por assinatura.',
              screen: 'painel-prestador' as ScreenId,
              audience: 'Público: Prestador',
            },
          ].map((item) => (
            <button
              key={item.screen}
              type="button"
              onClick={() => onNavigate(item.screen)}
              className="text-left p-5 rounded-2xl bg-brand-background/60 hover:bg-brand-background border border-brand-primary/10 hover:border-brand-link transition-all flex flex-col justify-between gap-4 group cursor-pointer"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-brand-ink/60">
                  <span className="font-mono font-semibold text-brand-link">
                    {item.num}. Fluxo
                  </span>
                  <span>{item.audience}</span>
                </div>
                <h3 className="font-display font-bold text-base text-brand-ink group-hover:text-brand-link transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-brand-ink/75 leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <span className="text-xs font-semibold text-brand-accent-strong inline-flex items-center gap-1">
                <span>Abrir tela</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
