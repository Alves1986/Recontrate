/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import {
  CategoryName,
  ClientRegistration,
  PlanSlug,
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
import { BrandLogo } from './components/BrandLogo';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { ReportContentModal } from './components/ReportContentModal';
import { getLegalIdentity } from './config/legalIdentity';
import type {
  AuthenticatedUserSession,
  UserRole,
} from './services/authService';
import { authClient } from './lib/neonClient';
import {
  detectStandaloneDisplayMode,
  shouldRenderMobileLoginOnly,
} from './utils/pwaMobileMode';

const CompatibleProvidersListScreen = lazy(() =>
  import('./components/ServiceRequestAndListScreens').then((m) => ({
    default: m.CompatibleProvidersListScreen,
  }))
);
const CreateServiceRequestScreen = lazy(() =>
  import('./components/ServiceRequestAndListScreens').then((m) => ({
    default: m.CreateServiceRequestScreen,
  }))
);
const ProviderProfileScreen = lazy(() =>
  import('./components/ProviderProfileAndRepeatScreens').then((m) => ({
    default: m.ProviderProfileScreen,
  }))
);
const RepeatRequestScreen = lazy(() =>
  import('./components/ProviderProfileAndRepeatScreens').then((m) => ({
    default: m.RepeatRequestScreen,
  }))
);
const PostServiceReviewScreen = lazy(() =>
  import('./components/SubstituteAndReviewScreens').then((m) => ({
    default: m.PostServiceReviewScreen,
  }))
);
const SubstituteReferralScreen = lazy(() =>
  import('./components/SubstituteAndReviewScreens').then((m) => ({
    default: m.SubstituteReferralScreen,
  }))
);
const ProviderDashboardScreen = lazy(() =>
  import('./components/ProviderDashboardScreen').then((m) => ({
    default: m.ProviderDashboardScreen,
  }))
);
const AdminMonetizationScreen = lazy(() =>
  import('./components/AdminMonetizationScreen').then((m) => ({
    default: m.AdminMonetizationScreen,
  }))
);
const ForProvidersPage = lazy(() =>
  import('./components/PublicPages').then((m) => ({
    default: m.ForProvidersPage,
  }))
);
const PublicLandingPage = lazy(() =>
  import('./components/PublicPages').then((m) => ({
    default: m.PublicLandingPage,
  }))
);
const TermsAndPrivacyPage = lazy(() =>
  import('./components/PublicPages').then((m) => ({
    default: m.TermsAndPrivacyPage,
  }))
);
const PlansPricingPage = lazy(() =>
  import('./components/PlansPricingPage').then((m) => ({
    default: m.PlansPricingPage,
  }))
);
const ReferralDashboardPanel = lazy(() =>
  import('./components/ReferralDashboardPanel').then((m) => ({
    default: m.ReferralDashboardPanel,
  }))
);
const DemoShowcasePage = lazy(() =>
  import('./components/DemoShowcasePage').then((m) => ({
    default: m.DemoShowcasePage,
  }))
);
const ForgotAndResetPasswordPage = lazy(() =>
  import('./components/AuthPages').then((m) => ({
    default: m.ForgotAndResetPasswordPage,
  }))
);
const LoginPage = lazy(() =>
  import('./components/AuthPages').then((m) => ({ default: m.LoginPage }))
);
const OnboardingPage = lazy(() =>
  import('./components/AuthPages').then((m) => ({
    default: m.OnboardingPage,
  }))
);
const PadrinhoDashboardPage = lazy(() =>
  import('./components/AuthPages').then((m) => ({
    default: m.PadrinhoDashboardPage,
  }))
);
const SignupPage = lazy(() =>
  import('./components/AuthPages').then((m) => ({ default: m.SignupPage }))
);
const VerifyEmailPage = lazy(() =>
  import('./components/AuthPages').then((m) => ({
    default: m.VerifyEmailPage,
  }))
);
const PrivacyCenterPage = lazy(() =>
  import('./components/PrivacyCenterPage').then((m) => ({
    default: m.PrivacyCenterPage,
  }))
);

function planTierToSlug(tier?: PlanTier): PlanSlug {
  switch (tier) {
    case 'Essencial':
      return 'essencial';
    case 'Profissional':
      return 'profissional';
    case 'Premium':
      return 'premium';
    default:
      return 'gratuito';
  }
}

const EmailUnsubscribeConfirmView: React.FC<{
  onNavigateUrl: (path: string) => void;
}> = ({ onNavigateUrl }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState(
    'Processando seu pedido de descadastro...'
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email') || '';
    const sig = params.get('sig') || '';
    if (!email || !sig) {
      setStatus('error');
      setMessage('Link de descadastro incompleto ou inválido.');
      return;
    }
    fetch('/api/public/email/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sig }),
    })
      .then((r) => r.json().catch(() => null))
      .then((body) => {
        if (body?.ok) {
          setStatus('success');
          setMessage(
            body.message ||
              `O e-mail ${email} foi removido das comunicações promocionais.`
          );
        } else {
          setStatus('error');
          setMessage(body?.error || 'Não foi possível validar o link.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Erro de conexão ao processar o descadastro.');
      });
  }, []);

  return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 border border-brand-primary/10 text-center space-y-4 my-10 text-xs">
      <h1 className="font-display font-bold text-xl text-brand-ink">
        Descadastro de Comunicações por E-mail
      </h1>
      <p
        role="status"
        className={`p-4 rounded-xl font-medium ${
          status === 'error'
            ? 'bg-red-50 text-red-800 border border-red-200'
            : status === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-brand-background text-brand-ink'
        }`}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={() => onNavigateUrl('/')}
        className="min-h-[42px] px-5 py-2.5 rounded-xl bg-brand-primary text-white font-display font-semibold cursor-pointer"
      >
        Voltar ao início
      </button>
    </div>
  );
};

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
  if (pathname === '/app/privacidade') {
    return { allowed: true };
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
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [cookieBannerSignal, setCookieBannerSignal] = useState<number>(0);
  const [reportModalTarget, setReportModalTarget] = useState<{
    open: boolean;
    targetType: 'provider_profile' | 'review' | 'other';
    targetId: string;
    label?: string;
  }>({ open: false, targetType: 'other', targetId: 'geral' });
  const legalIdentity = getLegalIdentity();
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [isStandalonePwa, setIsStandalonePwa] = useState<boolean>(() =>
    detectStandaloneDisplayMode()
  );
  const [installPromptEvent, setInstallPromptEvent] = useState<
    (Event & { prompt: () => Promise<void> }) | null
  >(null);

  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [ownProviderProfile, setOwnProviderProfile] =
    useState<ProviderProfile | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [authProviderPlanOverride, setAuthProviderPlanOverride] =
    useState<PlanTier | null>(null);

  // Filter & Search state
  const [activeCategory, setActiveCategory] = useState<CategoryName | 'Todas'>(
    'Todas'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [locationQuery, setLocationQuery] = useState<string>('Pinheiros');

  // Service requests & Repeat requests state
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [repeatRequests, setRepeatRequests] = useState<RepeatServiceRequest[]>(
    []
  );
  const [substituteReferral, setSubstituteReferral] =
    useState<SubstituteReferral>(INITIAL_SUBSTITUTE_REFERRAL);
  const [opportunities, setOpportunities] = useState<ProviderOpportunity[]>([]);

  const [clientProfile] = useState<ClientRegistration>({
    name: authUser?.fullName || 'Cliente Recontrate',
    phone: authUser?.phone || '',
    email: authUser?.email || '',
    neighborhood: authUser?.neighborhood || 'Pinheiros',
    city: authUser?.city || 'São Paulo, SP',
    favoriteCategories: ['Eletricista', 'Encanador', 'Diarista'],
    preferredContact: 'WhatsApp',
    lgpdConsent: false,
  });

  const buildAuthHeaders = useCallback(
    (json = false): Record<string, string> => ({
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken && authToken.split('.').length === 3
        ? { Authorization: `Bearer ${authToken}` }
        : {}),
    }),
    [authToken]
  );

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

  // Restore session on mount strictly from authenticated backend cookie / Neon Auth (no localStorage credentials)
  useEffect(() => {
    let cancelled = false;
    const isValidJwtToken = (t?: string | null): boolean =>
      Boolean(t && t.split('.').length === 3);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('recontrate_pilot_session');
        window.localStorage.removeItem('recontrate_pilot_users_v1');
      } catch {
        // ignore storage errors
      }
    }

    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        }).catch(() => null);
        if (res && res.ok) {
          const body = await res.json().catch(() => null);
          if (!cancelled && body?.ok && body.user) {
            setAuthUser(body.user);
            if (isValidJwtToken(body.token)) {
              setAuthToken(body.token);
            }
            return;
          }
        }

        // Check Neon Auth client session (e.g., after Google OAuth redirect)
        try {
          const neonSession = await authClient.getSession();
          const jwtToken = (neonSession as any)?.data?.session?.token;
          if (isValidJwtToken(jwtToken)) {
            const meRes = await fetch('/api/auth/me', {
              credentials: 'include',
              headers: { Authorization: `Bearer ${jwtToken}` },
            }).catch(() => null);
            if (meRes && meRes.ok) {
              const meBody = await meRes.json().catch(() => null);
              if (!cancelled && meBody?.ok && meBody.user) {
                setAuthUser(meBody.user);
                setAuthToken(
                  isValidJwtToken(meBody.token) ? meBody.token : jwtToken
                );
                return;
              }
            }
          }
        } catch {
          // ignore Neon Auth client errors when offline
        }
      } catch {
        // ignore session restore failures
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load runtime DEMO_MODE config and load demo fixtures ONLY when DEMO_MODE=true
  useEffect(() => {
    let active = true;
    fetch('/api/public/runtime-config')
      .then((r) => (r.ok ? r.json() : null))
      .then(async (cfg) => {
        if (!active) return;
        const isDemo = Boolean(cfg?.demoMode);
        setDemoMode(isDemo);
        if (isDemo) {
          setProviders(INITIAL_PROVIDERS);
          setSelectedProviderId(INITIAL_PROVIDERS[0]?.id || '');
          setServiceRequests(INITIAL_SERVICE_REQUESTS);
          setOpportunities(INITIAL_PROVIDER_OPPORTUNITIES);
          return;
        }
        const provRes = await fetch('/api/public/providers')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (!active || !provRes?.ok || !Array.isArray(provRes.providers)) return;
        const realProviders: ProviderProfile[] = provRes.providers.map((p: any) => ({
          id: p.id,
          name: p.name,
          initials: String(p.name || 'PR')
            .split(' ')
            .slice(0, 2)
            .map((w: string) => w[0]?.toUpperCase() || '')
            .join(''),
          category: p.category,
          specialties: [],
          neighborhoods: Array.isArray(p.neighborhoods) ? p.neighborhoods : [],
          city: p.city || '',
          yearsExperience: Number(p.years_experience ?? 0),
          bio: p.bio || '',
          isVerified: Boolean(p.is_verified),
          isTopRegion: Boolean(p.is_top_region),
          isMentor: Boolean(p.is_mentor),
          menteesCount: 0,
          plan:
            p.plan_slug === 'premium'
              ? 'Premium'
              : p.plan_slug === 'profissional'
                ? 'Profissional'
                : p.plan_slug === 'essencial'
                  ? 'Essencial'
                  : 'Gratuito',
          ratingAvg: Number(p.rating_avg ?? 0),
          publicScore: p.public_score ?? null,
          hasSufficientReputation: Boolean(p.has_sufficient_reputation),
          reputationLabel: p.reputation_label,
          reviewsCount: Number(p.reviews_count || 0),
          completedJobs: Number(p.completed_jobs || 0),
          responseTimeMinutes: Number(p.response_time_minutes ?? 0),
          responseRatePercent: Number(p.response_rate_percent ?? 0),
          attendanceRatePercent: 0,
          profileCompletenessPercent: Number(
            p.profile_completeness_percent ?? 0
          ),
          availableToday: Boolean(p.available_today),
          whatsapp: '',
          trustedSubstitutesIds: [],
          portfolio: [],
          reviews: [],
        }));
        setProviders(realProviders);
        if (realProviders[0]?.id) {
          setSelectedProviderId(realProviders[0].id);
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  // Load authenticated user's real service requests, opportunities, and own provider profile
  useEffect(() => {
    if (!authChecked || !authUser || demoMode) return;
    let active = true;
    const headers = buildAuthHeaders(false);

    if (
      authUser.roles.includes('cliente') ||
      authUser.activeRole === 'cliente' ||
      authUser.activeRole === 'admin'
    ) {
      fetch('/api/app/cliente/requests', { credentials: 'include', headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (!active || !body?.ok || !Array.isArray(body.requests)) return;
          setServiceRequests(
            body.requests.map((r: any) => ({
              id: r.id,
              category: r.category_name as CategoryName,
              problemTitle: r.problem_title,
              description: r.description,
              neighborhood: r.neighborhood,
              city: r.city || 'São Paulo, SP',
              urgency: r.urgency || 'Hoje',
              preferredTime: r.preferred_time || 'Comercial',
              estimatedBudget: r.estimated_budget || '',
              lgpdContactConsent: Boolean(r.lgpd_contact_consent),
              createdAt: r.created_at
                ? new Date(r.created_at).toLocaleDateString('pt-BR')
                : 'Recente',
              status: r.status || 'oportunidades_enviadas',
              photosCount: 0,
            }))
          );
        })
        .catch(() => null);
    }

    if (authUser.providerProfileId) {
      fetch('/api/app/prestador/profile', { credentials: 'include', headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (!active || !body?.ok || !body.profile) return;
          const p = body.profile;
          const tier: PlanTier =
            p.planSlug === 'premium'
              ? 'Premium'
              : p.planSlug === 'profissional'
                ? 'Profissional'
                : p.planSlug === 'essencial'
                  ? 'Essencial'
                  : 'Gratuito';
          setOwnProviderProfile({
            id: p.id,
            name: p.name,
            initials: String(p.name || 'PR')
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w: string) => w[0]?.toUpperCase() || '')
              .join(''),
            category: (p.category || 'Eletricista') as CategoryName,
            specialties: [],
            neighborhoods: Array.isArray(p.neighborhoods) ? p.neighborhoods : [],
            city: p.city || '',
            yearsExperience: Number(p.yearsExperience || 0),
            bio: p.bio || '',
            isVerified: Boolean(p.isVerified),
            isTopRegion: Boolean(p.isTopRegion),
            isMentor: Boolean(p.isMentor),
            menteesCount: 0,
            plan: tier,
            ratingAvg: Number(p.ratingAvg ?? 0),
            hasSufficientReputation: Boolean(p.hasSufficientReputation),
            reviewsCount: Number(p.reviewsCount || 0),
            completedJobs: Number(p.completedJobs || 0),
            responseTimeMinutes: Number(p.responseTimeMinutes || 0),
            responseRatePercent: Number(p.responseRatePercent || 0),
            attendanceRatePercent: 100,
            profileCompletenessPercent: Number(
              p.profileCompletenessPercent || 0
            ),
            availableToday: Boolean(p.availableToday),
            whatsapp: p.whatsapp || '',
            trustedSubstitutesIds: [],
            portfolio: [],
            reviews: [],
          });
        })
        .catch(() => null);

      fetch('/api/app/prestador/opportunities', {
        credentials: 'include',
        headers,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (!active || !body?.ok || !Array.isArray(body.opportunities)) return;
          setOpportunities(
            body.opportunities.map((o: any) => ({
              id: o.id,
              serviceRequestId: o.serviceRequestId,
              customerUserId: o.customerUserId,
              category: (o.category || 'Eletricista') as CategoryName,
              title: o.title,
              description: o.description,
              neighborhood: o.neighborhood,
              distanceKm: Number(o.distanceKm || 0),
              urgency: o.urgency || 'Hoje',
              preferredTime: o.preferredTime || 'Comercial',
              clientNameMasked: o.clientNameMasked || 'Cliente Verificado',
              clientNameFull:
                o.clientNameFull || o.clientNameMasked || 'Cliente',
              clientWhatsapp: o.clientWhatsapp || '',
              origin: o.origin || 'Matching Local',
              photosAttached: 0,
              expiresInMinutes: 30,
              status: o.status || 'pendente',
            }))
          );
        })
        .catch(() => null);
    }

    return () => {
      active = false;
    };
  }, [authChecked, authUser, demoMode, buildAuthHeaders]);

  // Track mobile viewport / PWA standalone mode & install prompt
  useEffect(() => {
    const syncViewport = () => {
      setViewportWidth(window.innerWidth);
      setIsStandalonePwa(detectStandaloneDisplayMode());
    };
    const onBeforeInstallPrompt = (event: Event) => {
      if (window.innerWidth < 768) {
        event.preventDefault();
        setInstallPromptEvent(event as Event & { prompt: () => Promise<void> });
      }
    };
    window.addEventListener('resize', syncViewport);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, []);

  const showMobileLoginHome = shouldRenderMobileLoginOnly({
    pathname,
    width: viewportWidth,
    isStandalone: isStandalonePwa,
    isAuthenticated: Boolean(authUser),
  });

  // Redirect already authenticated mobile/PWA users away from "/" to their workspace
  useEffect(() => {
    if (
      authUser &&
      (isStandalonePwa || viewportWidth < 768) &&
      pathname === '/'
    ) {
      navigateUrl(authUser.redirectTo || '/app');
    }
  }, [authUser, isStandalonePwa, viewportWidth, pathname, navigateUrl]);

  // Client-side route protection guard
  useEffect(() => {
    if (!authChecked) return;
    const check = canUserAccessRoute(pathname, authUser);
    if (!check.allowed && check.redirectTo && check.redirectTo !== pathname) {
      navigateUrl(check.redirectTo);
    }
  }, [authChecked, pathname, authUser, navigateUrl]);

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
    if (demoMode) {
      setServiceRequests((prev) => [newReq, ...prev]);
      setActiveCategory(newReq.category);
      setLocationQuery(newReq.neighborhood);
      setSearchQuery('');
      navigateUrl('/encontrar-profissional');
      return;
    }

    if (!authUser) {
      throw new Error('Faça login na sua conta antes de registrar uma solicitação.');
    }

    const res = await fetch('/api/app/cliente/requests', {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders(true),
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
        customerPhone: authUser.phone || clientProfile.phone,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok || !body.request) {
      throw new Error(
        body?.error || 'Não foi possível registrar sua solicitação no servidor.'
      );
    }

    const persistedRequest: ServiceRequest = {
      ...newReq,
      id: body.request.id,
      status: body.request.status || 'oportunidades_enviadas',
      createdAt: 'Agora mesmo',
    };
    setServiceRequests((prev) => [persistedRequest, ...prev]);
    setActiveCategory(newReq.category);
    setLocationQuery(newReq.neighborhood);
    setSearchQuery('');
    navigateUrl('/encontrar-profissional');
  };

  const handleCompleteServiceRequest = async (requestId: string) => {
    if (demoMode) {
      setServiceRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'concluido' } : r))
      );
      return;
    }
    const res = await fetch(
      `/api/app/cliente/requests/${encodeURIComponent(requestId)}/complete`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: buildAuthHeaders(false),
      }
    );
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) {
      throw new Error(
        body?.error || 'Não foi possível concluir a solicitação no servidor.'
      );
    }
    setServiceRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'concluido' } : r))
    );
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null);
    await authClient.signOut().catch(() => null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('recontrate_pilot_session');
      window.localStorage.removeItem('recontrate_pilot_users_v1');
    }
    setAuthUser(null);
    setAuthToken('');
    setOwnProviderProfile(null);
    setServiceRequests([]);
    setOpportunities([]);
    setRepeatRequests([]);
    navigateUrl('/entrar');
  };

  const handleSwitchRole = async (targetRole: UserRole) => {
    if (!authToken && !authUser) return;
    const res = await fetch('/api/auth/switch-role', {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ targetRole, enableIfMissing: true }),
    }).catch(() => null);
    const text = res ? await res.text() : '';
    const body = text ? JSON.parse(text) : null;
    if (res && res.ok && body?.ok) {
      setAuthUser(body.user);
      setAuthToken(body.token);
      navigateUrl(body.redirectTo);
      return;
    }
    if (typeof window !== 'undefined') {
      window.alert(
        body?.error || 'Não foi possível alternar o papel da conta no servidor.'
      );
    }
  };

  const slugFromProfileRoute = pathname.startsWith('/profissionais/')
    ? pathname.replace('/profissionais/', '')
    : null;
  const authenticatedProviderProfile: ProviderProfile | undefined =
    authUser && authUser.providerProfileId
      ? {
          id: authUser.providerProfileId,
          name: authUser.fullName,
          initials:
            authUser.fullName
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() || '')
              .join('') || 'PR',
          category: (authUser.category || 'Eletricista') as CategoryName,
          specialties: [],
          neighborhoods: [authUser.neighborhood || locationQuery || 'Pinheiros'],
          city: authUser.city || 'São Paulo, SP',
          yearsExperience: 0,
          bio: authUser.bio || 'Perfil profissional ativo no Recontrate.',
          isVerified: false,
          isTopRegion: false,
          isMentor: false,
          menteesCount: 0,
          plan: authProviderPlanOverride || 'Gratuito',
          ratingAvg: 0,
          hasSufficientReputation: false,
          reviewsCount: 0,
          completedJobs: 0,
          responseTimeMinutes: 0,
          responseRatePercent: 0,
          attendanceRatePercent: 0,
          profileCompletenessPercent: 75,
          availableToday: true,
          whatsapp: authUser.phone || '',
          trustedSubstitutesIds: [],
          portfolio: [],
          reviews: [],
        }
      : undefined;
  const activeProvider =
    providers.find(
      (p) => p.id === (slugFromProfileRoute || selectedProviderId)
    ) ||
    (demoMode ? providers[0] : undefined);
  const dashboardProvider = demoMode
    ? providers[0]
    : authUser?.providerProfileId
      ? ownProviderProfile ||
        providers.find((p) => p.id === authUser.providerProfileId) ||
        authenticatedProviderProfile
      : undefined;

  const isDemoRoute = pathname === '/demo';
  const showDemoBanner = demoMode || isDemoRoute;

  return (
    <div className="min-h-screen flex flex-col bg-brand-background text-brand-ink overflow-x-hidden">
      {showDemoBanner && (
        <div
          role="status"
          className="bg-amber-500 text-brand-ink text-xs font-display font-bold px-4 py-1.5 text-center tracking-wide border-b border-amber-600/30"
        >
          Ambiente de demonstração · Dados fictícios · Sem cobrança, e-mail ou WhatsApp reais
        </div>
      )}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-primary focus:text-white focus:font-semibold focus:shadow-lg"
      >
        Pular para o conteúdo principal
      </a>
      {/* HEADER PÚBLICO / AUTENTICADO */}
      {showMobileLoginHome ? (
        <header className="bg-white/95 backdrop-blur border-b border-brand-primary/10">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <BrandLogo variant="dark" size="sm" />
            </div>
            {installPromptEvent ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await installPromptEvent.prompt();
                    setInstallPromptEvent(null);
                  } catch {
                    // ignore cancelled prompt
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-brand-accent-strong text-white font-display font-semibold text-xs cursor-pointer"
              >
                Instalar App
              </button>
            ) : (
              <span className="text-[11px] font-mono uppercase tracking-wider text-brand-ink/70">
                App Mobile
              </span>
            )}
          </div>
        </header>
      ) : (
        <header className="bg-white border-b border-brand-primary/10">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 lg:px-8 py-4">
            <button
              type="button"
              onClick={() => navigateUrl('/')}
              className="text-left focus-visible:outline-2 focus-visible:outline-brand-accent-strong focus-visible:outline-offset-2 rounded-xl cursor-pointer shrink-0"
              aria-label="Início do Recontrate"
            >
              <BrandLogo variant="dark" size="sm" decorative />
            </button>

            <nav
              aria-label="Navegação Principal"
              className="hidden md:flex flex-nowrap items-center gap-2 lg:gap-6 text-xs lg:text-sm font-medium text-brand-ink/80 shrink-0 whitespace-nowrap md:order-3 md:basis-full md:justify-center lg:order-none lg:basis-auto"
            >
              <button
                type="button"
                onClick={() => navigateUrl('/encontrar-profissional')}
                className={`hover:text-brand-ink cursor-pointer ${
                  pathname === '/encontrar-profissional'
                    ? 'text-brand-ink font-semibold underline underline-offset-8 decoration-2 decoration-brand-accent-strong'
                    : ''
                }`}
              >
                Para clientes
              </button>
              <button
                type="button"
                onClick={() => navigateUrl('/para-prestadores')}
                className={`hover:text-brand-ink cursor-pointer ${
                  pathname === '/para-prestadores'
                    ? 'text-brand-ink font-semibold underline underline-offset-8 decoration-2 decoration-brand-accent-strong'
                    : ''
                }`}
              >
                Para profissionais
              </button>
              <button
                type="button"
                onClick={() => navigateUrl('/como-funciona')}
                className={`hover:text-brand-ink cursor-pointer ${
                  pathname === '/como-funciona'
                    ? 'text-brand-ink font-semibold underline underline-offset-8 decoration-2 decoration-brand-accent-strong'
                    : ''
                }`}
              >
                Como funciona
              </button>
              <button
                type="button"
                onClick={() => navigateUrl('/planos')}
                className={`hover:text-brand-ink cursor-pointer ${
                  pathname === '/planos'
                    ? 'text-brand-ink font-semibold underline underline-offset-8 decoration-2 decoration-brand-accent-strong'
                    : ''
                }`}
              >
                Planos
              </button>
              <button
                type="button"
                onClick={() => navigateUrl('/demo')}
                className={`hover:text-brand-ink cursor-pointer ${
                  pathname === '/demo'
                    ? 'text-brand-ink font-semibold underline underline-offset-8 decoration-2 decoration-brand-accent-strong'
                    : ''
                }`}
              >
                Demonstração
              </button>
            </nav>

            {/* Ações de Autenticação / Sessão */}
            <div className="flex items-center gap-2.5 shrink-0">
              {!authUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigateUrl('/entrar')}
                    className="min-h-[40px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-display font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateUrl('/criar-conta')}
                    className="min-h-[40px] px-3 sm:px-4 py-2 rounded-xl bg-brand-accent-strong hover:bg-brand-accent-hover text-white font-display font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
                  >
                    Criar conta grátis
                  </button>
                </>
              ) : (

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => navigateUrl(authUser.redirectTo)}
                    className="px-3 py-2 rounded-xl bg-brand-primary text-white font-semibold cursor-pointer"
                  >
                    Painel ({authUser.activeRole})
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateUrl('/app/indicacoes')}
                    className={`px-3 py-2 rounded-xl font-semibold cursor-pointer ${
                      pathname === '/app/indicacoes'
                        ? 'bg-brand-accent-strong text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    Indicar (+15 dias)
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateUrl('/app/privacidade')}
                    className={`px-3 py-2 rounded-xl font-semibold cursor-pointer ${
                      pathname === '/app/privacidade'
                        ? 'bg-brand-primary text-white'
                        : 'bg-brand-background text-brand-ink hover:bg-brand-surface-hover'
                    }`}
                  >
                    Privacidade LGPD
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
                    className="px-3 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold cursor-pointer"
                  >
                    Alternar para{' '}
                    {authUser.activeRole === 'cliente' ? 'Prestador' : 'Cliente'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-xl border border-brand-primary/15 text-brand-ink hover:bg-red-50 cursor-pointer"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* MAIN ROUTER VIEWPORT */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8"
      >
        <Suspense
          fallback={
            <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 border border-brand-primary/10 text-center text-xs text-brand-ink/75 my-8">
              Carregando módulo...
            </div>
          }
        >
        {/* ÁREA PÚBLICA */}
        {pathname === '/' &&
          (showMobileLoginHome ? (
            <LoginPage
              onAuthenticated={(user, token, redirectTo) => {
                setAuthUser(user);
                setAuthToken(token);
                navigateUrl(redirectTo);
              }}
              onNavigateUrl={navigateUrl}
            />
          ) : (
            <PublicLandingPage
              providers={providers}
              onStartSearch={handleStartSearchFromHome}
              onSelectCategory={handleSelectCategoryFromHome}
              onNavigateUrl={navigateUrl}
            />
          ))}

        {pathname === '/demo' && (
          <DemoShowcasePage onNavigateUrl={navigateUrl} />
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
            isLoggedIn={Boolean(authUser)}
            isLoggedProvider={Boolean(
              authUser &&
                (authUser.activeRole === 'prestador' ||
                  authUser.roles.includes('prestador'))
            )}
            authToken={authToken}
            providerContext={
              authUser?.providerProfileId
                ? {
                    providerProfileId: authUser.providerProfileId,
                    fullName: authUser.fullName,
                    email: authUser.email,
                    phone: dashboardProvider?.whatsapp || '',
                    currentPlanSlug: planTierToSlug(dashboardProvider?.plan),
                  }
                : null
            }
            onPlanUpdated={(newPlan) => {
              setAuthProviderPlanOverride(newPlan);
              setOwnProviderProfile((prev) =>
                prev ? { ...prev, plan: newPlan } : prev
              );
              if (authUser?.providerProfileId) {
                setProviders((prev) =>
                  prev.map((p) =>
                    p.id === authUser.providerProfileId
                      ? { ...p, plan: newPlan }
                      : p
                  )
                );
              }
            }}
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

        {pathname.startsWith('/profissionais/') &&
          (activeProvider ? (
            <ProviderProfileScreen
              provider={activeProvider}
              allProviders={providers}
              onSelectProvider={(id) => navigateUrl(`/profissionais/${id}`)}
              onNavigate={handleLegacyScreenNavigate}
              onOpenReportModal={(target) =>
                setReportModalTarget({ open: true, ...target })
              }
            />
          ) : (
            <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-brand-primary/10 text-center space-y-3 my-8">
              <h2 className="font-display font-bold text-xl text-brand-ink">
                Perfil não disponível publicamente
              </h2>
              <p className="text-xs text-brand-ink/70">
                Não há um perfil verificado disponível para este endereço. A lista de interesse não está disponível e esta tela não coleta seus dados.
              </p>
            </div>
          ))}

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

        {pathname === '/verificar-email' && (
          <VerifyEmailPage
            onAuthenticated={(user, token, redirectTo) => {
              setAuthUser(user);
              setAuthToken(token);
              navigateUrl(redirectTo);
            }}
            onNavigateUrl={navigateUrl}
          />
        )}

        {pathname === '/termos' && (
          <TermsAndPrivacyPage mode="termos" onNavigateUrl={navigateUrl} />
        )}
        {pathname === '/privacidade' && (
          <TermsAndPrivacyPage
            mode="privacidade"
            onNavigateUrl={navigateUrl}
          />
        )}
        {pathname === '/descadastrar-email' && (
          <EmailUnsubscribeConfirmView onNavigateUrl={navigateUrl} />
        )}

        {/* ÁREA AUTENTICADA PROTEGIDA */}
        {authUser && pathname === '/app/privacidade' && (
          <PrivacyCenterPage
            authToken={authToken}
            userEmail={authUser.email}
            onOpenCookieBanner={() => setCookieBannerSignal((s) => s + 1)}
            onAccountDeleted={() => {
              setAuthUser(null);
              setAuthToken('');
              setOwnProviderProfile(null);
              setServiceRequests([]);
              setOpportunities([]);
              navigateUrl('/');
            }}
            onNavigateUrl={navigateUrl}
          />
        )}
        {authUser && pathname === '/app/onboarding' && (
          <OnboardingPage
            user={authUser}
            token={authToken}
            onComplete={(redirectTo) => {
              setAuthUser((prev) =>
                prev
                  ? { ...prev, onboardingCompleted: true, redirectTo }
                  : prev
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
              <div className="bg-white rounded-2xl p-4 border border-brand-primary/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-brand-ink">
                  Área Autenticada do Cliente — Olá, {authUser.fullName}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigateUrl('/app/cliente/nova-solicitacao')}
                    className="px-3 py-1.5 rounded-lg bg-brand-primary text-white font-semibold cursor-pointer"
                  >
                    Nova Solicitação
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateUrl('/app/cliente/recontratar')}
                    className="px-3 py-1.5 rounded-lg bg-brand-background text-brand-ink font-semibold cursor-pointer"
                  >
                    Recontratar
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateUrl('/app/cliente/avaliar')}
                    className="px-3 py-1.5 rounded-lg bg-brand-background text-brand-ink font-semibold cursor-pointer"
                  >
                    Avaliar Atendimento
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateUrl('/app/indicacoes')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold cursor-pointer"
                  >
                    Indicar Profissional (+15 dias)
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
            onCreateRepeatRequest={async (newRepeat) => {
              if (demoMode) {
                setRepeatRequests((prev) => [newRepeat, ...prev]);
                return;
              }
              const res = await fetch('/api/app/cliente/repeat-requests', {
                method: 'POST',
                credentials: 'include',
                headers: buildAuthHeaders(true),
                body: JSON.stringify({
                  providerProfileId: newRepeat.providerId,
                  categoryName: newRepeat.category,
                  serviceType: newRepeat.serviceType,
                  desiredDate: newRepeat.desiredDate,
                  urgency: newRepeat.urgency,
                  notes: newRepeat.notes,
                  lgpdShareConsent: newRepeat.lgpdShareConsent,
                  customerPhone: authUser.phone || clientProfile.phone,
                }),
              });
              const body = await res.json().catch(() => null);
              if (!res.ok || !body?.ok) {
                throw new Error(
                  body?.error ||
                    'Não foi possível salvar o pedido de recontratação no servidor.'
                );
              }
              setRepeatRequests((prev) => [
                { ...newRepeat, id: body.repeatRequest?.id || newRepeat.id },
                ...prev,
              ]);
            }}
            onTriggerSubstituteFlow={() => navigateUrl('/app/cliente/substituto')}
            onNavigate={handleLegacyScreenNavigate}
          />
        )}

        {authUser && pathname === '/app/cliente/substituto' && (
          <SubstituteReferralScreen
            providers={providers}
            currentReferral={substituteReferral}
            onUpdateReferral={async (updated) => {
              if (demoMode) {
                setSubstituteReferral(updated);
                return;
              }
              const targetCustomerUserId =
                updated.customerUserId ||
                opportunities.find((o) => o.customerUserId)?.customerUserId;
              if (!targetCustomerUserId) {
                throw new Error(
                  'É necessário possuir uma oportunidade de cliente recebida para enviar indicação de substituto real.'
                );
              }
              const res = await fetch(
                '/api/app/prestador/substitute-referrals',
                {
                  method: 'POST',
                  credentials: 'include',
                  headers: buildAuthHeaders(true),
                  body: JSON.stringify({
                    customerUserId: targetCustomerUserId,
                    substituteProviderIds: updated.substituteProviderIds,
                    reasonCategory: updated.reasonCategory,
                    customNote: updated.customNote,
                    serviceContext: updated.serviceContext,
                    neighborhood: updated.neighborhood,
                    urgency: updated.urgency,
                    clientConsentShared: true,
                  }),
                }
              );
              const body = await res.json().catch(() => null);
              if (!res.ok || !body?.ok) {
                throw new Error(
                  body?.error ||
                    'Não foi possível persistir a indicação de substituto no servidor.'
                );
              }
              setSubstituteReferral({
                ...updated,
                id: body.referral?.id || updated.id,
              });
            }}
            onAcceptSubstitute={(id) => setSelectedProviderId(id)}
            onNavigate={handleLegacyScreenNavigate}
          />
        )}

        {authUser && pathname === '/app/cliente/avaliar' && (
          <PostServiceReviewScreen
            providers={providers}
            serviceRequests={serviceRequests}
            selectedProviderId={selectedProviderId}
            onCompleteServiceRequest={handleCompleteServiceRequest}
            onSubmitReview={async (providerId, reviewData) => {
              if (demoMode) {
                setProviders((prev) =>
                  prev.map((p) =>
                    p.id === providerId
                      ? applyNewReviewToProvider(p, reviewData)
                      : p
                  )
                );
                return;
              }
              const res = await fetch('/api/app/cliente/reviews', {
                method: 'POST',
                credentials: 'include',
                headers: buildAuthHeaders(true),
                body: JSON.stringify({
                  providerProfileId: providerId,
                  serviceRequestId: reviewData.serviceRequestId,
                  displayPublicName: Boolean(reviewData.displayPublicName),
                  neighborhood: reviewData.neighborhood,
                  serviceTitle: reviewData.serviceTitle,
                  qualidade: reviewData.qualidade,
                  pontualidade: reviewData.pontualidade,
                  comunicacao: reviewData.comunicacao,
                  organizacao: reviewData.organizacao,
                  wouldRecommend: reviewData.wouldRecommend,
                  comment: reviewData.comment,
                }),
              });
              const body = await res.json().catch(() => null);
              if (!res.ok || !body?.ok) {
                throw new Error(
                  body?.error ||
                    'Não foi possível publicar sua avaliação no servidor.'
                );
              }
              const updatedProv = body.updatedProvider;
              if (updatedProv) {
                const newReviews = Number(updatedProv.reviews_count || 0);
                const newJobs = Number(updatedProv.completed_jobs || 0);
                setProviders((prev) =>
                  prev.map((p) =>
                    p.id === providerId
                      ? {
                          ...p,
                          ratingAvg: Number(updatedProv.rating_avg || 0),
                          reviewsCount: newReviews,
                          completedJobs: newJobs,
                          hasSufficientReputation:
                            newReviews >= 3 && newJobs >= 3,
                        }
                      : p
                  )
                );
              }
            }}
            onNavigate={handleLegacyScreenNavigate}
          />
        )}

        {authUser &&
          pathname.startsWith('/app/prestador') &&
          (dashboardProvider ? (
            <ProviderDashboardScreen
              activeProvider={dashboardProvider}
              opportunities={opportunities}
              providerEmail={authUser.email}
              providerPhone={dashboardProvider.whatsapp}
              authToken={authToken}
              onAddRealtimeOpportunity={(newOpp) =>
                setOpportunities((prev) => [newOpp, ...prev])
              }
              onUpdateOpportunityStatus={async (oppId, status) => {
                if (demoMode) {
                  setOpportunities((prev) =>
                    prev.map((o) => (o.id === oppId ? { ...o, status } : o))
                  );
                  return;
                }
                if (status === 'aceita') {
                  const res = await fetch(
                    `/api/app/prestador/opportunities/${encodeURIComponent(oppId)}/accept`,
                    {
                      method: 'POST',
                      credentials: 'include',
                      headers: buildAuthHeaders(false),
                    }
                  );
                  const body = await res.json().catch(() => null);
                  if (!res.ok || !body?.ok) {
                    throw new Error(
                      body?.error ||
                        'Não foi possível confirmar interesse na oportunidade.'
                    );
                  }
                  setOpportunities((prev) =>
                    prev.map((o) =>
                      o.id === oppId
                        ? {
                            ...o,
                            status: 'aceita',
                            clientNameFull:
                              body.opportunity?.clientNameFull || o.clientNameFull,
                            clientWhatsapp:
                              body.opportunity?.clientWhatsapp || o.clientWhatsapp,
                          }
                        : o
                    )
                  );
                  return;
                }
                if (status === 'recusada') {
                  const res = await fetch(
                    `/api/app/prestador/opportunities/${encodeURIComponent(oppId)}/decline`,
                    {
                      method: 'POST',
                      credentials: 'include',
                      headers: buildAuthHeaders(false),
                    }
                  );
                  const body = await res.json().catch(() => null);
                  if (!res.ok || !body?.ok) {
                    throw new Error(
                      body?.error ||
                        'Não foi possível recusar a oportunidade no servidor.'
                    );
                  }
                }
                setOpportunities((prev) =>
                  prev.map((o) => (o.id === oppId ? { ...o, status } : o))
                );
              }}
              onChangeProviderPlan={(providerId: string, newPlan: PlanTier) => {
                if (providerId === authUser.providerProfileId) {
                  setAuthProviderPlanOverride(newPlan);
                  setOwnProviderProfile((prev) =>
                    prev ? { ...prev, plan: newPlan } : prev
                  );
                }
                setProviders((prev) =>
                  prev.map((p) =>
                    p.id === providerId ? { ...p, plan: newPlan } : p
                  )
                );
              }}
              onToggleProviderAvailability={async (providerId: string) => {
                const target =
                  (ownProviderProfile?.id === providerId
                    ? ownProviderProfile
                    : providers.find((p) => p.id === providerId)) ||
                  dashboardProvider;
                const nextAvailable = !target.availableToday;
                if (!demoMode) {
                  const res = await fetch('/api/app/prestador/profile', {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: buildAuthHeaders(true),
                    body: JSON.stringify({ availableToday: nextAvailable }),
                  });
                  const body = await res.json().catch(() => null);
                  if (!res.ok || !body?.ok) {
                    throw new Error(
                      body?.error ||
                        'Não foi possível atualizar a disponibilidade no servidor.'
                    );
                  }
                }
                if (providerId === authUser.providerProfileId) {
                  setOwnProviderProfile((prev) =>
                    prev ? { ...prev, availableToday: nextAvailable } : prev
                  );
                }
                setProviders((prev) =>
                  prev.map((p) =>
                    p.id === providerId
                      ? { ...p, availableToday: nextAvailable }
                      : p
                  )
                );
              }}
              onNavigate={handleLegacyScreenNavigate}
            />
          ) : (
            <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-brand-primary/10 text-center space-y-3 my-8">
              <h2 className="font-display font-bold text-xl text-brand-ink">
                Painel do Prestador pronto para atendimento
              </h2>
              <p className="text-xs text-brand-ink/70">
                Complete seu perfil e especialidades oficiais para começar a receber oportunidades reais.
              </p>
            </div>
          ))}

        {authUser && pathname.startsWith('/app/padrinho') && (
          <PadrinhoDashboardPage user={authUser} token={authToken} />
        )}

        {authUser && pathname === '/app/indicacoes' && (
          <ReferralDashboardPanel
            authToken={authToken}
            userFullName={authUser.fullName}
            onNavigateUrl={navigateUrl}
          />
        )}

        {authUser && pathname.startsWith('/admin') && (
          <AdminMonetizationScreen authToken={authToken} />
        )}
        </Suspense>
      </main>

      {/* FOOTER COM TERMOS, PRIVACIDADE, COOKIES ANPD, IDENTIDADE DO CONTROLADOR E DENÚNCIA UGC */}
      {showMobileLoginHome ? (
        <footer className="py-5 px-4 text-center text-xs text-brand-ink/75 space-y-2">
          <div className="flex justify-center">
            <BrandLogo variant="dark" size="sm" decorative />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigateUrl('/termos')}
              className="hover:text-brand-ink cursor-pointer"
            >
              Termos de Uso
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => navigateUrl('/privacidade')}
              className="hover:text-brand-ink cursor-pointer"
            >
              Privacidade LGPD
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setCookieBannerSignal((s) => s + 1)}
              className="hover:text-brand-ink cursor-pointer"
            >
              Cookies
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() =>
                setReportModalTarget({
                  open: true,
                  targetType: 'other',
                  targetId: pathname || '/',
                  label: 'Plataforma / Conteúdo Geral',
                })
              }
              className="hover:text-brand-ink cursor-pointer"
            >
              Denunciar
            </button>
          </div>
        </footer>
      ) : (
        <footer className="bg-white border-t border-brand-primary/10 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4 text-xs text-brand-ink/75">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <BrandLogo variant="dark" size="sm" />
                <span>·</span>
                <span>Encontrar, guardar e recontratar bons profissionais</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigateUrl('/encontrar-profissional')}
                  className="hover:text-brand-ink cursor-pointer"
                >
                  Para Clientes
                </button>
                <button
                  type="button"
                  onClick={() => navigateUrl('/para-prestadores')}
                  className="hover:text-brand-ink cursor-pointer"
                >
                  Para Profissionais
                </button>
                <button
                  type="button"
                  onClick={() => navigateUrl('/planos')}
                  className="hover:text-brand-ink cursor-pointer"
                >
                  Planos
                </button>
                <button
                  type="button"
                  onClick={() => navigateUrl('/termos')}
                  className="hover:text-brand-ink cursor-pointer"
                >
                  Termos de Uso
                </button>
                <button
                  type="button"
                  onClick={() => navigateUrl('/privacidade')}
                  className="hover:text-brand-ink cursor-pointer"
                >
                  Privacidade LGPD
                </button>
                {authUser && (
                  <button
                    type="button"
                    onClick={() => navigateUrl('/app/privacidade')}
                    className="hover:text-brand-ink cursor-pointer font-semibold text-brand-link"
                  >
                    Meus Dados LGPD
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCookieBannerSignal((s) => s + 1)}
                  className="hover:text-brand-ink cursor-pointer"
                >
                  Preferências de Cookies
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setReportModalTarget({
                      open: true,
                      targetType: 'other',
                      targetId: pathname || '/',
                      label: 'Conteúdo ou Direitos Autorais',
                    })
                  }
                  className="hover:text-brand-ink cursor-pointer"
                >
                  Denunciar conteúdo / Direitos autorais
                </button>
              </div>
            </div>
            <div className="pt-4 border-t border-brand-primary/10 space-y-1.5 text-[11px] text-brand-ink/75">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <p>
                  Recontrate · Plataforma de indicação e recontratação de profissionais — você não paga comissão à plataforma; todo valor do serviço é negociado diretamente com o cliente, fora da plataforma.
                </p>
                <p>
                  SAC: <span className="font-mono">{legalIdentity.supportEmail}</span> · DPO (LGPD):{' '}
                  <span className="font-mono">{legalIdentity.dpoEmail}</span>
                </p>
              </div>
              <p className="text-brand-ink/70">
                Controlador: {legalIdentity.companyName} · CNPJ:{' '}
                <span className="font-mono">{legalIdentity.cnpj}</span> · Endereço: {legalIdentity.address}
              </p>
            </div>
          </div>
        </footer>
      )}

      <CookieConsentBanner
        onNavigateUrl={navigateUrl}
        authToken={authToken}
        isAuthenticated={Boolean(authUser)}
        externalOpenSignal={cookieBannerSignal}
      />

      <ReportContentModal
        open={reportModalTarget.open}
        onClose={() =>
          setReportModalTarget((prev) => ({ ...prev, open: false }))
        }
        defaultTargetType={reportModalTarget.targetType}
        defaultTargetId={reportModalTarget.targetId}
        targetLabel={reportModalTarget.label}
        authToken={authToken}
      />
    </div>
  );
}

