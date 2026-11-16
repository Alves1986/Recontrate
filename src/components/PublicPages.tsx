import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Droplets,
  HelpCircle,
  MapPin,
  Paintbrush,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Wind,
  Zap,
} from 'lucide-react';
import { CategoryName, ProviderProfile } from '../types/confiare';
import { CATEGORIES_LIST } from '../data/seedData';
import { calculateCompositeScore } from '../utils/marketplaceRules';

const CATEGORY_ICONS: Record<CategoryName, React.ReactNode> = {
  Eletricista: <Zap className="w-5 h-5 text-[#1D6FE0]" />,
  Encanador: <Droplets className="w-5 h-5 text-[#1D6FE0]" />,
  Diarista: <Sparkles className="w-5 h-5 text-[#1D6FE0]" />,
  Pintor: <Paintbrush className="w-5 h-5 text-[#1D6FE0]" />,
  'Técnico de ar-condicionado': <Wind className="w-5 h-5 text-[#1D6FE0]" />,
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
  const [locationInput, setLocationInput] = useState('Pinheiros, São Paulo');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSearch(problemInput, locationInput);
  };

  return (
    <div className="space-y-14 sm:space-y-20 pb-14">
      {/* 1. HERO SECTION */}
      <section className="bg-[#0A2540] text-white rounded-3xl p-6 sm:p-10 lg:p-14 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#FF6A00]">
              <ShieldCheck className="w-4 h-4" />
              <span>Rede Brasileira de Serviços Locais Verificados</span>
            </div>

            <div className="space-y-4">
              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.14] tracking-tight text-white">
                Encontre o profissional certo para resolver o seu problema
              </h1>
              <p className="text-base sm:text-lg text-white/85 leading-relaxed max-w-2xl">
                Solicite o serviço, receba profissionais compatíveis e recontrate quem já atendeu você bem.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="bg-white rounded-2xl p-2.5 sm:p-3 text-[#0A2540] shadow-lg space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 items-center">
                <div className="sm:col-span-7 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#F4F2EF]/75">
                  <Search className="w-5 h-5 text-[#1D6FE0] shrink-0" />
                  <div className="w-full min-w-0">
                    <label
                      htmlFor="landing-search-what"
                      className="block text-[11px] font-medium text-[#0A2540]/65"
                    >
                      O que você precisa resolver?
                    </label>
                    <input
                      id="landing-search-what"
                      type="text"
                      value={problemInput}
                      onChange={(e) => setProblemInput(e.target.value)}
                      placeholder="Ex.: Disjuntor desarmando, vazamento..."
                      className="w-full bg-transparent text-sm font-medium text-[#0A2540] placeholder:text-[#0A2540]/45 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#F4F2EF]/75">
                  <MapPin className="w-5 h-5 text-[#FF6A00] shrink-0" />
                  <div className="w-full min-w-0">
                    <label
                      htmlFor="landing-search-where"
                      className="block text-[11px] font-medium text-[#0A2540]/65"
                    >
                      Onde?
                    </label>
                    <input
                      id="landing-search-where"
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Bairro ou cidade"
                      className="w-full bg-transparent text-sm font-medium text-[#0A2540] placeholder:text-[#0A2540]/45 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Encontrar um profissional</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateUrl('/para-prestadores')}
                  className="min-h-[48px] px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-display font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Quero receber clientes</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white text-[#0A2540] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#0A2540]/10 pb-3">
                <span className="text-xs font-semibold text-[#1D6FE0]">
                  Reputação Composta Auditável
                </span>
                <span className="text-xs font-mono text-[#0A2540]/65">
                  0% comissão sobre serviços
                </span>
              </div>
              <h2 className="font-display font-bold text-lg text-[#0A2540]">
                Profissionais avaliados por qualidade, pontualidade e agilidade real.
              </h2>
              <p className="text-xs text-[#0A2540]/75 leading-relaxed">
                Na Confiare, estrelas nunca são compradas. Você escolhe com base no histórico real e só libera seu WhatsApp para quem desejar.
              </p>
              <div className="bg-[#F4F2EF] rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span>João Batista Silva · Eletricista NR-10</span>
                  <span className="font-mono">★ 4.96 (94 aval.)</span>
                </div>
                <p className="text-[#0A2540]/70">
                  Pinheiros, Vila Madalena e Jardins · Resposta média em 9 min
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. FAIXA DE CONFIANÇA */}
        <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D6FE0]/25 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-white">
                Prestadores verificados
              </p>
              <p className="text-xs text-white/70">
                Documentos, comprovante de endereço e histórico validados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D6FE0]/25 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-white">
                Avaliações reais
              </p>
              <p className="text-xs text-white/70">
                Nota composta multicritério vinculada a atendimentos reais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D6FE0]/25 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-white">
                Recontrate quem já fez bom trabalho
              </p>
              <p className="text-xs text-white/70">
                Sua lista pessoal de profissionais de confiança sempre à mão
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CATEGORIAS POPULARES */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#1D6FE0]">
              Especialidades disponíveis na sua região
            </p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0A2540]">
              Categorias populares
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateUrl('/encontrar-profissional')}
            className="text-xs sm:text-sm font-medium text-[#1D6FE0] hover:text-[#0A2540] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Ver todos os profissionais</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CATEGORIES_LIST.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => onSelectCategory(cat.name)}
              className="text-left bg-white rounded-2xl p-5 border border-[#0A2540]/10 hover:border-[#1D6FE0] transition-all flex flex-col justify-between gap-4 group cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#F4F2EF] flex items-center justify-center">
                  {CATEGORY_ICONS[cat.name]}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#0A2540] group-hover:text-[#1D6FE0]">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#0A2540]/70 mt-1 leading-relaxed">
                    {cat.shortDesc}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-[#0A2540]/10 flex items-center justify-between text-xs text-[#0A2540]/65 font-mono">
                <span>{cat.verifiedCount} verificados</span>
                <span>~{cat.avgResponseMin} min</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. SEÇÃO "COMO FUNCIONA" EM 3 PASSOS */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#0A2540]/10 space-y-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold text-[#FF6A00]">
            Simples, Transparente e Sem Leilão
          </p>
          <h2 className="font-display font-bold text-2xl text-[#0A2540]">
            Como funciona a Confiare em 3 passos
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-[#F4F2EF]/60 space-y-2">
            <span className="font-mono font-bold text-sm text-[#1D6FE0]">
              Passo 01
            </span>
            <h3 className="font-display font-bold text-base text-[#0A2540]">
              Descreva o que precisa resolver
            </h3>
            <p className="text-xs text-[#0A2540]/75 leading-relaxed">
              Informe a especialidade, o bairro e a urgência. Seu telefone fica protegido até você escolher com quem falar.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#F4F2EF]/60 space-y-2">
            <span className="font-mono font-bold text-sm text-[#1D6FE0]">
              Passo 02
            </span>
            <h3 className="font-display font-bold text-base text-[#0A2540]">
              Compare profissionais compatíveis
            </h3>
            <p className="text-xs text-[#0A2540]/75 leading-relaxed">
              Veja a Nota Composta real, fotos Antes/Depois e tempo médio de resposta dos profissionais que atendem seu bairro.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#F4F2EF]/60 space-y-2">
            <span className="font-mono font-bold text-sm text-[#1D6FE0]">
              Passo 03
            </span>
            <h3 className="font-display font-bold text-base text-[#0A2540]">
              Combine direto pelo WhatsApp e salve na sua rede
            </h3>
            <p className="text-xs text-[#0A2540]/75 leading-relaxed">
              Negocie diretamente sem taxas da plataforma, avalie o atendimento e recontrate em 1 clique sempre que precisar.
            </p>
          </div>
        </div>
      </section>

      {/* 5. SEÇÃO DE RECOMPRA + 6. SEÇÃO DE INDICAÇÃO DE SUBSTITUTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0A2540]/10 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D6FE0]">
              <RotateCcw className="w-4 h-4" />
              Memória de Confiança
            </span>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0A2540]">
              Já atendeu você bem? Solicite novamente em um clique.
            </h2>
            <p className="text-xs sm:text-sm text-[#0A2540]/75 leading-relaxed">
              Chega de perder contatos no celular. Todos os profissionais que já fizeram um bom serviço ficam salvos no seu histórico com data e resumo do atendimento.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateUrl('/entrar')}
            className="self-start min-h-[42px] px-5 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#13385c] text-white text-xs font-semibold cursor-pointer"
          >
            Acessar meus profissionais de confiança
          </button>
        </section>

        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0A2540]/10 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF6A00]">
              <UserCheck className="w-4 h-4" />
              Continuidade com Responsabilidade
            </span>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0A2540]">
              Indicação de substituto de confiança quando a agenda estiver cheia
            </h2>
            <p className="text-xs sm:text-sm text-[#0A2540]/75 leading-relaxed">
              Se o seu profissional de confiança estiver em outro atendimento, ele pode indicar até 2 colegas verificados da rede Confiare — e você decide se autoriza o contato.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateUrl('/como-funciona')}
            className="self-start min-h-[42px] px-5 py-2.5 rounded-xl bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540] text-xs font-semibold cursor-pointer"
          >
            Conhecer a rede de substituição e apadrinhamento
          </button>
        </section>
      </div>

      {/* 7. VITRINE DE PROFISSIONAIS & DEPOIMENTOS REAIS */}
      <section className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-[#1D6FE0]">
            Profissionais Verificados e Depoimentos Reais
          </p>
          <h2 className="font-display font-bold text-2xl text-[#0A2540]">
            Quem contrata pela Confiare recomenda
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {providers.slice(0, 3).map((prov) => {
            const score = calculateCompositeScore(prov).totalScore;
            return (
              <div
                key={prov.id}
                className="bg-white rounded-2xl p-6 border border-[#0A2540]/10 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-base text-[#0A2540]">
                      {prov.name}
                    </h3>
                    <span className="font-mono text-sm font-bold text-[#0A2540]">
                      ★ {score.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-[#1D6FE0] font-semibold">
                    {prov.category} · {prov.city}
                  </p>
                  <p className="text-xs text-[#0A2540]/75 italic">
                    “{prov.reviews[0]?.comment || prov.bio}”
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateUrl(`/profissionais/${prov.id}`)}
                  className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540] text-xs font-semibold cursor-pointer"
                >
                  Ver perfil público
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. SEÇÃO DEDICADA AO PRESTADOR */}
      <section className="bg-[#0A2540] text-white rounded-3xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8 space-y-3">
          <p className="text-xs font-semibold text-[#FF6A00]">
            Para Profissionais Autônomos
          </p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl">
            Trabalhe com agenda previsível, 0% de comissão e sem leilão de leads
          </h2>
          <p className="text-sm text-white/80 leading-relaxed">
            Você define seu próprio preço, recebe oportunidades compatíveis no seu raio de atuação e constrói uma vitrine digital profissional que valoriza seu ofício.
          </p>
        </div>
        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
          <button
            type="button"
            onClick={() => onNavigateUrl('/para-prestadores')}
            className="min-h-[46px] px-6 py-3 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-sm cursor-pointer"
          >
            Quero receber clientes
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
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#0A2540]/10 space-y-6">
        <div>
          <p className="text-xs font-semibold text-[#1D6FE0]">
            Dúvidas Frequentes
          </p>
          <h2 className="font-display font-bold text-2xl text-[#0A2540]">
            Perguntas frequentes sobre a Confiare
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-[#F4F2EF]/60 space-y-1.5">
            <h3 className="font-bold text-sm text-[#0A2540]">
              O cliente paga alguma taxa para usar a Confiare?
            </h3>
            <p className="text-[#0A2540]/75 leading-relaxed">
              Não. Para o cliente, buscar profissionais, solicitar orçamentos e recontratar é 100% gratuito e sem anúncios.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#F4F2EF]/60 space-y-1.5">
            <h3 className="font-bold text-sm text-[#0A2540]">
              A plataforma cobra comissão sobre o serviço do prestador?
            </h3>
            <p className="text-[#0A2540]/75 leading-relaxed">
              Nunca. O profissional autônomo define seu próprio preço e recebe 100% do valor combinado diretamente com o cliente.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#F4F2EF]/60 space-y-1.5">
            <h3 className="font-bold text-sm text-[#0A2540]">
              Planos pagos compram estrelas ou posição garantida?
            </h3>
            <p className="text-[#0A2540]/75 leading-relaxed">
              Não. A Nota Composta depende apenas de avaliações reais, tempo e taxa de resposta. Planos ampliam o limite mensal de oportunidades, sem jamais comprar reputação.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#F4F2EF]/60 space-y-1.5">
            <h3 className="font-bold text-sm text-[#0A2540]">
              Como funciona a privacidade do meu WhatsApp (LGPD)?
            </h3>
            <p className="text-[#0A2540]/75 leading-relaxed">
              Seu número permanece mascarado e só é liberado após o seu consentimento explícito e confirmação de interesse do profissional compatível.
            </p>
          </div>
        </div>
      </section>

      {/* 10. CTA FINAL DUPLO */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#0A2540]/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0A2540]">
            Pronto para resolver seu serviço com confiança?
          </h2>
          <p className="text-xs sm:text-sm text-[#0A2540]/75">
            Crie sua conta gratuita em menos de 1 minuto ou cadastre-se como profissional verificado.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateUrl('/encontrar-profissional')}
            className="min-h-[46px] px-6 py-3 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-xs sm:text-sm cursor-pointer"
          >
            Encontrar um profissional
          </button>
          <button
            type="button"
            onClick={() => onNavigateUrl('/para-prestadores')}
            className="min-h-[46px] px-6 py-3 rounded-xl bg-[#0A2540] hover:bg-[#13385c] text-white font-display font-semibold text-xs sm:text-sm cursor-pointer"
          >
            Quero receber clientes
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
    <div className="space-y-12 pb-12">
      <section className="bg-[#0A2540] text-white rounded-3xl p-8 sm:p-12 space-y-6">
        <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#FF6A00]">
          Confiare para Prestadores Autônomos
        </span>
        <h1 className="font-display font-bold text-3xl sm:text-4xl max-w-3xl leading-tight">
          Aumente seu faturamento com oportunidades compatíveis e assinatura previsível
        </h1>
        <p className="text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
          Sem comissão sobre o seu serviço e sem leilão predatório de moedas. Construa sua reputação verificada, apareça nas buscas locais do seu bairro e fidelize clientes.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigateUrl('/criar-conta?role=prestador')}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-sm cursor-pointer"
          >
            Quero receber clientes
          </button>
          <button
            type="button"
            onClick={() => onNavigateUrl('/planos')}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-display font-semibold text-sm cursor-pointer"
          >
            Ver comparativo de planos
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: '1. Aumentar faturamento (0% comissão)',
            desc: 'Você define seu próprio preço e recebe 100% do valor combinado diretamente do cliente via Pix ou cartão.',
          },
          {
            title: '2. Receber oportunidades compatíveis',
            desc: 'Pedidos filtrados pela sua categoria, especialidades e raio de atendimento, sem desperdiçar tempo.',
          },
          {
            title: '3. Construir reputação sólida',
            desc: 'Sua Nota Composta valoriza qualidade, pontualidade e agilidade de resposta — estrelas nunca são vendidas.',
          },
          {
            title: '4. Aparecer nas buscas locais',
            desc: 'Vitrine pública otimizada com portfólio Antes/Depois, selo verificado e link direto para compartilhar.',
          },
          {
            title: '5. Assinatura mensal previsível',
            desc: 'Comece no plano Gratuito (até 5 oportunidades/mês) e evolua para Essencial, Profissional ou Premium quando quiser.',
          },
          {
            title: '6. Sem leilão de leads',
            desc: 'Não vendemos o mesmo pedido para 15 profissionais simultaneamente cobrando por clique.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-3xl p-6 border border-[#0A2540]/10 space-y-2"
          >
            <CheckCircle2 className="w-5 h-5 text-[#FF6A00]" />
            <h2 className="font-display font-bold text-base text-[#0A2540]">
              {item.title}
            </h2>
            <p className="text-xs text-[#0A2540]/75 leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TermsAndPrivacyPage: React.FC<{
  mode: 'termos' | 'privacidade';
}> = ({ mode }) => {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 border border-[#0A2540]/10 space-y-6 mb-12">
      <p className="text-xs font-semibold text-[#1D6FE0]">
        Governança Jurídica & Conformidade LGPD (Lei 13.709/2018)
      </p>
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0A2540]">
        {mode === 'termos'
          ? 'Termos de Uso da Plataforma Confiare'
          : 'Política de Privacidade e Proteção de Dados (LGPD)'}
      </h1>
      <div className="space-y-4 text-xs sm:text-sm text-[#0A2540]/80 leading-relaxed">
        <p>
          <strong>1. Autonomia do Prestador e Isenção de Comissão:</strong> A Confiare atua como vitrine tecnológica e motor de conexão local por assinatura. O prestador é autônomo, define livremente seus preços e negocia diretamente com o cliente, sem cobrança de comissão sobre o serviço.
        </p>
        <p>
          <strong>2. Proteção de Contatos e Consentimento Granular (LGPD):</strong> O nome completo e o WhatsApp do cliente permanecem protegidos e mascarados, sendo liberados exclusivamente após o consentimento explícito do cliente e confirmação de interesse do profissional compatível.
        </p>
        <p>
          <strong>3.Integridade da Reputação:</strong> Avaliações e estrelas refletem exclusivamente a experiência real de clientes verificados e indicadores objetivos de atendimento, jamais podendo ser compradas.
        </p>
      </div>
    </div>
  );
};
