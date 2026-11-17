import React, { useState } from 'react';
import {
  ShieldCheck,
  Star,
  Clock,
  CheckCircle2,
  Share2,
  MessageSquare,
  RotateCcw,
  Award,
  MapPin,
  ArrowRight,
  UserCheck,
  Calendar,
} from 'lucide-react';
import {
  ProviderProfile,
  RepeatServiceRequest,
  ScreenId,
} from '../types/confiare';

interface ProviderProfileScreenProps {
  provider: ProviderProfile;
  allProviders: ProviderProfile[];
  onSelectProvider: (id: string) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

export const ProviderProfileScreen: React.FC<ProviderProfileScreenProps> = ({
  provider,
  allProviders,
  onSelectProvider,
  onNavigate,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [publicOfficialSpecs, setPublicOfficialSpecs] = useState<string[] | null>(null);

  React.useEffect(() => {
    if (!provider.isVerified) {
      setPublicOfficialSpecs(null);
      return;
    }

    let cancelled = false;
    setPublicOfficialSpecs(null);
    fetch(`/api/public/providers/${encodeURIComponent(provider.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body?.ok || !body.provider) return;
        const specs = Array.isArray(body.provider.officialSpecialties)
          ? body.provider.officialSpecialties.map((s: any) => s.nome)
          : null;
        if (specs && specs.length > 0) {
          setPublicOfficialSpecs(specs);
        } else {
          setPublicOfficialSpecs(null);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [provider.id, provider.isVerified]);

  const displayedSpecialties =
    publicOfficialSpecs && publicOfficialSpecs.length > 0
      ? publicOfficialSpecs
      : provider.specialties;

  const handleCopyShareLink = async () => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      setCopyFailed(true);
      setCopiedLink(false);
    }
  };

  if (!provider.isVerified) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-brand-primary/10 text-center space-y-3 my-8">
        <h1 className="font-display font-bold text-xl text-brand-ink">Perfil não disponível publicamente</h1>
        <p className="text-sm text-brand-ink/70">Este perfil não tem status de verificação ativo e não é exibido na busca pública.</p>
        <button
          type="button"
          onClick={() => onNavigate('profissionais-compativeis')}
          className="min-h-[42px] px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold cursor-pointer"
        >
          Voltar à busca
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Cabeçalho do perfil público */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-primary/10 pb-5">
        <div>
          <p className="text-xs font-semibold text-brand-link">
            Perfil público
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-ink mt-1">
            Informações públicas do perfil
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto min-w-0">
          <label
            htmlFor="switch-provider-select"
            className="text-xs font-medium text-brand-ink/70 whitespace-nowrap"
          >
            Alternar profissional:
          </label>
          <select
            id="switch-provider-select"
            value={provider.id}
            onChange={(e) => {
              onSelectProvider(e.target.value);
            }}
            className="w-full sm:w-auto max-w-full px-3 py-2 rounded-xl bg-white border border-brand-primary/15 text-xs font-semibold text-brand-ink truncate"
          >
            {allProviders.filter((profile) => profile.isVerified).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <section className="bg-brand-primary text-white rounded-3xl p-5 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-brand-link text-white font-display font-bold text-2xl flex items-center justify-center shrink-0">
                {provider.initials}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-brand-accent-contrast font-semibold">
                  <span>{provider.category}</span>
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-white break-words">
                  {provider.name}
                </h2>
                {/* Clean unboxed trust seals */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/90 pt-1">
                  {provider.isVerified && (
                    <span className="font-semibold text-[#60A5FA]">
                      ✓ Perfil verificado
                    </span>
                  )}
                </div>
              </div>
            </div>

            {provider.bio.trim() && (
              <p className="text-sm text-white/85 leading-relaxed max-w-3xl">
                <span className="font-semibold">Descrição informada:</span> {provider.bio}
              </p>
            )}


          </div>

          {/* Ações públicas disponíveis */}
          <div className="lg:col-span-4 bg-white text-brand-ink rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="border-b border-brand-primary/10 pb-3">
              <span className="text-xs font-semibold text-brand-ink/70">Contato</span>
            </div>
            <p className="text-xs text-brand-ink/75">
              O contato direto não está disponível por esta página no momento.
            </p>
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-brand-background hover:bg-brand-surface-hover text-brand-ink text-xs font-medium transition-colors inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                {copyFailed ? 'Não foi possível copiar o link' : copiedLink ? 'Link copiado' : 'Copiar link do perfil'}
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-brand-primary/10 space-y-5">
        <div>
          <p className="text-xs font-semibold text-brand-link">Informações do perfil</p>
          <h3 className="font-display font-bold text-lg text-brand-ink">
            Especialidades e localidade informadas
          </h3>
        </div>

        {displayedSpecialties.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-brand-ink/70">Especialidades informadas:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedSpecialties.map((specialty) => (
                <li
                  key={specialty}
                  className="flex items-center gap-2 text-xs text-brand-ink bg-brand-background/60 px-3.5 py-2.5 rounded-xl"
                >
                  <span>{specialty}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-brand-ink/75">
          <strong>Localidade informada:</strong>{' '}
          {provider.neighborhoods.length > 0
            ? provider.neighborhoods.join(', ')
            : provider.city || 'Não informada'}
        </p>
      </section>

      <section className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-2">
        <h3 className="font-display font-bold text-lg text-brand-ink">Avaliações e pontuações</h3>
        <p className="text-sm text-brand-ink/70">
          Avaliações e métricas de reputação não são exibidas publicamente nesta versão.
        </p>
      </section>
    </div>
  );
};

interface RepeatRequestScreenProps {
  providers: ProviderProfile[];
  selectedProviderId: string;
  repeatRequests: RepeatServiceRequest[];
  onCreateRepeatRequest: (req: RepeatServiceRequest) => void;
  onTriggerSubstituteFlow: (providerId: string, serviceSummary: string) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

export const RepeatRequestScreen: React.FC<RepeatRequestScreenProps> = ({
  providers,
  selectedProviderId,
  repeatRequests,
  onCreateRepeatRequest,
  onTriggerSubstituteFlow,
  onNavigate,
}) => {
  const trustedProviders = providers.filter((p) => p.previouslyHiredByCurrentUser);
  const [chosenProviderId, setChosenProviderId] = useState<string>(
    trustedProviders.some((p) => p.id === selectedProviderId)
      ? selectedProviderId
      : trustedProviders[0]?.id || providers[0].id
  );

  const activeProvider =
    providers.find((p) => p.id === chosenProviderId) || providers[0];

  const [serviceType, setServiceType] = useState(
    'Instalação de tomada dupla 20A e revisão preventiva do quadro'
  );
  const [desiredDate, setDesiredDate] = useState('Sexta-feira, 14h00');
  const [urgency, setUrgency] = useState<'Hoje' | 'Amanhã' | 'Esta semana' | 'Flexível'>(
    'Esta semana'
  );
  const [notes, setNotes] = useState(
    'Mesmo endereço do último atendimento em Pinheiros. Portaria já autorizada.'
  );
  const [lgpdShareConsent, setLgpdShareConsent] = useState(true);
  const [confirmationMode, setConfirmationMode] = useState<
    'idle' | 'accepted' | 'unavailable'
  >('idle');

  const handleDirectRepeatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType.trim()) return;

    const newRepeat: RepeatServiceRequest = {
      id: `rep-${Date.now()}`,
      providerId: activeProvider.id,
      category: activeProvider.category,
      serviceType: serviceType.trim(),
      desiredDate,
      urgency,
      notes,
      lgpdShareConsent,
      status: 'aceito',
      createdAt: 'Agora mesmo',
    };
    onCreateRepeatRequest(newRepeat);
    setConfirmationMode('accepted');
  };

  const handleSimulateUnavailableWithSubstitute = () => {
    onTriggerSubstituteFlow(activeProvider.id, serviceType);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-brand-primary/10 pb-6">
        <div>
          <p className="text-xs font-semibold text-brand-accent-strong">
            Tela 06 · Retenção e Continuidade com Quem Você Já Conhece
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-ink mt-1">
            Solicitar novamente
          </h1>
          <p className="text-sm text-brand-ink/75 mt-1">
            Recontrate facilmente um profissional da sua lista “Meus profissionais de confiança” preservando o histórico do atendimento anterior.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('indicacao-substituto', activeProvider.id)}
          className="text-left text-xs font-semibold text-brand-link hover:text-brand-ink underline underline-offset-4 sm:whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          E se ele não puder atender? Ver Indicação de Substituto →
        </button>
      </div>

      {/* Lista Meus Profissionais de Confiança */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-base text-brand-ink">
          1. Selecione em “Meus profissionais de confiança”
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trustedProviders.map((tp) => {
            const isSelected = tp.id === activeProvider.id;
            return (
              <button
                key={tp.id}
                type="button"
                onClick={() => {
                  setChosenProviderId(tp.id);
                  setConfirmationMode('idle');
                }}
                className={`text-left p-5 rounded-2xl border transition-all cursor-pointer min-w-0 ${
                  isSelected
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white text-brand-ink border-brand-primary/10 hover:border-brand-link'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-bold text-base truncate">
                    {tp.name}
                  </span>
                  <span className="font-mono text-xs font-semibold text-brand-accent-strong shrink-0">
                    ★ {tp.ratingAvg.toFixed(2)}
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 ${
                    isSelected ? 'text-white/80' : 'text-brand-ink/70'
                  }`}
                >
                  {tp.category} · Último serviço: {tp.lastServiceDate}
                </p>
                <p
                  className={`text-xs mt-2 line-clamp-2 ${
                    isSelected ? 'text-white/90' : 'text-brand-ink/80'
                  }`}
                >
                  Histórico: “{tp.lastServiceSummary}”
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Formulário de Pedido Direto */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleDirectRepeatSubmit}
          className="lg:col-span-8 bg-white rounded-3xl p-5 sm:p-8 border border-brand-primary/10 space-y-6"
        >
          <div className="p-4 rounded-2xl bg-brand-background flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-brand-link">
                Histórico preservado do último atendimento com {activeProvider.name}
              </p>
              <p className="text-xs text-brand-ink/80 mt-0.5">
                {activeProvider.lastServiceDate} — {activeProvider.lastServiceSummary}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('perfil-prestador', activeProvider.id)}
              className="text-left text-xs font-semibold text-brand-ink underline whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              Ver ficha técnica
            </button>
          </div>

          {confirmationMode === 'accepted' && (
            <div
              role="status"
              className="p-5 rounded-2xl bg-brand-primary text-white space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-brand-accent-contrast">
                  Solicitação direta aceita pelo profissional!
                </span>
                <span className="text-xs font-mono">WhatsApp Liberado</span>
              </div>
              <p className="text-sm font-display font-semibold">
                {activeProvider.name} confirmou disponibilidade para {desiredDate}.
              </p>
              <p className="text-xs text-white/80">
                Contato direto liberado: <strong>{activeProvider.whatsapp}</strong>
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('avaliacao-pos-atendimento', activeProvider.id)
                  }
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-brand-accent-strong text-white text-xs font-semibold cursor-pointer"
                >
                  Simular conclusão e avaliar serviço →
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="repeat-service-type"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                O que você precisa que {activeProvider.name} faça desta vez? *
              </label>
              <input
                id="repeat-service-type"
                type="text"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="repeat-date"
                  className="block text-xs font-semibold text-brand-ink mb-1.5"
                >
                  Data e horário desejados
                </label>
                <input
                  id="repeat-date"
                  type="text"
                  value={desiredDate}
                  onChange={(e) => setDesiredDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
                />
              </div>

              <div>
                <label
                  htmlFor="repeat-urgency"
                  className="block text-xs font-semibold text-brand-ink mb-1.5"
                >
                  Urgência
                </label>
                <select
                  id="repeat-urgency"
                  value={urgency}
                  onChange={(e) =>
                    setUrgency(
                      e.target.value as 'Hoje' | 'Amanhã' | 'Esta semana' | 'Flexível'
                    )
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
                >
                  <option value="Hoje">Hoje</option>
                  <option value="Amanhã">Amanhã</option>
                  <option value="Esta semana">Esta semana</option>
                  <option value="Flexível">Flexível</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="repeat-notes"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Observações ou referência do serviço anterior
              </label>
              <textarea
                id="repeat-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer p-3.5 rounded-xl bg-brand-background/70">
            <input
              type="checkbox"
              checked={lgpdShareConsent}
              onChange={(e) => setLgpdShareConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-brand-link"
            />
            <span className="text-xs text-brand-ink">
              Caso {activeProvider.name} esteja indisponível na data escolhida, autorizo que ele me envie até 2 indicações de substitutos verificados da sua rede de confiança.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-xs sm:text-sm transition-colors inline-flex items-center justify-center gap-2 text-center cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Enviar solicitação direta a {activeProvider.name}</span>
            </button>

            <button
              type="button"
              onClick={handleSimulateUnavailableWithSubstitute}
              className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-display font-semibold text-xs sm:text-sm transition-colors text-center cursor-pointer"
            >
              Simular profissional ocupado → Receber Substituto
            </button>
          </div>
        </form>

        {/* Right Column: Histórico de Recompras */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-brand-primary/10 space-y-4">
            <h3 className="font-display font-bold text-base text-brand-ink">
              Histórico de recontratações ({repeatRequests.length})
            </h3>
            {repeatRequests.length === 0 ? (
              <p className="text-xs text-brand-ink/65">
                Nenhuma solicitação enviada nesta sessão ainda. Clique em “Enviar solicitação direta” para testar.
              </p>
            ) : (
              <div className="space-y-3">
                {repeatRequests.map((item) => {
                  const prov = providers.find((p) => p.id === item.providerId);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-brand-background space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-brand-ink">
                        <span>{prov?.name}</span>
                        <span className="text-brand-link">{item.createdAt}</span>
                      </div>
                      <p className="text-brand-ink/80">{item.serviceType}</p>
                      <p className="text-brand-ink/60">Data: {item.desiredDate}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
