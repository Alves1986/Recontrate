import React, { useState } from 'react';
import {
  UserCheck,
  ShieldCheck,
  Star,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Award,
  ThumbsUp,
} from 'lucide-react';
import {
  ProviderProfile,
  ScreenId,
  SubstituteReferral,
} from '../types/confiare';
import {
  calculateCompositeScore,
  validateSubstituteSelection,
} from '../utils/marketplaceRules';

interface SubstituteReferralScreenProps {
  providers: ProviderProfile[];
  currentReferral: SubstituteReferral;
  onUpdateReferral: (updated: SubstituteReferral) => void;
  onAcceptSubstitute: (substituteProviderId: string) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

export const SubstituteReferralScreen: React.FC<SubstituteReferralScreenProps> = ({
  providers,
  currentReferral,
  onUpdateReferral,
  onAcceptSubstitute,
  onNavigate,
}) => {
  const [perspective, setPerspective] = useState<'cliente' | 'prestador'>('cliente');

  // Provider form state for creating/updating a substitute referral
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>(
    currentReferral.substituteProviderIds
  );
  const [reasonCategory, setReasonCategory] = useState<
    SubstituteReferral['reasonCategory']
  >(currentReferral.reasonCategory);
  const [customNote, setCustomNote] = useState(currentReferral.customNote);
  const [validationError, setValidationError] = useState('');
  const [providerSavedSuccess, setProviderSavedSuccess] = useState(false);

  const originalProvider =
    providers.find((p) => p.id === currentReferral.originalProviderId) ||
    providers[0];

  const indicatedProviders = providers.filter((p) =>
    currentReferral.substituteProviderIds.includes(p.id)
  );

  const eligibleColleagues = providers.filter(
    (p) => p.id !== originalProvider.id && p.category === originalProvider.category
  );

  const toggleSubSelection = (id: string) => {
    setSelectedSubIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveProviderReferral = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateSubstituteSelection(
      originalProvider.id,
      selectedSubIds,
      customNote
    );
    if (!check.valid) {
      setValidationError(check.error || 'Verifique os dados da indicação.');
      return;
    }
    setValidationError('');
    onUpdateReferral({
      ...currentReferral,
      substituteProviderIds: selectedSubIds,
      reasonCategory,
      customNote: customNote.trim(),
      clientAcceptedProviderId: undefined,
      createdAt: 'Agora mesmo',
    });
    setProviderSavedSuccess(true);
  };

  const acceptedProvider = providers.find(
    (p) => p.id === currentReferral.clientAcceptedProviderId
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header & Perspective Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-brand-primary/10 pb-6">
        <div>
          <p className="text-xs font-semibold text-brand-accent-strong">
            Tela 07 · Continuidade da Rede de Confiança e Corresponsabilidade
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-ink mt-1">
            Indicação de substituto
          </h1>
          <p className="text-sm text-brand-ink/75 mt-1">
            Quando o profissional habitual não pode atender, ele indica até 2 profissionais verificados ou apadrinhados. A reputação de ambos fica vinculada à qualidade do atendimento.
          </p>
        </div>

        {/* Interactive Perspective Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1.5 bg-white border border-brand-primary/15 rounded-2xl w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setPerspective('cliente')}
            className={`min-h-[38px] px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-center ${
              perspective === 'cliente'
                ? 'bg-brand-primary text-white font-semibold'
                : 'text-brand-ink/70 hover:text-brand-ink'
            }`}
          >
            Visão do Cliente (Receber Indicação)
          </button>
          <button
            type="button"
            onClick={() => {
              setPerspective('prestador');
              setProviderSavedSuccess(false);
            }}
            className={`min-h-[38px] px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-center ${
              perspective === 'prestador'
                ? 'bg-brand-link text-white font-semibold'
                : 'text-brand-ink/70 hover:text-brand-ink'
            }`}
          >
            Visão do Prestador (Indicar até 2)
          </button>
        </div>
      </div>

      {perspective === 'cliente' ? (
        <div className="space-y-6">
          {/* Banner de Mensagem de Indicação Rastreável */}
          <section className="bg-brand-primary text-white rounded-3xl p-5 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-accent-contrast font-semibold">
              <span>Indicação Oficial Rastreável · {currentReferral.createdAt}</span>
              <span className="font-mono text-white/80">
                Motivo: {currentReferral.reasonCategory}
              </span>
            </div>

            <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
              O {originalProvider.name} não pode atender no horário solicitado, mas indica{' '}
              {indicatedProviders.map((p) => p.name).join(' e ')}.
            </h2>

            <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-2">
              <p className="text-xs font-semibold text-white/90">
                Mensagem de {originalProvider.name} para você:
              </p>
              <p className="text-sm text-white/90 italic leading-relaxed">
                “{currentReferral.customNote}”
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/75 pt-1">
              <span>
                Contexto do pedido: <strong>{currentReferral.serviceContext}</strong> ({currentReferral.neighborhood} · {currentReferral.urgency})
              </span>
              <span>
                Compartilhamento protegido por consentimento LGPD
              </span>
            </div>
          </section>

          {/* Confirmação caso o cliente já tenha aceitado um substituto */}
          {acceptedProvider && (
            <div
              role="status"
              className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-brand-link flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold text-brand-link">
                  ✓ Indicação aceita com sucesso — Contexto compartilhado!
                </p>
                <p className="font-display font-bold text-base text-brand-ink">
                  Você escolheu {acceptedProvider.name}. WhatsApp liberado: {acceptedProvider.whatsapp}
                </p>
                <p className="text-xs text-brand-ink/70">
                  Esta indicação ficou registrada no histórico de {originalProvider.name} e de {acceptedProvider.name}.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('avaliacao-pos-atendimento', acceptedProvider.id)
                  }
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white text-xs font-semibold cursor-pointer"
                >
                  Avaliar este atendimento →
                </button>
              </div>
            </div>
          )}

          {/* Cards dos Substitutos Indicados (Até 2) */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-lg text-brand-ink">
              Profissionais substitutos recomendados ({indicatedProviders.length} de máx. 2)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {indicatedProviders.map((sub) => {
                const subScore = calculateCompositeScore(sub).totalScore;
                const isAccepted =
                  currentReferral.clientAcceptedProviderId === sub.id;

                return (
                  <div
                    key={sub.id}
                    className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all flex flex-col justify-between gap-5 min-w-0 ${
                      isAccepted
                        ? 'border-2 border-brand-link'
                        : 'border-brand-primary/10'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-primary text-white font-display font-bold text-base sm:text-lg flex items-center justify-center shrink-0">
                            {sub.initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-display font-bold text-base sm:text-lg text-brand-ink leading-snug">
                              {sub.name}
                            </h4>
                            <p className="text-xs text-brand-ink/70 leading-snug mt-0.5">
                              {sub.category} · {sub.yearsExperience} anos de experiência
                            </p>
                          </div>
                        </div>

                        <div className="text-right font-mono tabular-nums shrink-0">
                          <span className="text-sm sm:text-base font-bold text-brand-ink">
                            ★ {subScore.toFixed(2)}
                          </span>
                          <p className="text-[11px] text-brand-ink/60">
                            {sub.reviewsCount} avaliações
                          </p>
                        </div>
                      </div>

                      {/* Unboxed Trust Metadata */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-brand-link font-semibold">
                        <span>✓ Selo Verificado</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {sub.mentorName
                            ? `Apadrinhado por ${sub.mentorName}`
                            : `Colega verificado de ${originalProvider.name}`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-brand-ink/75 font-mono">
                          Responde em ~{sub.responseTimeMinutes} min
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-brand-ink/80 leading-relaxed">
                        {sub.bio}
                      </p>

                      <div className="p-3.5 rounded-2xl bg-brand-background/80 space-y-1 text-xs">
                        <p className="font-semibold text-brand-ink">
                          Destaque do portfólio recente:
                        </p>
                        <p className="text-brand-ink/75">
                          {sub.portfolio[0]?.title || 'Manutenção elétrica residencial verificada'} ({sub.portfolio[0]?.neighborhood || 'Pinheiros'})
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-brand-primary/10 flex flex-col sm:flex-row gap-2.5">
                      <button
                        type="button"
                        onClick={() => onAcceptSubstitute(sub.id)}
                        className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-xs transition-colors cursor-pointer text-center"
                      >
                        {isAccepted
                          ? `✓ Indicação aceita (${sub.whatsapp})`
                          : `Aceitar indicação de ${sub.name.split(' ')[0]}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('perfil-prestador', sub.id)}
                        className="min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold text-xs transition-colors cursor-pointer text-center"
                      >
                        Ver perfil completo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alternative Option: Search other professionals */}
          <div className="bg-white rounded-2xl p-5 border border-brand-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-brand-ink/80">
              <strong>Prefere escolher outro profissional por conta própria?</strong> Você tem total autonomia para buscar outros prestadores compatíveis na região.
            </div>
            <button
              type="button"
              onClick={() => onNavigate('profissionais-compativeis')}
              className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hover transition-colors text-center shrink-0 cursor-pointer"
            >
              Buscar outros profissionais na lista
            </button>
          </div>
        </div>
      ) : (
        /* VISÃO DO PRESTADOR: INDICAR ATÉ 2 SUBSTITUTOS */
        <form
          onSubmit={handleSaveProviderReferral}
          className="bg-white rounded-3xl p-5 sm:p-8 border border-brand-primary/10 space-y-6"
        >
          <div>
            <p className="text-xs font-semibold text-brand-link">
              Ferramenta do Prestador · Preservação de Cliente e Reputação da Rede
            </p>
            <h2 className="font-display font-bold text-xl text-brand-ink mt-1">
              Não pode atender a solicitação de hoje? Indique até 2 colegas ou apadrinhados
            </h2>
            <p className="text-xs text-brand-ink/70 mt-1">
              Boas indicações fortalecem a confiança na rede e ajudam o cliente a encontrar atendimento.
            </p>
          </div>

          {validationError && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
            >
              {validationError}
            </div>
          )}

          {providerSavedSuccess && (
            <div
              role="status"
              className="p-4 rounded-xl bg-brand-primary text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <span>
                ✓ Indicação atualizada com sucesso! Agora alterne para a “Visão do Cliente” para ver como ele recebe.
              </span>
              <button
                type="button"
                onClick={() => setPerspective('cliente')}
                className="px-3 py-1.5 rounded-lg bg-brand-accent-strong text-white font-semibold self-start sm:self-auto cursor-pointer"
              >
                Ver como Cliente
              </button>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-brand-ink">
              1. Escolha até 2 profissionais verificados da categoria {originalProvider.category} ({selectedSubIds.length}/2 selecionados)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {eligibleColleagues.map((col) => {
                const selected = selectedSubIds.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleSubSelection(col.id)}
                    className={`text-left p-4 rounded-2xl border transition-all cursor-pointer min-w-0 ${
                      selected
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'bg-brand-background/60 text-brand-ink border-brand-primary/15'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-sm truncate">
                        {selected ? `✓ ${col.name}` : col.name}
                      </span>
                      <span className="font-mono text-xs text-brand-accent-strong shrink-0">
                        ★ {col.ratingAvg.toFixed(2)}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        selected ? 'text-white/80' : 'text-brand-ink/70'
                      }`}
                    >
                      {col.mentorName
                        ? `Seu apadrinhado na rede`
                        : `Colega verificado · ${col.completedJobs} atendimentos`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="sub-reason-cat"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                2. Motivo da indisponibilidade
              </label>
              <select
                id="sub-reason-cat"
                value={reasonCategory}
                onChange={(e) =>
                  setReasonCategory(
                    e.target.value as SubstituteReferral['reasonCategory']
                  )
                }
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
              >
                <option value="Agenda cheia na data">Agenda cheia na data</option>
                <option value="Em atendimento em outro bairro">
                  Em atendimento em outro bairro
                </option>
                <option value="De folga / férias">De folga / férias</option>
                <option value="Especialidade específica">
                  Especialidade específica
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sub-note"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                3. Breve recomendação ao cliente *
              </label>
              <input
                id="sub-note"
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-sm transition-colors cursor-pointer"
          >
            Enviar indicação de substituto ao cliente
          </button>
        </form>
      )}
    </div>
  );
};

interface PostServiceReviewScreenProps {
  providers: ProviderProfile[];
  selectedProviderId: string;
  onSubmitReview: (
    providerId: string,
    reviewData: {
      clientName: string;
      neighborhood: string;
      serviceTitle: string;
      qualidade: number;
      pontualidade: number;
      comunicacao: number;
      organizacao: number;
      wouldRecommend: boolean;
      comment: string;
    }
  ) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

export const PostServiceReviewScreen: React.FC<PostServiceReviewScreenProps> = ({
  providers,
  selectedProviderId,
  onSubmitReview,
  onNavigate,
}) => {
  const [targetProviderId, setTargetProviderId] = useState<string>(
    selectedProviderId || providers[0].id
  );
  const provider =
    providers.find((p) => p.id === targetProviderId) || providers[0];

  const [clientName, setClientName] = useState('Mariana Souza');
  const [neighborhood, setNeighborhood] = useState('Pinheiros');
  const [serviceTitle, setServiceTitle] = useState(
    'Substituição de disjuntor DR e revisão de tomada 20A'
  );
  const [qualidade, setQualidade] = useState(5);
  const [pontualidade, setPontualidade] = useState(5);
  const [comunicacao, setComunicacao] = useState(5);
  const [organizacao, setOrganizacao] = useState(5);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [comment, setComment] = useState(
    'Atendimento impecável! Explicou todo o diagnóstico técnico antes de executar, cumpriu o valor combinado e deixou o local limpo.'
  );
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const previewAverage =
    Math.round(((qualidade + pontualidade + comunicacao + organizacao) / 4) * 10) /
    10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTitle.trim() || !comment.trim()) {
      setError('Informe o serviço realizado e escreva seu depoimento sobre o atendimento.');
      return;
    }
    setError('');
    onSubmitReview(provider.id, {
      clientName,
      neighborhood,
      serviceTitle,
      qualidade,
      pontualidade,
      comunicacao,
      organizacao,
      wouldRecommend,
      comment,
    });
    setSubmitted(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-brand-primary/10 pb-6">
        <div>
          <p className="text-xs font-semibold text-brand-accent-strong">
            Tela 08 · Reputação Auditável Pós-Atendimento
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-ink mt-1">
            Avaliação pós-atendimento
          </h1>
          <p className="text-sm text-brand-ink/75 mt-1">
            Avaliações só podem ser registradas após atendimento vinculado e atualizam imediatamente a Nota Composta do profissional e a lista “Meus profissionais de confiança”.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('perfil-prestador', provider.id)}
          className="text-left text-xs font-semibold text-brand-link hover:text-brand-ink underline underline-offset-4 sm:whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          Ver perfil atualizado de {provider.name} →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-white rounded-3xl p-5 sm:p-8 border border-brand-primary/10 space-y-6"
        >
          {error && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
            >
              {error}
            </div>
          )}

          {submitted && (
            <div
              role="status"
              className="p-5 rounded-2xl bg-brand-primary text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <p className="text-xs text-brand-accent-contrast font-semibold">
                  ✓ Avaliação publicada e Nota Composta recalculada!
                </p>
                <p className="text-sm font-display font-semibold">
                  {provider.name} agora possui {provider.reviewsCount} avaliações verificadas e foi salvo em Meus Profissionais.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('perfil-prestador', provider.id)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-brand-accent-strong text-white text-xs font-semibold self-start sm:self-auto cursor-pointer"
              >
                Conferir no perfil público →
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="rev-provider"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Profissional avaliado
              </label>
              <select
                id="rev-provider"
                value={provider.id}
                onChange={(e) => {
                  setTargetProviderId(e.target.value);
                  setSubmitted(false);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="rev-service"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Serviço realizado *
              </label>
              <input
                id="rev-service"
                type="text"
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
              />
            </div>
          </div>

          {/* 4 Critérios de Avaliação */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-brand-ink">
                Avalie os 4 pilares do atendimento (1 a 5 estrelas)
              </label>
              <span className="font-mono tabular-nums text-xs font-bold text-brand-link">
                Média desta avaliação: ★ {previewAverage.toFixed(1)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  label: 'Qualidade técnica do serviço',
                  val: qualidade,
                  setter: setQualidade,
                },
                {
                  label: 'Pontualidade e cumprimento de prazo',
                  val: pontualidade,
                  setter: setPontualidade,
                },
                {
                  label: 'Comunicação e clareza no orçamento',
                  val: comunicacao,
                  setter: setComunicacao,
                },
                {
                  label: 'Organização e limpeza do local',
                  val: organizacao,
                  setter: setOrganizacao,
                },
              ].map((crit) => (
                <div
                  key={crit.label}
                  className="p-4 rounded-2xl bg-brand-background/70 border border-brand-primary/10 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-brand-ink">
                    <span>{crit.label}</span>
                    <span className="font-mono shrink-0">{crit.val}/5</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`${crit.label}: ${star} estrelas`}
                        onClick={() => crit.setter(star)}
                        className={`w-9 h-9 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
                          star <= crit.val
                            ? 'bg-brand-accent-strong text-white'
                            : 'bg-white text-brand-ink/50 border border-brand-primary/10'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recomendaria e Depoimento */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-brand-background/70">
              <span className="text-xs font-semibold text-brand-ink">
                Você recontrataria ou indicaria {provider.name} para um vizinho?
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setWouldRecommend(true)}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    wouldRecommend
                      ? 'bg-brand-primary text-white'
                      : 'bg-white text-brand-ink'
                  }`}
                >
                  Sim, recomendo
                </button>
                <button
                  type="button"
                  onClick={() => setWouldRecommend(false)}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    !wouldRecommend
                      ? 'bg-brand-primary text-white'
                      : 'bg-white text-brand-ink'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="rev-comment"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Relato sobre o atendimento *
              </label>
              <textarea
                id="rev-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
              />
            </div>
          </div>

          <button
            type="submit"
            className="min-h-[48px] px-6 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Publicar avaliação verificada</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Right Side: Impacto na Reputação */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-brand-primary text-white rounded-3xl p-6 space-y-4">
          <p className="text-xs font-semibold text-brand-accent-contrast">
            Integridade de Avaliações
            </p>
            <h2 className="font-display font-bold text-lg">
              Como sua avaliação protege toda a comunidade
            </h2>
            <p className="text-xs text-white/80 leading-relaxed">
              Quando o profissional foi indicado por um Padrinho ou como substituto de outro colega, sua avaliação também valida a credibilidade de quem o indicou.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
