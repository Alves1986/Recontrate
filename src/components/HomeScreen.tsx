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
import { ConfiareLogo } from './ConfiareLogo';
import { calculateCompositeScore } from '../utils/marketplaceRules';

interface HomeScreenProps {
  providers: ProviderProfile[];
  onStartSearch: (query: string, location: string, category?: CategoryName) => void;
  onSelectCategory: (category: CategoryName) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

const CATEGORY_ICONS: Record<CategoryName, React.ReactNode> = {
  Eletricista: <Zap className="w-5 h-5 text-[#1D6FE0]" />,
  Encanador: <Droplets className="w-5 h-5 text-[#1D6FE0]" />,
  Diarista: <Sparkles className="w-5 h-5 text-[#1D6FE0]" />,
  Pintor: <Paintbrush className="w-5 h-5 text-[#1D6FE0]" />,
  'Técnico de ar-condicionado': <Wind className="w-5 h-5 text-[#1D6FE0]" />,
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  providers,
  onStartSearch,
  onSelectCategory,
  onNavigate,
}) => {
  const [problemInput, setProblemInput] = useState('');
  const [locationInput, setLocationInput] = useState('Pinheiros, São Paulo');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSearch(problemInput, locationInput);
  };

  const featuredProviders = providers.slice(0, 3);

  return (
    <div className="space-y-12 sm:space-y-16 pb-12">
      {/* HERO SECTION */}
      <section className="bg-[#0A2540] text-white rounded-3xl p-6 sm:p-10 lg:p-14 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Hero Copy + Search */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-4">
              <ConfiareLogo variant="light-text" size="md" />
              <span className="text-white/40" aria-hidden="true">
                ·
              </span>
              <span className="text-xs sm:text-sm text-white/80 font-medium">
                Rede Local de Confiança
              </span>
            </div>

            <div className="space-y-4">
              <h1
                className="font-display font-bold text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.14] tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                Encontre o profissional certo para resolver o seu problema
              </h1>
              <p className="text-base sm:text-lg text-white/85 leading-relaxed max-w-2xl">
                Solicite o serviço, receba profissionais compatíveis e recontrate quem já atendeu você bem.
              </p>
            </div>

            {/* Search Bar Form + Primary & Secondary CTAs */}
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="bg-white rounded-2xl p-2.5 sm:p-3 text-[#0A2540] shadow-lg space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 items-center">
                <div className="sm:col-span-7 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#F4F2EF]/75 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1D6FE0]">
                  <Search className="w-5 h-5 text-[#1D6FE0] shrink-0" />
                  <div className="w-full min-w-0">
                    <label
                      htmlFor="home-search-what"
                      className="block text-[11px] font-medium text-[#0A2540]/65"
                    >
                      O que você precisa resolver?
                    </label>
                    <input
                      id="home-search-what"
                      type="text"
                      value={problemInput}
                      onChange={(e) => setProblemInput(e.target.value)}
                      placeholder="Ex.: Disjuntor desarmando, vazamento..."
                      className="w-full bg-transparent text-sm font-medium text-[#0A2540] placeholder:text-[#0A2540]/45 focus:outline-none truncate"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#F4F2EF]/75 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1D6FE0]">
                  <MapPin className="w-5 h-5 text-[#FF6A00] shrink-0" />
                  <div className="w-full min-w-0">
                    <label
                      htmlFor="home-search-where"
                      className="block text-[11px] font-medium text-[#0A2540]/65"
                    >
                      Onde?
                    </label>
                    <input
                      id="home-search-where"
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Bairro ou cidade"
                      className="w-full bg-transparent text-sm font-medium text-[#0A2540] placeholder:text-[#0A2540]/45 focus:outline-none truncate"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3.5 pt-1">
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
                  <button
                    type="submit"
                    className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-md whitespace-nowrap shrink-0 cursor-pointer"
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
            <div className="bg-white text-[#0A2540] rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 border border-white/15">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0A2540]/10 pb-3.5">
                <img
                  src="/assets/aistudio/IMG_4303_4b239f28.jpeg"
                  alt="Logo Oficial Confiare"
                  referrerPolicy="no-referrer"
                  className="h-9 sm:h-10 w-auto object-contain rounded"
                />
                <span className="text-xs font-mono tabular-nums text-[#0A2540]/65">
                  Zero leilão de leads
                </span>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[#1D6FE0] tracking-wide">
                  Rede de Confiança Rastreável
                </p>
                <h2 className="font-display font-bold text-base sm:text-lg text-[#0A2540] leading-snug">
                  O mesmo profissional de confiança — ou quem ele indica com responsabilidade.
                </h2>
                <p className="text-xs sm:text-sm text-[#0A2540]/75 leading-relaxed">
                  Quando o seu profissional habitual está com a agenda cheia, ele pode indicar até 2 substitutos verificados ou apadrinhados na rede.
                </p>
              </div>

              <div className="bg-[#F4F2EF] rounded-xl p-3.5 sm:p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-[#0A2540]/75">
                  <span className="font-semibold text-[#0A2540]">
                    João Batista Silva · Eletricista
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-[#0A2540]">
                    ★ 4.96 (94 avaliações)
                  </span>
                </div>
                <p className="text-xs text-[#0A2540]/70">
                  Selo Verificado · Padrinho na Rede · Tempo médio de resposta: 9 min
                </p>
                <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('solicitar-novamente', 'prov-joao')}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-[#0A2540] text-white text-xs font-medium hover:bg-[#13385c] transition-colors text-center cursor-pointer"
                  >
                    Solicitar novamente
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('indicacao-substituto')}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white border border-[#0A2540]/15 text-[#0A2540] text-xs font-medium hover:bg-[#0A2540]/5 transition-colors text-center cursor-pointer"
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
            <div className="w-10 h-10 rounded-xl bg-[#1D6FE0]/25 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm text-white">
                Prestadores verificados
              </p>
              <p className="text-xs text-white/70">
                Identidade, comprovante de endereço e histórico auditado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D6FE0]/25 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm text-white">
                Avaliações reais
              </p>
              <p className="text-xs text-white/70">
                Nota composta que combina qualidade, pontualidade e resposta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D6FE0]/25 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-[#FF6A00]" />
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
            <p className="text-xs font-semibold text-[#1D6FE0]">
              Especialidades disponíveis na sua região
            </p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0A2540]">
              Categorias em destaque
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('profissionais-compativeis')}
            className="text-xs sm:text-sm font-medium text-[#1D6FE0] hover:text-[#0A2540] transition-colors inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
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
              className="text-left bg-white hover:bg-white/95 rounded-2xl p-5 border border-[#0A2540]/10 hover:border-[#1D6FE0] transition-all flex flex-col justify-between gap-4 group cursor-pointer min-w-0"
            >
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#F4F2EF] group-hover:bg-[#1D6FE0]/10 flex items-center justify-center transition-colors">
                  {CATEGORY_ICONS[cat.name]}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#0A2540] group-hover:text-[#1D6FE0] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#0A2540]/70 mt-1 leading-relaxed">
                    {cat.shortDesc}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#0A2540]/10 flex items-center justify-between text-xs text-[#0A2540]/65 font-mono tabular-nums">
                <span>{cat.verifiedCount} verificados</span>
                <span>~{cat.avgResponseMin} min</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* PROFISSIONAIS DE CONFIANÇA EM DESTAQUE */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#1D6FE0]">
              Reputação construída por desempenho, nunca comprada
            </p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0A2540]">
              Profissionais verificados prontos para atender
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('solicitar-novamente')}
            className="text-xs sm:text-sm font-medium text-[#0A2540] hover:text-[#1D6FE0] transition-colors inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
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
                className="bg-white rounded-2xl p-5 sm:p-6 border border-[#0A2540]/10 flex flex-col justify-between gap-5 min-w-0"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#0A2540] text-white font-display font-bold text-base flex items-center justify-center shrink-0">
                        {provider.initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-base text-[#0A2540] leading-snug">
                          {provider.name}
                        </h3>
                        <p className="text-xs text-[#0A2540]/70 leading-snug mt-0.5">
                          {provider.category} · {provider.yearsExperience} anos de ofício
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <span className="text-sm font-bold text-[#0A2540]">
                        ★ {composite.toFixed(2)}
                      </span>
                      <p className="text-[11px] text-[#0A2540]/60">
                        {provider.reviewsCount} avaliações
                      </p>
                    </div>
                  </div>

                  {/* Clean unboxed trust metadata */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#1D6FE0] font-medium">
                    {provider.isVerified && <span>✓ Identidade Verificada</span>}
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
                        <span className="text-[#FF6A00] font-semibold">
                          Já atendeu você
                        </span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-[#0A2540]/75 line-clamp-2 leading-relaxed">
                    {provider.bio}
                  </p>

                  <p className="text-xs text-[#0A2540]/60">
                    Bairros: {provider.neighborhoods.slice(0, 3).join(', ')} · Resposta em ~
                    {provider.responseTimeMinutes} min
                  </p>
                </div>

                <div className="pt-4 border-t border-[#0A2540]/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('perfil-prestador', provider.id)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#0A2540] hover:bg-[#13385c] text-white text-xs font-medium transition-colors text-center cursor-pointer"
                  >
                    Ver perfil e portfólio
                  </button>
                  {provider.previouslyHiredByCurrentUser ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('solicitar-novamente', provider.id)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white text-xs font-medium transition-colors text-center cursor-pointer"
                    >
                      Solicitar novamente
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate('criar-solicitacao', provider.id)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540] text-xs font-medium transition-colors text-center cursor-pointer"
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
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0A2540]/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#0A2540]/10 pb-5">
          <div>
            <p className="text-xs font-semibold text-[#FF6A00]">
              Roteiro de Validação de Experiência — Cliente & Prestador
            </p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0A2540]">
              Navegue pelas 9 jornadas essenciais da plataforma Confiare
            </h2>
          </div>
          <p className="text-xs text-[#0A2540]/70 max-w-md">
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
              className="text-left p-5 rounded-2xl bg-[#F4F2EF]/60 hover:bg-[#F4F2EF] border border-[#0A2540]/10 hover:border-[#1D6FE0] transition-all flex flex-col justify-between gap-4 group cursor-pointer"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#0A2540]/60">
                  <span className="font-mono font-semibold text-[#1D6FE0]">
                    {item.num}. Fluxo
                  </span>
                  <span>{item.audience}</span>
                </div>
                <h3 className="font-display font-bold text-base text-[#0A2540] group-hover:text-[#1D6FE0] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-[#0A2540]/75 leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <span className="text-xs font-semibold text-[#FF6A00] inline-flex items-center gap-1">
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
