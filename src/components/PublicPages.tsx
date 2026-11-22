import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Droplets,
  MapPin,
  Paintbrush,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wind,
  Zap,
} from 'lucide-react';
import { CategoryName, ProviderProfile } from '../types/confiare';
import { CATEGORIES_LIST } from '../data/seedData';
import { BrandLogo } from './BrandLogo';

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
  const [interestEmail, setInterestEmail] = useState('');
  const [interestLocation, setInterestLocation] = useState('');
  const [interestCategory, setInterestCategory] = useState<string>('Eletricista');
  const [interestConsent, setInterestConsent] = useState(false);
  const [interestHoneypot, setInterestHoneypot] = useState('');
  const [interestFeedback, setInterestFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const publishedProviders = providers.filter((provider) => provider.isVerified);
  const coveredLocations = Array.from(
    new Set(
      publishedProviders.flatMap((p) =>
        p.neighborhoods.map((n) => `${n}${p.city ? ` (${p.city})` : ''}`)
      )
    )
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSearch(problemInput, locationInput);
  };

  const handleInterestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInterestFeedback(null);
    if (interestHoneypot.trim() !== '') {
      return;
    }
    if (!interestEmail.trim() || !interestLocation.trim()) {
      setInterestFeedback({
        type: 'error',
        message: 'Informe seu e-mail e a cidade ou bairro de interesse.',
      });
      return;
    }
    if (!interestConsent) {
      setInterestFeedback({
        type: 'error',
        message:
          'Marque a caixa de consentimento para autorizar o registro de interesse no piloto.',
      });
      return;
    }
    setInterestFeedback({
      type: 'success',
      message: `Interesse registrado localmente no ambiente de preview para ${interestCategory} em ${interestLocation}. Nenhum dado foi enviado para serviços externos.`,
    });
    setInterestEmail('');
    setInterestLocation('');
    setInterestConsent(false);
  };

  return (
    <div className="space-y-14 sm:space-y-20 pb-14">
      {/* 1. HERO SECTION */}
      <section className="bg-brand-primary text-white rounded-3xl p-6 sm:p-10 lg:p-14 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <BrandLogo variant="light" size="sm" decorative />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-brand-accent-contrast">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Encontrar, guardar e recontratar bons profissionais</span>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-[2.65rem] leading-[1.15] tracking-tight text-white">
                Encontre um bom profissional. E, quando ele resolver, contrate de novo com mais confiança.
              </h1>
              <p className="text-base sm:text-lg text-white/85 leading-relaxed max-w-2xl">
                Um jeito mais simples de encontrar profissionais de serviços residenciais e manter por perto quem já fez um bom trabalho.
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
                  <span>Quero encontrar um profissional</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateUrl('/para-prestadores')}
                  className="min-h-[48px] px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-display font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sou profissional</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white text-brand-ink rounded-2xl p-6 space-y-4">
              <p className="text-xs font-semibold text-brand-link">
                Proposta de valor transparente
              </p>
              <h2 className="font-display font-bold text-lg text-brand-ink">
                Memória de quem já atendeu bem a sua casa.
              </h2>
              <p className="text-xs text-brand-ink/75 leading-relaxed">
                Em vez de recomeçar do zero a cada imprevisto, o Recontrate organiza a busca por especialidade e localidade, registra o histórico do atendimento e facilita chamar novamente o mesmo profissional — ou receber uma indicação de substituto com consentimento quando ele não puder atender.
              </p>
              <div className="pt-2 border-t border-brand-primary/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-brand-ink/70">
                <span>Estágio atual: Piloto em validação</span>
                <button
                  type="button"
                  onClick={() => onNavigateUrl('/demo')}
                  className="font-semibold text-brand-link hover:underline cursor-pointer"
                >
                  Explorar demonstração interativa →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pilares principais da proposta */}
        <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-sm text-white/90">
            <p className="font-display font-semibold">Recontratação simples</p>
            <p className="text-xs text-white/75">
              Guarde o histórico de quem já atendeu você e solicite novamente sem perder o contexto.
            </p>
          </div>
          <div className="text-sm text-white/90">
            <p className="font-display font-semibold">Continuidade com consentimento</p>
            <p className="text-xs text-white/75">
              Se o profissional estiver com agenda ocupada, ele pode sugerir um substituto que você escolhe aceitar ou recusar.
            </p>
          </div>
          <div className="text-sm text-white/90">
            <p className="font-display font-semibold">Autonomia do prestador</p>
            <p className="text-xs text-white/75">
              Você não paga comissão à plataforma nem taxa por lead. Todo valor e pagamento do serviço são negociados diretamente com o cliente, fora da plataforma.
            </p>
          </div>
        </div>
      </section>

      {/* 2. PROPOSTA PARA CLIENTES E PARA PROFISSIONAIS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-brand-link">Para Clientes</p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
              Busque, compare critérios claros e volte a chamar quem resolveu.
            </h2>
            <p className="text-xs sm:text-sm text-brand-ink/75 leading-relaxed">
              Consulte perfis por categoria e bairro, veja as especialidades declaradas e mantenha seu histórico de prestadores de confiança em um só lugar. A busca exibe apenas perfis ativos e não promete disponibilidade imediata onde ainda não houver cobertura confirmada.
            </p>
            <ul className="space-y-2 text-xs text-brand-ink/85 pt-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-link shrink-0 mt-0.5" />
                <span>Busca por especialidade residencial e localidade informada no perfil.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-link shrink-0 mt-0.5" />
                <span>Atalho de recontratação para repetir um atendimento anterior com histórico salvo.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-link shrink-0 mt-0.5" />
                <span>Liberdade para aceitar ou recusar indicações de substituto quando o titular não puder atender.</span>
              </li>
            </ul>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigateUrl('/encontrar-profissional')}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-display font-semibold text-xs sm:text-sm cursor-pointer inline-flex items-center gap-2"
            >
              <span>Buscar profissionais disponíveis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-brand-accent-strong">
              Para Profissionais Autônomos
            </p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
              Construa reputação verificável e facilite a recontratação pelos seus clientes.
            </h2>
            <p className="text-xs sm:text-sm text-brand-ink/75 leading-relaxed">
              Organize seu perfil público com até 5 especialidades oficiais, bairros de atuação e portfólio de serviços realizados. O modelo foi desenhado para operar por assinatura mensal transparente — sem comissão paga à plataforma e sem venda de leads avulsos — todo valor do serviço é negociado diretamente com o cliente, fora da plataforma.
            </p>
            <ul className="space-y-2 text-xs text-brand-ink/85 pt-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-accent-strong shrink-0 mt-0.5" />
                <span>Você não paga comissão ao Recontrate: 100% do valor negociado e pago pelo cliente fica com você, diretamente fora da plataforma.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-accent-strong shrink-0 mt-0.5" />
                <span>Piloto inicial de 60 a 90 dias gratuitos, sem cartão e sem conversão automática.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-accent-strong shrink-0 mt-0.5" />
                <span>Ferramenta de indicação de substituto para não deixar seu cliente sem resposta quando a agenda lotar.</span>
              </li>
            </ul>
          </div>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigateUrl('/para-prestadores')}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-xs sm:text-sm cursor-pointer inline-flex items-center gap-2"
            >
              <span>Conhecer proposta para profissionais</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateUrl('/planos')}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-display font-semibold text-xs sm:text-sm cursor-pointer"
            >
              Ver planos e oferta de piloto
            </button>
          </div>
        </div>
      </section>

      {/* 3. COMO FUNCIONA (CLIENTES E PROFISSIONAIS) */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-brand-primary/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-brand-link">
              Fluxo Operacional Implementado
            </p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
              Como funciona na prática
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateUrl('/demo')}
            className="text-xs font-semibold text-brand-link hover:underline cursor-pointer"
          >
            Testar todos os passos no ambiente de demonstração (/demo) →
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          <div className="rounded-2xl p-5 bg-brand-background/60 border border-brand-primary/10 space-y-4">
            <h3 className="font-display font-bold text-base text-brand-ink">
              Jornada do Cliente
            </h3>
            <ol className="space-y-3 text-brand-ink/85">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-primary text-white font-mono font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <p className="font-semibold text-brand-ink">Descreva o problema e a localidade</p>
                  <p className="text-brand-ink/70 mt-0.5">
                    Use a busca por categoria e bairro ou crie uma solicitação detalhando urgência e horário preferencial.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-primary text-white font-mono font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <p className="font-semibold text-brand-ink">Compare perfis ou acione quem já atendeu você</p>
                  <p className="text-brand-ink/70 mt-0.5">
                    Consulte especialidades, portfólio e histórico. Se já contratou antes, use o fluxo "Solicitar novamente".
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-primary text-white font-mono font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <p className="font-semibold text-brand-ink">Avalie o atendimento e construa sua rede</p>
                  <p className="text-brand-ink/70 mt-0.5">
                    Após o serviço, registre sua avaliação por critérios (qualidade, pontualidade, comunicação e limpeza).
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="rounded-2xl p-5 bg-brand-background/60 border border-brand-primary/10 space-y-4">
            <h3 className="font-display font-bold text-base text-brand-ink">
              Jornada do Profissional
            </h3>
            <ol className="space-y-3 text-brand-ink/85">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-accent-strong text-white font-mono font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <p className="font-semibold text-brand-ink">Cadastre seu perfil e especialidades oficiais</p>
                  <p className="text-brand-ink/70 mt-0.5">
                    No onboarding, defina sua categoria principal, até 5 especialidades oficiais e seus bairros de atuação.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-accent-strong text-white font-mono font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <p className="font-semibold text-brand-ink">Gerencie oportunidades e disponibilidade no painel</p>
                  <p className="text-brand-ink/70 mt-0.5">
                    Alterne seu status de agenda, acompanhe avisos de novas solicitações compatíveis e libere o contato sem pagar por lead.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-accent-strong text-white font-mono font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <p className="font-semibold text-brand-ink">Mantenha a continuidade e fidelize clientes</p>
                  <p className="text-brand-ink/70 mt-0.5">
                    Responda avaliações no seu perfil e, quando não puder atender, indique até 2 colegas substitutos com transparência.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* 4. CONFIANÇA, REPUTAÇÃO E INDICAÇÃO DE SUBSTITUTO */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft text-brand-primary text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Confiança e Reputação com Critérios Claros</span>
          </div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
            Como tratamos avaliações, nota composta e limites de verificação
          </h2>
          <p className="text-xs sm:text-sm text-brand-ink/75 leading-relaxed">
            A reputação no sistema é calculada por regras determinísticas auditáveis: avaliações pós-atendimento (qualidade, pontualidade, comunicação e organização), histórico de serviços registrados, taxa e tempo de resposta e completude do perfil.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1">
              <p className="font-bold text-brand-ink">Direito de resposta visível</p>
              <p className="text-brand-ink/75">
                O modelo de avaliação inclui campo para resposta pública do prestador e registro contextual do serviço realizado.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1">
              <p className="font-bold text-brand-ink">Limites atuais da verificação</p>
              <p className="text-brand-ink/75">
                O selo de perfil verificado identifica cadastros ativos com e-mail e especialidades validados na plataforma; não representa garantia de execução nem certificação policial ou trabalhista.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/15 text-brand-accent-strong text-xs font-semibold">
              <UserCheck className="w-4 h-4" />
              <span>Continuidade do Atendimento</span>
            </div>
            <h2 className="font-display font-bold text-xl text-brand-ink">
              Indicação de substituto com consentimento do cliente
            </h2>
            <p className="text-xs sm:text-sm text-brand-ink/75 leading-relaxed">
              Quando um profissional já conhecido não pode atender na data solicitada, ele pode indicar até 2 profissionais substitutos informando o motivo (como agenda cheia ou distância).
            </p>
            <p className="text-xs text-brand-ink/75 leading-relaxed">
              <strong>Controle total do cliente:</strong> a indicação exibe claramente quem indicou e por quê. O cliente pode aceitar um dos substitutos, recusar a sugestão ou voltar para a busca geral. Substitutos não recebem verificação automática apenas por terem sido indicados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateUrl('/demo')}
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink text-xs font-semibold cursor-pointer"
          >
            Ver tela de indicação de substituto na demonstração →
          </button>
        </div>
      </section>

      {/* 5. CATEGORIAS E COBERTURA REAL */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-brand-link">
              Foco Inicial em Eletricista, Encanador e Reparos Residenciais
            </p>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-brand-ink">
              Categorias e cobertura atual do piloto
            </h2>
            <p className="text-xs sm:text-sm text-brand-ink/70 mt-1">
              Mostramos apenas categorias cadastradas no sistema e localidades informadas por perfis verificados publicados — sem sugerir cobertura nacional.
            </p>
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
                <span>Consultar perfis</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>

        {/* Cobertura real baseada nos dados retornados + formulário de interesse por localidade */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-4">
            <p className="text-xs font-semibold text-brand-link">
              Perfis Verificados e Localidades Publicadas
            </p>
            <h3 className="font-display font-bold text-lg sm:text-xl text-brand-ink">
              {publishedProviders.length > 0
                ? `${publishedProviders.length} perfil(is) verificado(s) publicado(s) no ambiente atual`
                : 'Nenhum perfil verificado publicado no banco de dados atual'}
            </h3>
            {coveredLocations.length > 0 && (
              <p className="text-xs text-brand-ink/70">
                Bairros informados nos perfis publicados: <strong>{coveredLocations.join(', ')}</strong>.
              </p>
            )}

            {publishedProviders.length === 0 ? (
              <div className="rounded-2xl p-5 bg-brand-background/60 border border-brand-primary/10 text-xs text-brand-ink/80 space-y-2">
                <p className="font-semibold text-brand-ink">
                  Estado honesto de cobertura: ainda não há perfis verificados publicados nesta base.
                </p>
                <p>
                  Não exibimos profissionais, avaliações ou números fictícios como se fossem reais na vitrine pública. Use o formulário ao lado para indicar sua localidade para o piloto ou acesse o modo de demonstração para testar os fluxos completos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {publishedProviders.slice(0, 4).map((provider) => (
                  <div
                    key={provider.id}
                    className="bg-brand-background/50 rounded-2xl p-4 border border-brand-primary/10 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-display font-bold text-sm text-brand-ink">
                          {provider.name}
                        </h4>
                        <span className="text-[11px] font-semibold text-brand-link">
                          Perfil verificado
                        </span>
                      </div>
                      <p className="text-xs text-brand-link font-semibold">
                        {provider.category}
                        {provider.city ? ` · ${provider.city}` : ''}
                      </p>
                      {provider.neighborhoods.length > 0 && (
                        <p className="text-[11px] text-brand-ink/65">
                          Bairros informados: {provider.neighborhoods.join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateUrl(`/profissionais/${provider.id}`)}
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-brand-surface-hover text-brand-ink text-xs font-semibold border border-brand-primary/10 cursor-pointer"
                    >
                      Ver informações do perfil
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-brand-primary/10 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-brand-accent-strong">
                Lista de Interesse por Localidade · Piloto
              </p>
              <h3 className="font-display font-bold text-lg text-brand-ink">
                Sua cidade ou bairro ainda não tem cobertura confirmada?
              </h3>
              <p className="text-xs text-brand-ink/70 leading-relaxed">
                Registre seu interesse com dados mínimos (sem CPF, RG ou endereço completo). Na fase de preview, este registro fica restrito ao ambiente de teste e não envia dados para terceiros.
              </p>
            </div>

            {interestFeedback && (
              <div
                role="status"
                className={`p-3.5 rounded-xl text-xs font-medium ${
                  interestFeedback.type === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                }`}
              >
                {interestFeedback.message}
              </div>
            )}

            <form onSubmit={handleInterestSubmit} className="space-y-3 text-xs">
              <div className="hidden" aria-hidden="true">
                <label htmlFor="interest-company-website">Não preencha este campo</label>
                <input
                  id="interest-company-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={interestHoneypot}
                  onChange={(e) => setInterestHoneypot(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="interest-email"
                  className="font-semibold text-brand-ink"
                >
                  E-mail de contato
                </label>
                <input
                  id="interest-email"
                  type="email"
                  required
                  value={interestEmail}
                  onChange={(e) => setInterestEmail(e.target.value)}
                  placeholder="voce@email.com.br"
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/15 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="interest-location"
                    className="font-semibold text-brand-ink"
                  >
                    Cidade / Bairro
                  </label>
                  <input
                    id="interest-location"
                    type="text"
                    required
                    value={interestLocation}
                    onChange={(e) => setInterestLocation(e.target.value)}
                    placeholder="Ex.: Pinheiros, São Paulo"
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/15 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="interest-category"
                    className="font-semibold text-brand-ink"
                  >
                    Especialidade principal
                  </label>
                  <select
                    id="interest-category"
                    value={interestCategory}
                    onChange={(e) => setInterestCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/15 text-sm bg-white"
                  >
                    {CATEGORIES_LIST.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={interestConsent}
                  onChange={(e) => setInterestConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-brand-ink/80 leading-relaxed">
                  Autorizo o registro mínimo para aviso sobre o piloto na minha localidade, ciente dos{' '}
                  <button
                    type="button"
                    onClick={() => onNavigateUrl('/privacidade')}
                    className="underline font-semibold text-brand-link cursor-pointer"
                  >
                    avisos de privacidade em revisão
                  </button>
                  .
                </span>
              </label>

              <button
                type="submit"
                className="w-full min-h-[42px] px-4 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold cursor-pointer"
              >
                Enviar interesse e receber novidades
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 6. RESUMO DE PLANOS COMERCIAIS E PROMOÇÃO DE 90 DIAS GRÁTIS */}
      <section className="bg-brand-primary text-white rounded-3xl p-6 sm:p-10 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <p className="text-xs font-semibold text-brand-accent-contrast">
              Planos Comerciais para Profissionais · Promoção de Lançamento: 90 dias grátis
            </p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">
              Assinatura previsível, sem comissão à plataforma e negociação 100% direta
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Comece grátis e evolua conforme sua demanda cresce. Novos assinantes mensais recebem{' '}
              <strong>90 dias grátis nos planos pagos (R$ 0,00 nos 3 primeiros meses)</strong> ou 2 meses grátis no plano anual, com cobrança recorrente via Asaas em Pix, Cartão ou Boleto.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateUrl('/planos')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-xs sm:text-sm shrink-0 cursor-pointer"
          >
            Ver todos os planos e ativar 90 dias grátis →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-white/10 rounded-2xl p-5 space-y-2 border border-white/10">
            <p className="font-display font-bold text-base">Gratuito — R$ 0/mês</p>
            <p className="text-white/80">
              Perfil básico, contato direto por WhatsApp e até 5 oportunidades/mês com anúncios moderados no painel.
            </p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5 space-y-2 border border-white/10">
            <p className="font-display font-bold text-base">Essencial — R$ 29,90/mês</p>
            <p className="text-brand-accent-contrast font-mono font-semibold">
              90 dias grátis (R$ 0,00 nos 3 primeiros meses)
            </p>
            <p className="text-white/80">
              Perfil completo, portfólio até 10 fotos, até 15 oportunidades/mês e painel sem anúncios.
            </p>
          </div>
          <div className="bg-white/15 rounded-2xl p-5 space-y-2 border border-brand-accent-contrast">
            <p className="font-display font-bold text-base">Profissional — R$ 59,90/mês</p>
            <p className="text-brand-accent-contrast font-mono font-semibold">
              90 dias grátis (R$ 0,00 nos 3 primeiros meses)
            </p>
            <p className="text-white/85">
              Mais escolhido: portfólio ilimitado, até 40 oportunidades/mês, destaque local e selo Profissional Recontrate.
            </p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5 space-y-2 border border-white/10">
            <p className="font-display font-bold text-base">Premium — R$ 99,90/mês</p>
            <p className="text-brand-accent-contrast font-mono font-semibold">
              90 dias grátis (R$ 0,00 nos 3 primeiros meses)
            </p>
            <p className="text-white/80">
              Até 100 oportunidades/mês, prioridade alta no matching, relatórios avançados, suporte prioritário e selo Top Recontrate.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/80">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-accent-contrast shrink-0" />
            <span>
              <strong>Sem surpresas:</strong> upgrade pro-rata imediato, downgrade agendado e 7 dias de tolerância em falhas de renovação.
            </span>
          </div>
          <span>Pix, Cartão ou Boleto (Asaas) · Cancelamento livre sem multa</span>
        </div>
      </section>

      {/* 7. PERGUNTAS FREQUENTES (6 PERGUNTAS OBRIGATÓRIAS DO PROMPT) */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-brand-primary/10 space-y-6">
        <div>
          <p className="text-xs font-semibold text-brand-link">
            Dúvidas Frequentes e Regras Reais
          </p>
          <h2 className="font-display font-bold text-2xl text-brand-ink">
            Perguntas frequentes sobre o Recontrate
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink">1. Como funciona a cobrança?</h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Para clientes, o uso é 100% gratuito. Para prestadores, há o plano Gratuito e 3 planos pagos (Essencial, Profissional e Premium), com 90 dias grátis nos 3 primeiros meses para novos assinantes mensais ou 2 meses grátis no plano anual, processados via Asaas por Pix, Cartão ou Boleto.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink">2. O prestador paga comissão para a plataforma ou taxa por lead?</h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Não. O prestador não paga nenhuma comissão ao Recontrate sobre os serviços realizados nem compra leads avulsos. Todo orçamento, negociação e pagamento são combinados e feitos diretamente entre cliente e profissional, fora da plataforma — 100% do valor do serviço fica com o prestador.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink">3. Como cancelo minha assinatura ou mudo de plano?</h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Você pode fazer upgrade com efeito imediato (pro-rata), agendar downgrade ou cancelar sua assinatura a qualquer momento no Painel do Prestador, sem fidelidade nem multa, mantendo os benefícios até o fim do ciclo já pago.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink">4. Como são feitas avaliações e verificações?</h3>
            <p className="text-brand-ink/75 leading-relaxed">
              As avaliações registram qualidade, pontualidade, comunicação e limpeza após o atendimento, com direito de resposta pública do prestador. A verificação atual valida cadastro, e-mail e especialidades declaradas no onboarding; procedimentos adicionais de verificação documental estão em configuração para o lançamento.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink">5. Em quais localidades funciona?</h3>
            <p className="text-brand-ink/75 leading-relaxed">
              O piloto prioriza serviços residenciais locais conforme os bairros informados pelos perfis verificados publicados (inicialmente com foco em bairros de São Paulo na base de teste). Não há cobertura nacional automática; se sua região ainda não tiver perfis ativos, você pode registrar interesse para a expansão do piloto.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-brand-background/60 space-y-1.5">
            <h3 className="font-bold text-sm text-brand-ink">6. O que acontece se o profissional não puder atender?</h3>
            <p className="text-brand-ink/75 leading-relaxed">
              Se o profissional estiver sem agenda na data solicitada, ele pode sugerir até 2 profissionais substitutos informando o motivo da indicação. O cliente visualiza o perfil e decide livremente se aceita o substituto ou se prefere buscar outro prestador.
            </p>
          </div>
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
        <div className="flex flex-wrap items-center gap-3">
          <BrandLogo variant="light" size="sm" decorative />
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-brand-accent-contrast">
            Recontrate para Profissionais · 90 dias grátis no lançamento
          </span>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl max-w-3xl leading-tight">
          Receba solicitações qualificadas, fidelize clientes e fique com 100% do seu serviço — sem pagar comissão à plataforma
        </h1>
        <p className="text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
          Organize seu perfil profissional com especialidades e bairros de atuação, facilite que clientes satisfeitos voltem a contratar você com 1 clique e negocie livremente: você não paga comissão ao Recontrate — todo orçamento e pagamento são combinados e feitos diretamente com o cliente, fora da plataforma.
        </p>
        <div className="max-w-2xl rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-xs sm:text-sm text-white/95 leading-relaxed">
          <strong>Sem comissão para a plataforma:</strong> o Recontrate não cobra porcentagem sobre seus serviços nem intermedia pagamentos. Todo valor negociado com o cliente é acertado e recebido diretamente por você, fora da plataforma.
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigateUrl('/planos')}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-sm cursor-pointer"
          >
            Ver planos e assinar
          </button>
          <button
            type="button"
            onClick={() => onNavigateUrl('/criar-conta?role=prestador')}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-display font-semibold text-sm cursor-pointer"
          >
            Criar conta de prestador grátis
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
        <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-2">
          <p className="font-semibold text-brand-accent-strong">Promoção de Lançamento</p>
          <h2 className="font-display font-bold text-base text-brand-ink">
            90 dias grátis nos planos pagos
          </h2>
          <p className="text-brand-ink/75 leading-relaxed">
            Comece no plano Gratuito (até 5 oportunidades/mês) ou experimente Essencial, Profissional ou Premium por 90 dias totalmente grátis (R$ 0,00 nos 3 primeiros meses) — ou aproveite 2 meses grátis no plano anual.
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-2">
          <p className="font-semibold text-brand-link">Autonomia financeira</p>
          <h2 className="font-display font-bold text-base text-brand-ink">
            Você não paga comissão à plataforma (R$ 0 por lead)
          </h2>
          <p className="text-brand-ink/75 leading-relaxed">
            O valor do serviço é 100% seu. Todo orçamento, negociação e pagamento são feitos diretamente entre você e o cliente, fora da plataforma, sem nenhuma taxa ou porcentagem retida pelo Recontrate.
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-2">
          <p className="font-semibold text-brand-link">Liberdade e reputação real</p>
          <h2 className="font-display font-bold text-base text-brand-ink">
            Cancelamento livre e nota meritocrática
          </h2>
          <p className="text-brand-ink/75 leading-relaxed">
            Estrelas nunca podem ser compradas em nenhum plano. Você pode fazer upgrade imediato, agendar downgrade ou cancelar sem multa antes do fim dos 90 dias grátis.
          </p>
        </div>
      </section>

      <section className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="space-y-1.5 max-w-2xl">
          <p className="font-semibold text-emerald-800">
            Programa de Indicação Recontrate · Exclusivo para usuários cadastrados
          </p>
          <h2 className="font-display font-bold text-lg sm:text-xl text-brand-ink">
            Indique Profissionais: +15 Dias para Você e +10 Dias para Quem Se Cadastra
          </h2>
          <p className="text-brand-ink/80 leading-relaxed">
            Depois de criar sua conta e fazer login, gere seu link exclusivo e indique colegas prestadores de serviço. A cada profissional indicado que concluir o cadastro e onboarding, você ganha <strong>+15 dias grátis</strong> na assinatura e o profissional cadastrado com seu código também recebe <strong>+10 dias grátis extras</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateUrl('/criar-conta?role=prestador')}
            className="min-h-[42px] px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-display font-semibold cursor-pointer"
          >
            Cadastrar para indicar
          </button>
          <button
            type="button"
            onClick={() => onNavigateUrl('/app/indicacoes')}
            className="min-h-[42px] px-4 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-display font-semibold cursor-pointer"
          >
            Ir para Painel de Indicações →
          </button>
        </div>
      </section>
    </div>
  );
};

export const TermsAndPrivacyPage: React.FC<{
  mode: 'termos' | 'privacidade';
}> = ({ mode }) => {
  const isTerms = mode === 'termos';
  const projectContact =
    import.meta.env.VITE_PROJECT_CONTACT_EMAIL ||
    'suporte@recontrate.com.br';

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 border border-brand-primary/10 space-y-6 mb-12">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold">
        <span>Recontrate · Documentação Comercial e LGPD</span>
      </div>
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-ink">
        {isTerms ? 'Termos de Uso e Assinaturas' : 'Política de Privacidade e LGPD'}
      </h1>
      <div className="space-y-4 text-xs sm:text-sm text-brand-ink/80 leading-relaxed">
        {isTerms ? (
          <>
            <p>
              <strong>1. Objeto da plataforma:</strong> O <strong>Recontrate</strong> conecta clientes que precisam de serviços locais a profissionais autônomos avaliados, permitindo busca compatível, histórico de atendimentos, recontratação direta e indicação de substitutos.
            </p>
            <p>
              <strong>2. Assinaturas, cobrança e cancelamento:</strong> Os planos comerciais para prestadores (Gratuito, Essencial, Profissional e Premium) são cobrados de forma recorrente via Asaas por Pix, Cartão de Crédito ou Boleto, sem fidelidade nem multa, com promoção de 90 dias grátis nos 3 primeiros meses para novos assinantes mensais. Upgrades têm efeito imediato com cobrança proporcional (pro-rata); downgrades e cancelamentos mantêm o acesso até o fim do período vigente. Em falhas de renovação aplica-se tolerância de 7 dias antes do retorno ao plano Gratuito.
            </p>
            <p>
              <strong>3. Relação direta entre cliente e prestador:</strong> O prestador não paga comissão à plataforma. Todo orçamento, negociação de valor, execução técnica, prazo e pagamento pelo serviço prestado ocorrem diretamente entre cliente e profissional autônomo, fora da plataforma, sem intermediação financeira do Recontrate. Estrelas e avaliações nunca podem ser compradas.
            </p>
          </>
        ) : (
          <>
            <p>
              <strong>1. Coleta necessária e finalidade:</strong> Coletamos apenas os dados cadastrais indispensáveis para autenticação, exibição do perfil profissional, match local e emissão segura de faturas de assinatura junto ao gateway Asaas (como CPF/CNPJ quando contratado plano pago).
            </p>
            <p>
              <strong>2. Proteção de contato pessoal:</strong> O telefone completo ou e-mail do cliente e do prestador só é liberado no contexto autorizado de atendimento (solicitação aceita com consentimento LGPD explícito), respeitando sigilo e controle de acesso por linha no banco de dados.
            </p>
            <p>
              <strong>3. Direitos do titular e canal de contato:</strong> Você pode solicitar revisão ou exclusão de seus dados a qualquer momento pelo canal oficial de atendimento:{' '}
              <code className="font-mono">{projectContact}</code>.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
