/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CategoryName,
  ClientRegistration,
  PlanTier,
  ProviderOpportunity,
  ProviderProfile,
  RepeatServiceRequest,
  ScreenId,
  ServiceRequest,
  SubstituteReferral,
} from './types/confiare';
import {
  INITIAL_PROVIDER_OPPORTUNITIES,
  INITIAL_PROVIDERS,
  INITIAL_SERVICE_REQUESTS,
  INITIAL_SUBSTITUTE_REFERRAL,
} from './data/seedData';
import { applyNewReviewToProvider } from './utils/marketplaceRules';
import { ConfiareLogo } from './components/ConfiareLogo';
import { HomeScreen } from './components/HomeScreen';
import {
  ClientRegistrationScreen,
  ProviderRegistrationScreen,
} from './components/AuthRegistrationScreens';
import {
  CompatibleProvidersListScreen,
  CreateServiceRequestScreen,
} from './components/ServiceRequestAndListScreens';
import {
  ProviderProfileScreen,
  RepeatRequestScreen,
} from './components/ProviderProfileAndRepeatScreens';
import {
  PostServiceReviewScreen,
  SubstituteReferralScreen,
} from './components/SubstituteAndReviewScreens';
import { ProviderDashboardScreen } from './components/ProviderDashboardScreen';

const PROTOTYPE_SCREENS: { id: ScreenId; label: string; shortLabel: string }[] = [
  { id: 'home', label: 'Início (Home)', shortLabel: 'Home' },
  {
    id: 'cadastro-cliente',
    label: '1. Cadastro de cliente',
    shortLabel: '1. Cad. Cliente',
  },
  {
    id: 'cadastro-prestador',
    label: '2. Cadastro de prestador',
    shortLabel: '2. Cad. Prestador',
  },
  {
    id: 'criar-solicitacao',
    label: '3. Criação de solicitação',
    shortLabel: '3. Solicitação',
  },
  {
    id: 'profissionais-compativeis',
    label: '4. Profissionais compatíveis',
    shortLabel: '4. Compatíveis',
  },
  {
    id: 'perfil-prestador',
    label: '5. Perfil do prestador',
    shortLabel: '5. Perfil',
  },
  {
    id: 'solicitar-novamente',
    label: '6. Solicitar novamente',
    shortLabel: '6. Recontratar',
  },
  {
    id: 'indicacao-substituto',
    label: '7. Indicação de substituto',
    shortLabel: '7. Substituto',
  },
  {
    id: 'avaliacao-pos-atendimento',
    label: '8. Avaliação pós-atendimento',
    shortLabel: '8. Avaliação',
  },
  {
    id: 'painel-prestador',
    label: '9. Painel do prestador',
    shortLabel: '9. Painel',
  },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [providers, setProviders] = useState<ProviderProfile[]>(INITIAL_PROVIDERS);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('prov-joao');

  // Filter & Search state
  const [activeCategory, setActiveCategory] = useState<CategoryName | 'Todas'>(
    'Todas'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [locationQuery, setLocationQuery] = useState<string>('Pinheiros');

  // Service requests & Repeat requests state
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(
    INITIAL_SERVICE_REQUESTS
  );
  const [repeatRequests, setRepeatRequests] = useState<RepeatServiceRequest[]>([]);
  const [substituteReferral, setSubstituteReferral] = useState<SubstituteReferral>(
    INITIAL_SUBSTITUTE_REFERRAL
  );

  // Provider opportunities state
  const [opportunities, setOpportunities] = useState<ProviderOpportunity[]>(
    INITIAL_PROVIDER_OPPORTUNITIES
  );

  // Client Registration state
  const [clientProfile, setClientProfile] = useState<ClientRegistration>({
    name: 'Mariana Souza',
    phone: '(11) 99204-6612',
    email: 'mariana.souza@email.com.br',
    neighborhood: 'Pinheiros',
    city: 'São Paulo, SP',
    favoriteCategories: ['Eletricista', 'Encanador', 'Diarista'],
    preferredContact: 'WhatsApp',
    lgpdConsent: true,
  });

  const handleNavigate = (screen: ScreenId, providerId?: string) => {
    if (providerId) {
      setSelectedProviderId(providerId);
    }
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartSearchFromHome = (
    query: string,
    location: string,
    category?: CategoryName
  ) => {
    setSearchQuery(query);
    setLocationQuery(location.split(',')[0]?.trim() || location);
    if (category) {
      setActiveCategory(category);
    } else {
      setActiveCategory('Todas');
    }
    setCurrentScreen('profissionais-compativeis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategoryFromHome = (category: CategoryName) => {
    setActiveCategory(category);
    setSearchQuery('');
    setCurrentScreen('profissionais-compativeis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateServiceRequest = (newReq: ServiceRequest) => {
    setServiceRequests((prev) => [newReq, ...prev]);
    setActiveCategory(newReq.category);
    setLocationQuery(newReq.neighborhood);
    setSearchQuery('');

    // Also add as a new opportunity in the Provider Dashboard
    const newOpp: ProviderOpportunity = {
      id: `opp-${Date.now()}`,
      category: newReq.category,
      title: newReq.problemTitle,
      description: newReq.description,
      neighborhood: newReq.neighborhood,
      distanceKm: 1.2,
      urgency: newReq.urgency,
      preferredTime: newReq.preferredTime,
      clientNameMasked: `${clientProfile.name.split(' ')[0]} (Cliente Verificado)`,
      clientNameFull: clientProfile.name,
      clientWhatsapp: clientProfile.phone,
      origin: newReq.preferredPreviousProviderId
        ? 'Recontratação Direta'
        : 'Matching Local',
      photosAttached: newReq.photosCount,
      expiresInMinutes: 30,
      status: 'pendente',
    };
    setOpportunities((prev) => [newOpp, ...prev]);
    setCurrentScreen('profissionais-compativeis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegisterNewProvider = (newProvider: ProviderProfile) => {
    setProviders((prev) => [newProvider, ...prev]);
    setSelectedProviderId(newProvider.id);
  };

  const handleCreateRepeatRequest = (newRepeat: RepeatServiceRequest) => {
    setRepeatRequests((prev) => [newRepeat, ...prev]);
  };

  const handleTriggerSubstituteFlow = (
    providerId: string,
    serviceSummary: string
  ) => {
    const prov = providers.find((p) => p.id === providerId) || providers[0];
    const subIds =
      prov.trustedSubstitutesIds.length > 0
        ? prov.trustedSubstitutesIds.slice(0, 2)
        : ['prov-carlos', 'prov-marcos'];

    setSubstituteReferral({
      id: `sub-${Date.now()}`,
      originalProviderId: prov.id,
      substituteProviderIds: subIds,
      reasonCategory: 'Agenda cheia na data',
      customNote: `Estou em outro atendimento técnico na data solicitada, mas indico com total confiança meus colegas verificados da rede Confiare para resolver "${serviceSummary}".`,
      serviceContext: serviceSummary,
      neighborhood: clientProfile.neighborhood || 'Pinheiros',
      urgency: 'Hoje / Esta semana',
      createdAt: 'Agora mesmo',
    });
    setCurrentScreen('indicacao-substituto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAcceptSubstitute = (substituteProviderId: string) => {
    setSubstituteReferral((prev) => ({
      ...prev,
      clientAcceptedProviderId: substituteProviderId,
    }));
    setSelectedProviderId(substituteProviderId);
  };

  const handleSubmitReview = (
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
  ) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === providerId ? applyNewReviewToProvider(p, reviewData) : p
      )
    );
  };

  const handleUpdateOpportunityStatus = (
    oppId: string,
    status: ProviderOpportunity['status']
  ) => {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, status } : o))
    );
  };

  const handleChangeProviderPlan = (providerId: string, newPlan: PlanTier) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, plan: newPlan } : p))
    );
  };

  const handleToggleProviderAvailability = (providerId: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === providerId ? { ...p, availableToday: !p.availableToday } : p
      )
    );
  };

  const activeProvider =
    providers.find((p) => p.id === selectedProviderId) || providers[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F2EF] text-[#0A2540] overflow-x-hidden">
      {/* TOP BAR CONTRACT: 1 row, 3 zones separated by gap-8 on desktop, compact on mobile */}
      <header className="bg-white border-b border-[#0A2540]/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-8 px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          {/* Zone 1: Single brand wordmark */}
          <button
            type="button"
            onClick={() => handleNavigate('home')}
            className="text-left focus:outline-none cursor-pointer whitespace-nowrap shrink-0"
            aria-label="Confiare Início"
          >
            <ConfiareLogo variant="dark-text" size="sm" />
          </button>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Navegação Principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#0A2540]/80"
          >
            <button
              type="button"
              onClick={() => handleNavigate('home')}
              className={`hover:text-[#0A2540] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentScreen === 'home'
                  ? 'text-[#0A2540] font-semibold underline underline-offset-8 decoration-2 decoration-[#FF6A00]'
                  : ''
              }`}
            >
              Início
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('criar-solicitacao')}
              className={`hover:text-[#0A2540] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentScreen === 'criar-solicitacao'
                  ? 'text-[#0A2540] font-semibold underline underline-offset-8 decoration-2 decoration-[#FF6A00]'
                  : ''
              }`}
            >
              Solicitar Serviço
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('profissionais-compativeis')}
              className={`hover:text-[#0A2540] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentScreen === 'profissionais-compativeis'
                  ? 'text-[#0A2540] font-semibold underline underline-offset-8 decoration-2 decoration-[#FF6A00]'
                  : ''
              }`}
            >
              Profissionais
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('solicitar-novamente')}
              className={`hover:text-[#0A2540] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentScreen === 'solicitar-novamente'
                  ? 'text-[#0A2540] font-semibold underline underline-offset-8 decoration-2 decoration-[#FF6A00]'
                  : ''
              }`}
            >
              Recontratar
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('painel-prestador')}
              className={`hover:text-[#0A2540] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentScreen === 'painel-prestador'
                  ? 'text-[#0A2540] font-semibold underline underline-offset-8 decoration-2 decoration-[#FF6A00]'
                  : ''
              }`}
            >
              Painel Prestador
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate('criar-solicitacao')}
              className="min-h-[40px] sm:min-h-[42px] px-3 sm:px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Encontrar um profissional
            </button>
          </div>
        </div>
      </header>

      {/* WORKSPACE PROTOTYPE JOURNEY SWITCHER (Below the fold / outside header) */}
      <div className="bg-[#0A2540]/5 border-b border-[#0A2540]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#0A2540]/65 whitespace-nowrap shrink-0 mr-1">
            Fluxos do Protótipo:
          </span>
          {PROTOTYPE_SCREENS.map((item) => {
            const active = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#0A2540] text-white font-semibold'
                    : 'bg-white text-[#0A2540]/80 hover:bg-white hover:text-[#0A2540] border border-[#0A2540]/10'
                }`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {currentScreen === 'home' && (
          <HomeScreen
            providers={providers}
            onStartSearch={handleStartSearchFromHome}
            onSelectCategory={handleSelectCategoryFromHome}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'cadastro-cliente' && (
          <ClientRegistrationScreen
            savedClient={clientProfile}
            onSaveClient={setClientProfile}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'cadastro-prestador' && (
          <ProviderRegistrationScreen
            onRegisterProvider={handleRegisterNewProvider}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'criar-solicitacao' && (
          <CreateServiceRequestScreen
            initialCategory={
              activeCategory !== 'Todas' ? activeCategory : 'Eletricista'
            }
            initialQuery={searchQuery}
            initialLocation={locationQuery}
            providers={providers}
            requests={serviceRequests}
            onCreateRequest={handleCreateServiceRequest}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'profissionais-compativeis' && (
          <CompatibleProvidersListScreen
            providers={providers}
            activeCategory={activeCategory}
            searchQuery={searchQuery}
            locationQuery={locationQuery}
            latestRequest={serviceRequests[0]}
            onChangeCategory={setActiveCategory}
            onChangeSearch={setSearchQuery}
            onChangeLocation={setLocationQuery}
            onSelectProvider={(id) => handleNavigate('perfil-prestador', id)}
            onRepeatProvider={(id) => handleNavigate('solicitar-novamente', id)}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'perfil-prestador' && (
          <ProviderProfileScreen
            provider={activeProvider}
            allProviders={providers}
            onSelectProvider={setSelectedProviderId}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'solicitar-novamente' && (
          <RepeatRequestScreen
            providers={providers}
            selectedProviderId={selectedProviderId}
            repeatRequests={repeatRequests}
            onCreateRepeatRequest={handleCreateRepeatRequest}
            onTriggerSubstituteFlow={handleTriggerSubstituteFlow}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'indicacao-substituto' && (
          <SubstituteReferralScreen
            providers={providers}
            currentReferral={substituteReferral}
            onUpdateReferral={setSubstituteReferral}
            onAcceptSubstitute={handleAcceptSubstitute}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'avaliacao-pos-atendimento' && (
          <PostServiceReviewScreen
            providers={providers}
            selectedProviderId={selectedProviderId}
            onSubmitReview={handleSubmitReview}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'painel-prestador' && (
          <ProviderDashboardScreen
            activeProvider={activeProvider}
            opportunities={opportunities}
            onUpdateOpportunityStatus={handleUpdateOpportunityStatus}
            onChangeProviderPlan={handleChangeProviderPlan}
            onToggleProviderAvailability={handleToggleProviderAvailability}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* QUIET FOOTER */}
      <footer className="bg-white border-t border-[#0A2540]/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#0A2540]/70">
          <div className="flex items-center gap-3">
            <ConfiareLogo variant="dark-text" size="sm" />
            <span>·</span>
            <span>Protótipo de Validação de Experiência (Cliente & Prestador)</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => handleNavigate('cadastro-cliente')}
              className="hover:text-[#0A2540] cursor-pointer"
            >
              Privacidade LGPD
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('painel-prestador')}
              className="hover:text-[#0A2540] cursor-pointer"
            >
              Planos para Prestadores
            </button>
            <span>Sem intermediação de pagamento no MVP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
