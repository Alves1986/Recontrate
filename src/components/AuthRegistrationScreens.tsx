import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Sparkles,
  ArrowRight,
  Award,
  Lock,
} from 'lucide-react';
import {
  CategoryName,
  ClientRegistration,
  PlanTier,
  ProviderProfile,
  ProviderRegistration,
  ScreenId,
} from '../types/confiare';
import { CATEGORIES_LIST } from '../data/seedData';

interface ClientRegistrationScreenProps {
  savedClient: ClientRegistration;
  onSaveClient: (client: ClientRegistration) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const ClientRegistrationScreen: React.FC<ClientRegistrationScreenProps> = ({
  savedClient,
  onSaveClient,
  onNavigate,
}) => {
  const [form, setForm] = useState<ClientRegistration>(savedClient);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleCategory = (cat: CategoryName) => {
    setForm((prev) => {
      const exists = prev.favoriteCategories.includes(cat);
      return {
        ...prev,
        favoriteCategories: exists
          ? prev.favoriteCategories.filter((c) => c !== cat)
          : [...prev.favoriteCategories, cat],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.neighborhood.trim()) {
      setError('Preencha nome completo, WhatsApp/telefone e bairro principal.');
      return;
    }
    if (!form.lgpdConsent) {
      setError('É necessário aceitar os termos de privacidade LGPD para continuar.');
      return;
    }
    setError('');
    onSaveClient(form);
    setSubmitted(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-brand-primary/10 pb-6">
        <div>
          <p className="text-xs font-semibold text-brand-link">
            Tela 01 · Jornada do Cliente
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-ink mt-1">
            Cadastro de cliente
          </h1>
          <p className="text-sm text-brand-ink/75 mt-1">
            Configure seu endereço de referência, preferências de atendimento e privacidade LGPD.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('cadastro-prestador')}
          className="text-left text-xs font-semibold text-brand-link hover:text-brand-ink underline underline-offset-4 sm:whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          É profissional autônomo? Ir para Cadastro de Prestador →
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

          {submitted && (
            <div
              role="status"
              className="p-5 rounded-2xl bg-brand-primary text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <p className="text-xs text-brand-accent-strong font-semibold">
                  Cadastro de cliente validado com sucesso
                </p>
                <p className="text-sm font-display font-semibold">
                  Bem-vindo(a), {form.name}! Seu perfil em {form.neighborhood} está ativo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('criar-solicitacao')}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Solicitar primeiro serviço →
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="client-name"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Nome completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-brand-ink/70 absolute left-3.5 top-3.5" aria-hidden="true" />
                <input
                  id="client-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Mariana Souza"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 focus:border-brand-link"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="client-phone"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Telefone / WhatsApp *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-brand-ink/70 absolute left-3.5 top-3.5" aria-hidden="true" />
                <input
                  id="client-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(11) 99204-6612"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 focus:border-brand-link"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="client-email"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-brand-ink/70 absolute left-3.5 top-3.5" aria-hidden="true" />
                <input
                  id="client-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="mariana.souza@email.com.br"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 focus:border-brand-link"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="client-neighborhood"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Bairro principal de atendimento *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-brand-accent-strong absolute left-3.5 top-3.5" aria-hidden="true" />
                <input
                  id="client-neighborhood"
                  type="text"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  placeholder="Ex.: Pinheiros"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 focus:border-brand-link"
                />
              </div>
            </div>
          </div>

          {/* Categorias Favoritas */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-brand-ink">
              Categorias de serviço que você mais utiliza
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES_LIST.map((cat) => {
                const active = form.favoriteCategories.includes(cat.name);
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => toggleCategory(cat.name)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-brand-primary text-white'
                        : 'bg-brand-background text-brand-ink hover:bg-brand-surface-hover'
                    }`}
                  >
                    {active ? `✓ ${cat.name}` : cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferência de Contato */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-brand-ink">
              Forma preferencial de contato quando um profissional aceitar seu pedido
            </label>
            <div className="grid grid-cols-3 gap-2.5 p-1 bg-brand-background rounded-xl">
              {(['WhatsApp', 'Telefone', 'Ambos'] as const).map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => setForm({ ...form, preferredContact: channel })}
                  className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    form.preferredContact === channel
                      ? 'bg-white text-brand-ink shadow-xs font-semibold'
                      : 'text-brand-ink/70 hover:text-brand-ink'
                  }`}
                >
                  {channel}
                </button>
              ))}
            </div>
          </div>

          {/* Central de Privacidade LGPD */}
          <div className="p-4 rounded-2xl bg-brand-background/80 border border-brand-primary/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-ink">
              <Lock className="w-4 h-4 text-brand-link" />
              <span>Central de Privacidade e Minimização de Dados (LGPD)</span>
            </div>
            <p className="text-xs text-brand-ink/75 leading-relaxed">
              Seu telefone e endereço aproximado nunca ficam públicos. Eles só são liberados quando você autoriza o contato com o prestador compatível ou substituto indicado.
            </p>
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.lgpdConsent}
                onChange={(e) => setForm({ ...form, lgpdConsent: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-brand-link rounded"
              />
              <span className="text-xs text-brand-ink font-medium">
                Concordo com a finalidade específica de uso dos dados para busca de prestadores e sei que posso revogar o consentimento a qualquer momento.
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="submit"
              className="min-h-[48px] px-6 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Salvar cadastro de cliente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('criar-solicitacao')}
              className="text-xs font-semibold text-brand-ink hover:text-brand-link transition-colors cursor-pointer"
            >
              Continuar direto para Criar Solicitação →
            </button>
          </div>
        </form>

        {/* Right Column: Benefícios para o Cliente */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-brand-primary text-white rounded-3xl p-6 space-y-4">
            <p className="text-xs font-semibold text-brand-accent-strong">
              Por que criar sua conta no Recontrate?
            </p>
            <h2 className="font-display font-bold text-lg">
              Sua carteira pessoal de profissionais de confiança
            </h2>
            <ul className="space-y-3 text-xs text-white/85 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-accent-strong shrink-0 mt-0.5" />
                <span>
                  <strong>Solicitar novamente em 1 clique:</strong> guarde o histórico de quem atendeu bem na sua casa.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-accent-strong shrink-0 mt-0.5" />
                <span>
                  <strong>Indicação rastreável de substituto:</strong> se o seu profissional estiver ocupado, receba até 2 indicações diretas da confiança dele.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-accent-strong shrink-0 mt-0.5" />
                <span>
                  <strong>Negociação direta sem taxa oculta:</strong> você combina o orçamento diretamente com o prestador pelo WhatsApp.
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

interface ProviderRegistrationScreenProps {
  onRegisterProvider: (newProvider: ProviderProfile) => void;
  onNavigate: (screen: ScreenId, providerId?: string) => void;
}

export const ProviderRegistrationScreen: React.FC<ProviderRegistrationScreenProps> = ({
  onRegisterProvider,
  onNavigate,
}) => {
  const [form, setForm] = useState<ProviderRegistration>({
    name: '',
    professionalName: '',
    phone: '',
    email: '',
    category: 'Eletricista',
    specialties: '',
    neighborhoods: '',
    radiusKm: 8,
    yearsExperience: 0,
    bio: '',
    acceptsUrgent: false,
    documentUploaded: false,
    addressProofUploaded: false,
    mentorCode: '',
    selectedPlan: 'Gratuito',
    lgpdConsent: false,
  });

  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);

  const applyBioTemplate = () => {
    const templates: Record<CategoryName, string> = {
      Eletricista: `Especialista em ${form.category} com ${form.yearsExperience} anos de experiência em instalações seguras NBR 5410, troca de disjuntores DR e atendimento ágil em ${form.neighborhoods}. Orçamento claro antes de iniciar.`,
      Encanador: `Profissional de hidráulica com ${form.yearsExperience} anos de prática em reparo de registros, válvulas e localização de vazamentos sem quebra desnecessária em ${form.neighborhoods}.`,
      Diarista: `Profissional de limpeza e organização residencial com ${form.yearsExperience} anos de referências verificadas em ${form.neighborhoods}. Cuidado especial com superfícies delicadas e pontualidade.`,
      Pintor: `Pintor residencial com ${form.yearsExperience} anos de ofício, envelopamento total de móveis e pisos e acabamento fino sem respingos em ${form.neighborhoods}.`,
      'Técnico de ar-condicionado': `Técnico especialista em sistemas Split Inverter com ${form.yearsExperience} anos de experiência em higienização bactericida e instalação com bomba de vácuo em ${form.neighborhoods}.`,
    };
    setForm((prev) => ({ ...prev, bio: templates[prev.category] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.professionalName.trim() || !form.phone.trim() || !form.neighborhoods.trim()) {
      setError('Preencha o nome profissional, WhatsApp e bairros de atendimento.');
      return;
    }
    if (!form.lgpdConsent) {
      setError('Confirme o aceite dos termos da rede e verificação de documentos.');
      return;
    }
    setError('');

    const initials = form.professionalName
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || 'P')
      .join('');

    const newProviderId = `prov-${Date.now()}`;
    const newProvider: ProviderProfile = {
      id: newProviderId,
      name: form.professionalName.trim(),
      initials,
      category: form.category,
      specialties: form.specialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      neighborhoods: form.neighborhoods
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean),
      city: 'São Paulo, SP',
      yearsExperience: Number(form.yearsExperience) || 5,
      bio: form.bio.trim(),
      isVerified: false,
      isTopRegion: false,
      mentorName: undefined,
      plan: form.selectedPlan,
      ratingAvg: 0,
      reviewsCount: 0,
      completedJobs: 0,
      responseTimeMinutes: 0,
      responseRatePercent: 0,
      attendanceRatePercent: 0,
      profileCompletenessPercent: 0,
      availableToday: form.acceptsUrgent,
      whatsapp: form.phone,
      trustedSubstitutesIds: [],
      portfolio: [],
      reviews: [],
    };

    onRegisterProvider(newProvider);
    setCreatedId(newProviderId);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-brand-primary/10 pb-6">
        <div>
          <p className="text-xs font-semibold text-brand-accent-strong">
            Tela 02 · Jornada do Prestador Autônomo
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-brand-ink mt-1">
            Cadastro de prestador
          </h1>
          <p className="text-sm text-brand-ink/75 mt-1">
            Construa sua reputação pública, receba oportunidades compatíveis no WhatsApp e fique com 100% do valor dos seus serviços — você não paga comissão à plataforma e negocia diretamente com o cliente, fora dela.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('painel-prestador')}
          className="text-left text-xs font-semibold text-brand-link hover:text-brand-ink underline underline-offset-4 sm:whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          Já é cadastrado? Abrir Painel do Prestador →
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

          {createdId && (
            <div
              role="status"
              className="p-5 rounded-2xl bg-brand-primary text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <p className="text-xs text-brand-accent-contrast font-semibold">
                  Perfil criado neste ambiente.
                </p>
                <p className="text-sm font-display font-semibold">
                  {form.professionalName} ({form.category}) ainda não tem selo de verificação. Ele só é exibido após a análise dos dados enviados.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('perfil-prestador', createdId)}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  Ver minha vitrine pública
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('painel-prestador')}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  Ir ao Painel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="prov-prof-name"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Nome profissional (sua vitrine pública) *
              </label>
              <input
                id="prov-prof-name"
                type="text"
                value={form.professionalName}
                onChange={(e) => setForm({ ...form, professionalName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 focus:border-brand-link"
              />
            </div>

            <div>
              <label
                htmlFor="prov-category"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Categoria principal *
              </label>
              <select
                id="prov-category"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as CategoryName })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 focus:border-brand-link"
              >
                {CATEGORIES_LIST.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="prov-phone"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                WhatsApp para receber oportunidades *
              </label>
              <input
                id="prov-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 focus:border-brand-link"
              />
            </div>

            <div>
              <label
                htmlFor="prov-exp"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Anos de experiência no ofício
              </label>
              <input
                id="prov-exp"
                type="number"
                min={1}
                max={50}
                value={form.yearsExperience}
                onChange={(e) =>
                  setForm({ ...form, yearsExperience: Number(e.target.value) })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink font-mono tabular-nums focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 focus:border-brand-link"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="prov-specialties"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Especialidades secundárias (separadas por vírgula)
              </label>
              <input
                id="prov-specialties"
                type="text"
                value={form.specialties}
                onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 focus:border-brand-link"
              />
            </div>

            <div>
              <label
                htmlFor="prov-neighborhoods"
                className="block text-xs font-semibold text-brand-ink mb-1.5"
              >
                Bairros de atendimento (Raio: {form.radiusKm} km) *
              </label>
              <input
                id="prov-neighborhoods"
                type="text"
                value={form.neighborhoods}
                onChange={(e) => setForm({ ...form, neighborhoods: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 focus:border-brand-link"
              />
            </div>
          </div>

          {/* Assistente de Posicionamento Digital */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="prov-bio"
                className="block text-xs font-semibold text-brand-ink"
              >
                Descrição profissional e diferenciais
              </label>
              <button
                type="button"
                onClick={applyBioTemplate}
                className="text-xs font-semibold text-brand-link hover:text-brand-ink inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sugerir texto otimizado por categoria</span>
              </button>
            </div>
            <textarea
              id="prov-bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-brand-background/60 border border-brand-primary/15 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 focus:border-brand-link"
            />
          </div>

          {/* Verificação de Documentos & Apadrinhamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-brand-background/70 border border-brand-primary/10 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-ink">
                <FileCheck2 className="w-4 h-4 text-brand-link" />
                <span>Verificação para Selo Verificado</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-brand-ink/85 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.documentUploaded}
                  onChange={(e) =>
                    setForm({ ...form, documentUploaded: e.target.checked })
                  }
                  className="w-4 h-4 accent-brand-link"
                />
                <span>Documento oficial com foto (RG ou CNH) anexado</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-brand-ink/85 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.addressProofUploaded}
                  onChange={(e) =>
                    setForm({ ...form, addressProofUploaded: e.target.checked })
                  }
                  className="w-4 h-4 accent-brand-link"
                />
                <span>Comprovante de endereço e certificação técnica</span>
              </label>
            </div>

            <div className="p-4 rounded-2xl bg-brand-background/70 border border-brand-primary/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-ink">
                <Award className="w-4 h-4 text-brand-accent-strong" />
                <span>Rede de Apadrinhamento (Opcional)</span>
              </div>
              <p className="text-[11px] text-brand-ink/70">
                Está começando na plataforma? Informe o código de um Padrinho Verificado para exibir o selo “Indicado por”.
              </p>
              <input
                type="text"
                value={form.mentorCode}
                onChange={(e) => setForm({ ...form, mentorCode: e.target.value })}
                placeholder="Código do Padrinho (ex.: PADRINHO-JOAO-84)"
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-brand-primary/15 text-xs font-mono text-brand-ink"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3">
            <button
              type="submit"
              className="min-h-[48px] px-6 py-3 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Concluir cadastro e ativar vitrine</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <span className="text-xs text-brand-ink/65">
              Tempo estimado de conclusão: menos de 5 minutos
            </span>
          </div>
        </form>

        {/* Right Summary Panel */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-brand-primary text-white rounded-3xl p-6 space-y-4">
            <p className="text-xs font-semibold text-brand-accent-strong">
              Compromisso Justo com o Prestador
            </p>
            <h2 className="font-display font-bold text-lg">
              Sem leilão de leads e sem comissão paga à plataforma
            </h2>
            <p className="text-xs text-white/80 leading-relaxed">
              Você não paga nenhuma comissão ao Recontrate. Todo preço, orçamento e pagamento do serviço são negociados diretamente com o cliente, fora da plataforma. A assinatura mensal cobre apenas o acesso às oportunidades compatíveis, vitrine local e ferramentas de fidelização.
            </p>
            <div className="pt-3 border-t border-white/15 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Plano selecionado:</span>
                <span className="font-semibold text-brand-accent-strong">{form.selectedPlan}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Compra de estrelas:</span>
                <span className="font-mono text-white">Bloqueada por regra</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
