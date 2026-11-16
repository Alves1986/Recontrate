/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import { AdminMonetizationScreen } from './components/AdminMonetizationScreen';
import {
  ForProvidersPage,
  PublicLandingPage,
  TermsAndPrivacyPage,
} from './components/PublicPages';
import { PlansPricingPage } from './components/PlansPricingPage';
import {
  ForgotAndResetPasswordPage,
  LoginPage,
  OnboardingPage,
  PadrinhoDashboardPage,
  SignupPage,
} from './components/AuthPages';
import type {
  AuthenticatedUserSession,
  UserRole,
} from './services/authService';

export function isProtectedRoutePath(pathname: string): boolean {
  return (
    pathname === '/app' ||
    pathname.startsWith('/app/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  );
}

export function canUserAccessRoute(
  pathname: string,
  user: AuthenticatedUserSession | null
): { allowed: boolean; redirectTo?: string } {
  if (!isProtectedRoutePath(pathname)) {
    return { allowed: true };
  }
  if (!user) {
    return { allowed: false, redirectTo: '/entrar' };
  }
  if (!user.onboardingCompleted && pathname !== '/app/onboarding') {
    return { allowed: false, redirectTo: '/app/onboarding' };
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (user.activeRole !== 'admin' && !user.roles.includes('admin')) {
      return { allowed: false, redirectTo: user.redirectTo };
    }
  }
  if (pathname.startsWith('/app/padrinho')) {
    if (
      user.activeRole !== 'padrinho' &&
      user.activeRole !== 'admin' &&
      !user.roles.includes('padrinho')
    ) {
      return { allowed: false, redirectTo: user.redirectTo };
    }
  }
  if (pathname.startsWith('/app/prestador')) {
    if (
      user.activeRole !== 'prestador' &&
      user.activeRole !== 'padrinho' &&
      user.activeRole !== 'admin' &&
      !user.roles.includes('prestador')
    ) {
      return { allowed: false, redirectTo: user.redirectTo };
    }
  }
  return { allowed: true };
}

export default function App() {
  const [pathname, setPathname] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [authUser, setAuthUser] = useState<AuthenticatedUserSession | null>(
    null
  );
  const [authToken, setAuthToken] = useState<string>('');

  const [providers, setProviders] =
    useState<ProviderProfile[]>(INITIAL_PROVIDERS);
  const [selectedProviderId, setSelectedProviderId] =
    useState<string>('prov-joao');

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
  const [repeatRequests, setRepeatRequests] = useState<RepeatServiceRequest[]>(
    []
  );
  const [substituteReferral, setSubstituteReferral] =
    useState<SubstituteReferral>(INITIAL_SUBSTITUTE_REFERRAL);
  const [opportunities, setOpportunities] = useState<ProviderOpportunity[]>(
    INITIAL_PROVIDER_OPPORTUNITIES
  );

  const [clientProfile] = useState<ClientRegistration>({
    name: 'Mariana Souza',
    phone: '(11) 99204-6612',
    email: 'mariana.souza@email.com.br',
    neighborhood: 'Pinheiros',
    city: 'São Paulo, SP',
    favoriteCategories: ['Eletricista', 'Encanador', 'Diarista'],
    preferredContact: 'WhatsApp',
    lgpdConsent: true,
  });

  const navigateUrl = useCallback((nextPath: string) => {
    const cleanPath = nextPath.split('?')[0] || '/';
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', nextPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setPathname(cleanPath);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Restore session on mount if cookie exists
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.ok && body.user) {
          setAuthUser(body.user);
        }
      })
      .catch(() => null);
  }, []);

  // Client-side route protection guard
  useEffect(() => {
    const check = canUserAccessRoute(pathname, authUser);
    if (!check.allowed && check.redirectTo && check.redirectTo !== pathname) {
      navigateUrl(check.redirectTo);
    }
  }, [pathname, authUser, navigateUrl]);

  const handleLegacyScreenNavigate = (screen: ScreenId, providerId?: string) => {
    if (providerId) {
      setSelectedProviderId(providerId);
    }
    const mapScreenToUrl: Record<ScreenId, string> = {
      home: '/',
      'cadastro-cliente': '/criar-conta',
      'cadastro-prestador': '/para-prestadores',
      'criar-solicitacao': authUser ? '/app/cliente/nova-solicitacao' : '/encontrar-profissional',
      'profissionais-compativeis': '/encontrar-profissional',
      'perfil-prestador': `/profissionais/${providerId || selectedProviderId}`,
      'solicitar-novamente': authUser ? '/app/cliente/recontratar' : '/entrar',
      'indicacao-substituto': authUser ? '/app/cliente/substituto' : '/como-funciona',
      'avaliacao-pos-atendimento': authUser ? '/app/cliente/avaliar' : '/entrar',
      'painel-prestador': authUser ? '/app/prestador' : '/entrar',
      'painel-admin': authUser ? '/admin' : '/entrar',
    };
    navigateUrl(mapScreenToUrl[screen] || '/');
  };

  const handleStartSearchFromHome = (
    query: string,
    location: string,
    category?: CategoryName
  ) => {
    setSearchQuery(query);
    setLocationQuery(location.split(',')[0]?.trim() || location);
    setActiveCategory(category || 'Todas');
    navigateUrl('/encontrar-profissional');
  };

  const handleSelectCategoryFromHome = (category: CategoryName) => {
    setActiveCategory(category);
    setSearchQuery('');
    navigateUrl('/encontrar-profissional');
  };

  const handleCreateServiceRequest = async (newReq: ServiceRequest) => {
    setServiceRequests((prev) => [newReq, ...prev]);
    setActiveCategory(newReq.category);
    setLocationQuery(newReq.neighborhood);
    setSearchQuery('');

    if (authUser) {
      await fetch('/api/app/cliente/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          categoryName: newReq.category,
          problemTitle: newReq.problemTitle,
          description: newReq.description,
          neighborhood: newReq.neighborhood,
          city: newReq.city,
          urgency: newReq.urgency,
          preferredTime: newReq.preferredTime,
          estimatedBudget: newReq.estimatedBudget,
          lgpdContactConsent: newReq.lgpdContactConsent,
          customerPhone: clientProfile.phone,
        }),
      }).catch(() => null);
    }

    const newOpp: ProviderOpportunity = {
      id: `opp-${Date.now()}`,
      category: newReq.category,
      title: newReq.problemTitle,
      description: newReq.description,
      neighborhood: newReq.neighborhood,
      distanceKm: 1.2,
      urgency: newReq.urgency,
      preferredTime: newReq.preferredTime,
      clientNameMasked: `${(authUser?.fullName || clientProfile.name).split(' ')[0]} (Cliente Verificado)`,
      clientNameFull: authUser?.fullName || clientProfile.name,
      clientWhatsapp: clientProfile.phone,
      origin: newReq.preferredPreviousProviderId
        ? 'Recontratação Direta'
        : 'Matching Local',
      photosAttached: newReq.photosCount,
      expiresInMinutes: 30,
      status: 'pendente',
    };
    setOpportunities((prev) => [newOpp, ...prev]);
    navigateUrl('/encontrar-profissional');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    setAuthUser(null);
    setAuthToken('');
    navigateUrl('/entrar');
  };

  const handleSwitchRole = async (targetRole: UserRole) => {
    if (!authToken && !authUser) return;
    const res = await fetch('/api/auth/switch-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ targetRole, enableIfMissing: true }),
    });
    const body = await res.json();
    if (res.ok && body.ok) {
      setAuthUser(body.user);
      setAuthToken(body.token);
      navigateUrl(body.redirectTo);
    }
  };

  const slugFromProfileRoute = pathname.startsWith('/profissionais/')
    ? pathname.replace('/profissionais/', '')
    : null;
  const activeProvider =
    providers.find(
      (p) => p.id === (slugFromProfileRoute || selectedProviderId)
    ) || providers[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F2EF] text-[#0A2540] overflow-x-hidden">
      {/* HEADER PÚBLICO / AUTENTICADO */}
      <header className="bg-white border-b border-[#0A2540]/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4">
          <button
            type="button"
            onClick={() => navigateUrl('/')}
            className="text-left focus:outline-none cursor-pointer shrink-0"
            aria-label="Confiare Início"
          >
            <ConfiareLogo variant="dark-text" size="sm" />
          </button>

          <nav
            aria-label="Navegação Principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#0A2540]/80"
          >
            <button
              type="button"
              onClick={() => navigateUrl('/como-funciona')}
              className={`hover:text-[#0A2540] cursor-pointer ${
                pathname === '/como-funciona'
                  ? 'text-[#0A2540] font-semibold underline underline-offset-8 decoration-2 decoration-[#FF6A00]'
                  : ''
              }`}
            >
              Como funciona
            </button>
            <button
              type="button"
              onClick={() => navigateUrl('/para-prestadores')}
              className={`hover:text-[#0A2540] cursor-pointer ${
                pathname === '/para-prestadores'
                  ? 'text-[#0A2540] font-semibold underline underline-offset-8 decoration-2 decoration-[#FF6A00]'
                  : ''
              }`}
            >
              Para prestadores
            </button>
            <button
              type="button"
              onClick={() => navigateUrl('/encontrar-profissional')}
              className={`hover:text-[#0A2540] cursor-pointer ${
                pathname === '/encontrar-profissional'
                  ? 'text-[#0A2540] font-semibold underline underline-offset-8 decoration-2 decoration-[#FF6A00]'
                  : ''
              }`}
            >
              Encontrar profissional
            </button>
            <button
              type="button"
              onClick={() => navigateUrl('/planos')}
              className={`hover:text-[#0A2540] cursor-pointer ${
                pathname === '/planos'
                  ? 'text-[#0A2540] font-semibold underline underline-offset-8 decoration-2 decoration-[#FF6A00]'
                  : ''
              }`}
            >
              Planos
            </button>
          </nav>

          {/* Ações de Autenticação / Sessão */}
          <div className="flex items-center gap-2.5 shrink-0">
            {!authUser ? (
              <>
                <button
                  type="button"
                  onClick={() => navigateUrl('/entrar')}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540] font-display font-semibold text-xs sm:text-sm cursor-pointer"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => navigateUrl('/criar-conta')}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#e65f00] text-white font-display font-semibold text-xs sm:text-sm cursor-pointer"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => navigateUrl(authUser.redirectTo)}
                  className="px-3 py-2 rounded-xl bg-[#0A2540] text-white font-semibold cursor-pointer"
                >
                  Painel ({authUser.activeRole})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSwitchRole(
                      authUser.activeRole === 'cliente'
                        ? 'prestador'
                        : 'cliente'
                    )
                  }
                  className="px-3 py-2 rounded-xl bg-[#F4F2EF] hover:bg-[#e5e2dc] text-[#0A2540] font-semibold cursor-pointer"
                >
                  Alternar para{' '}
                  {authUser.activeRole === 'cliente' ? 'Prestador' : 'Cliente'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-xl border border-[#0A2540]/15 text-[#0A2540] hover:bg-red-50 cursor-pointer"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN ROUTER VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* ÁREA PÚBLICA */}
        {pathname === '/' && (
          <PublicLandingPage
            providers={providers}
            onStartSearch={handleStartSearchFromHome}
            onSelectCategory={handleSelectCategoryFromHome}
            onNavigateUrl={navigateUrl}
          />
        )}

        {pathname === '/para-prestadores' && (
          <ForProvidersPage onNavigateUrl={navigateUrl} />
        )}

        {pathname === '/como-funciona' && (
          <PublicLandingPage
            providers={providers}
            onStartSearch={handleStartSearchFromHome}
            onSelectCategory={handleSelectCategoryFromHome}
            onNavigateUrl={navigateUrl}
          />
        )}

        {pathname === '/planos' && (
          <PlansPricingPage
            onNavigateUrl={navigateUrl}
            isLoggedProvider={Boolean(
              authUser &&
                (authUser.activeRole === 'prestador' ||
                  authUser.roles.includes('prestador'))
            )}
            providerContext={
              authUser?.providerProfileId
                ? {
                    providerProfileId: authUser.providerProfileId,
                    fullName: authUser.fullName,
                    email: authUser.email,
                  }
                : null
            }
          />
        )}

        {pathname === '/encontrar-profissional' && (
          <CompatibleProvidersListScreen
            providers={providers}
            activeCategory={activeCategory}
            searchQuery={searchQuery}
            locationQuery={locationQuery}
            latestRequest={serviceRequests[0]}
            onChangeCategory={setActiveCategory}
            onChangeSearch={setSearchQuery}
            onChangeLocation={setLocationQuery}
            onSelectProvider={(id) => navigateUrl(`/profissionais/${id}`)}
            onRepeatProvider={() =>
              navigateUrl(authUser ? '/app/cliente/recontratar' : '/entrar')
            }
            onNavigate={handleLegacyScreenNavigate}
          />
        )}

        {pathname.startsWith('/profissionais/') && (
          <ProviderProfileScreen
            provider={activeProvider}
            allProviders={providers}
            onSelectProvider={(id) => navigateUrl(`/profissionais/${id}`)}
            onNavigate={handleLegacyScreenNavigate}
          />
        )}

        {pathname === '/entrar' && (
          <LoginPage
            onAuthenticated={(user, token, redirectTo) => {
              setAuthUser(user);
              setAuthToken(token);
              navigateUrl(redirectTo);
            }}
            onNavigateUrl={navigateUrl}
          />
        )}

        {pathname === '/criar-conta' && (
          <SignupPage
            onAuthenticated={(user, token, redirectTo) => {
              setAuthUser(user);
              setAuthToken(token);
              navigateUrl(redirectTo);
            }}
            onNavigateUrl={navigateUrl}
          />
        )}

        {pathname === '/recuperar-senha' && (
          <ForgotAndResetPasswordPage onNavigateUrl={navigateUrl} />
        )}

        {pathname === '/termos' && <TermsAndPrivacyPage mode="termos" />}
        {pathname === '/privacidade' && (
          <TermsAndPrivacyPage mode="privacidade" />
        )}

        {/* ÁREA AUTENTICADA PROTEGIDA */}
        {authUser && pathname === '/app/onboarding' && (
          <OnboardingPage
            user={authUser}
            token={authToken}
            onComplete={(redirectTo) => {
              setAuthUser((prev) =>
                prev ? { ...prev, onboardingCompleted: true } : prev
              );
              navigateUrl(redirectTo);
            }}
          />
        )}

        {authUser &&
          (pathname === '/app' ||
            pathname === '/app/cliente' ||
            pathname === '/app/cliente/nova-solicitacao') && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-4 border border-[#0A2540]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#0A2540]">
                  Área Autenticada do Cliente — Olá, {authUser.fullName}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigateUrl('/app/cliente/nova-solicitacao')}
                    className="px-3 py-1.5 rounded-lg bg-[#0A2540] text-white font-semibold cursor-pointer"
                  >
                    Nova Solicitação
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateUrl('/app/cliente/recontratar')}
                    className="px-3 py-1.5 rounded-lg bg-[#F4F2EF] text-[#0A2540] font-semibold cursor-pointer"
                  >
                    Recontratar
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateUrl('/app/cliente/avaliar')}
                    className="px-3 py-1.5 rounded-lg bg-[#F4F2EF] text-[#0A2540] font-semibold cursor-pointer"
                  >
                    Avaliar Atendimento
                  </button>
                </div>
              </div>

              <CreateServiceRequestScreen
                initialCategory={
                  activeCategory !== 'Todas' ? activeCategory : 'Eletricista'
                }
                initialQuery={searchQuery}
                initialLocation={locationQuery}
                providers={providers}
                requests={serviceRequests}
                onCreateRequest={handleCreateServiceRequest}
                onNavigate={handleLegacyScreenNavigate}
              />
            </div>
          )}

        {authUser && pathname === '/app/cliente/recontratar' && (
          <RepeatRequestScreen
            providers={providers}
            selectedProviderId={selectedProviderId}
            repeatRequests={repeatRequests}
            onCreateRepeatRequest={(newRepeat) => {
              setRepeatRequests((prev) => [newRepeat, ...prev]);
              fetch('/api/app/cliente/repeat-requests', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({
                  providerProfileId: newRepeat.providerId,
                  categoryName: newRepeat.category,
                  serviceType: newRepeat.serviceType,
                  desiredDate: newRepeat.desiredDate,
                  urgency: newRepeat.urgency,
                  notes: newRepeat.notes,
                  lgpdShareConsent: newRepeat.lgpdShareConsent,
                }),
              }).catch(() => null);
            }}
            onTriggerSubstituteFlow={() => navigateUrl('/app/cliente/substituto')}
            onNavigate={handleLegacyScreenNavigate}
          />
        )}

        {authUser && pathname === '/app/cliente/substituto' && (
          <SubstituteReferralScreen
            providers={providers}
            currentReferral={substituteReferral}
            onUpdateReferral={setSubstituteReferral}
            onAcceptSubstitute={(id) => setSelectedProviderId(id)}
            onNavigate={handleLegacyScreenNavigate}
          />
        )}

        {authUser && pathname === '/app/cliente/avaliar' && (
          <PostServiceReviewScreen
            providers={providers}
            selectedProviderId={selectedProviderId}
            onSubmitReview={(providerId, reviewData) => {
              setProviders((prev) =>
                prev.map((p) =>
                  p.id === providerId ? applyNewReviewToProvider(p, reviewData) : p
                )
              );
              fetch('/api/app/cliente/reviews', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({
                  providerProfileId: providerId,
                  neighborhood: reviewData.neighborhood,
                  serviceTitle: reviewData.serviceTitle,
                  qualidade: reviewData.qualidade,
                  pontualidade: reviewData.pontualidade,
                  comunicacao: reviewData.comunicacao,
                  organizacao: reviewData.organizacao,
                  wouldRecommend: reviewData.wouldRecommend,
                  comment: reviewData.comment,
                }),
              }).catch(() => null);
            }}
            onNavigate={handleLegacyScreenNavigate}
          />
        )}

        {authUser && pathname.startsWith('/app/prestador') && (
          <ProviderDashboardScreen
            activeProvider={activeProvider}
            opportunities={opportunities}
            onAddRealtimeOpportunity={(newOpp) =>
              setOpportunities((prev) => [newOpp, ...prev])
            }
            onUpdateOpportunityStatus={(oppId, status) =>
              setOpportunities((prev) =>
                prev.map((o) => (o.id === oppId ? { ...o, status } : o))
              )
            }
            onChangeProviderPlan={(providerId: string, newPlan: PlanTier) =>
              setProviders((prev) =>
                prev.map((p) =>
                  p.id === providerId ? { ...p, plan: newPlan } : p
                )
              )
            }
            onToggleProviderAvailability={(providerId: string) =>
              setProviders((prev) =>
                prev.map((p) =>
                  p.id === providerId
                    ? { ...p, availableToday: !p.availableToday }
                    : p
                )
              )
            }
            onNavigate={handleLegacyScreenNavigate}
          />
        )}

        {authUser && pathname.startsWith('/app/padrinho') && (
          <PadrinhoDashboardPage user={authUser} token={authToken} />
        )}

        {authUser && pathname.startsWith('/admin') && (
          <AdminMonetizationScreen />
        )}
      </main>

      {/* FOOTER COM TERMOS, PRIVACIDADE, CONTATO E REDES SOCIAIS */}
      <footer className="bg-white border-t border-[#0A2540]/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#0A2540]/70">
          <div className="flex items-center gap-3">
            <ConfiareLogo variant="dark-text" size="sm" />
            <span>·</span>
            <span>Marketplace Brasileiro de Serviços Locais de Confiança</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigateUrl('/termos')}
              className="hover:text-[#0A2540] cursor-pointer"
            >
              Termos de Uso
            </button>
            <button
              type="button"
              onClick={() => navigateUrl('/privacidade')}
              className="hover:text-[#0A2540] cursor-pointer"
            >
              Privacidade LGPD
            </button>
            <button
              type="button"
              onClick={() => navigateUrl('/para-prestadores')}
              className="hover:text-[#0A2540] cursor-pointer"
            >
              Para Prestadores
            </button>
            <span>contato@confiare.com.br · @confiare.br</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
