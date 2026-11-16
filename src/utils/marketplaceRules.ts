import {
  CategoryName,
  PlanTier,
  ProviderNotificationType,
  ProviderProfile,
  ProviderRealtimeNotification,
  ReviewItem,
} from '../types/confiare';

export interface CompositeScoreBreakdown {
  totalScore: number;
  reviewsComponent: number; // 40% weight
  responseTimeComponent: number; // 20% weight
  responseRateComponent: number; // 20% weight
  completedJobsComponent: number; // 10% weight
  verificationComponent: number; // 10% weight
}

/**
 * Calcula a Nota Composta da Confiare seguindo a regra de negócio:
 * - Avaliações dos clientes: 40%
 * - Tempo médio de resposta: 20%
 * - Taxa de resposta: 20%
 * - Atendimentos concluídos: 10%
 * - Verificações e completude do perfil: 10%
 * Estrelas nunca são compradas por plano pago.
 */
export function calculateCompositeScore(provider: {
  ratingAvg: number;
  responseTimeMinutes: number;
  responseRatePercent: number;
  completedJobs: number;
  isVerified: boolean;
  profileCompletenessPercent: number;
}): CompositeScoreBreakdown {
  const clampedRating = Math.max(1, Math.min(5, provider.ratingAvg));

  let responseTimeScore = 3.4;
  if (provider.responseTimeMinutes <= 10) {
    responseTimeScore = 5.0;
  } else if (provider.responseTimeMinutes <= 20) {
    responseTimeScore = 4.8;
  } else if (provider.responseTimeMinutes <= 30) {
    responseTimeScore = 4.5;
  } else if (provider.responseTimeMinutes <= 60) {
    responseTimeScore = 4.0;
  }

  const responseRateScore = Math.max(
    1,
    Math.min(5, (provider.responseRatePercent / 100) * 5)
  );

  const completedJobsScore = Math.max(
    3.0,
    Math.min(5.0, 3.5 + (Math.min(provider.completedJobs, 100) / 100) * 1.5)
  );

  const verificationScore =
    (provider.isVerified ? 2.5 : 0.5) +
    Math.max(0, Math.min(2.5, (provider.profileCompletenessPercent / 100) * 2.5));

  const rawTotal =
    clampedRating * 0.4 +
    responseTimeScore * 0.2 +
    responseRateScore * 0.2 +
    completedJobsScore * 0.1 +
    verificationScore * 0.1;

  const totalScore = Math.round(rawTotal * 100) / 100;

  return {
    totalScore,
    reviewsComponent: Math.round(clampedRating * 0.4 * 100) / 100,
    responseTimeComponent: Math.round(responseTimeScore * 0.2 * 100) / 100,
    responseRateComponent: Math.round(responseRateScore * 0.2 * 100) / 100,
    completedJobsComponent: Math.round(completedJobsScore * 0.1 * 100) / 100,
    verificationComponent: Math.round(verificationScore * 0.1 * 100) / 100,
  };
}

export interface RankedProviderResult {
  provider: ProviderProfile;
  matchPercentage: number;
  priorityScore: number;
  compositeScore: number;
  matchReasons: string[];
}

const PLAN_PRIORITY_BONUS: Record<PlanTier, number> = {
  Essencial: 2,
  Profissional: 5,
  Premium: 8,
  Padrinho: 9,
};

/**
 * Motor de Matching Justo da Confiare:
 * Prioridade = compatibilidade + disponibilidade + reputação + bônus do plano - penalidades
 * O bônus do plano aumenta prioridade moderadamente, mas nunca substitui compatibilidade ou reputação.
 */
export function rankCompatibleProviders(
  providers: ProviderProfile[],
  filters: {
    category?: CategoryName | 'Todas';
    searchQuery?: string;
    locationQuery?: string;
    onlyAvailableToday?: boolean;
    onlyPreviouslyHired?: boolean;
  }
): RankedProviderResult[] {
  const normalizedSearch = (filters.searchQuery || '').trim().toLowerCase();
  const normalizedLocation = (filters.locationQuery || '').trim().toLowerCase();

  return providers
    .filter((p) => {
      if (filters.category && filters.category !== 'Todas' && p.category !== filters.category) {
        return false;
      }
      if (filters.onlyAvailableToday && !p.availableToday) {
        return false;
      }
      if (filters.onlyPreviouslyHired && !p.previouslyHiredByCurrentUser) {
        return false;
      }
      if (normalizedSearch) {
        const matchesCategory = p.category.toLowerCase().includes(normalizedSearch);
        const matchesName = p.name.toLowerCase().includes(normalizedSearch);
        const matchesSpecialty = p.specialties.some((s) =>
          s.toLowerCase().includes(normalizedSearch)
        );
        const matchesBio = p.bio.toLowerCase().includes(normalizedSearch);
        if (!matchesCategory && !matchesName && !matchesSpecialty && !matchesBio) {
          return false;
        }
      }
      return true;
    })
    .map((provider) => {
      const composite = calculateCompositeScore(provider).totalScore;
      const reasons: string[] = [];

      // 1. Compatibilidade (0-40)
      let compatibility = 32;
      if (
        normalizedLocation &&
        provider.neighborhoods.some((b) => b.toLowerCase().includes(normalizedLocation))
      ) {
        compatibility += 8;
        reasons.push(`Atende em ${provider.neighborhoods[0]}`);
      } else {
        reasons.push(`Cobertura em ${provider.neighborhoods.slice(0, 2).join(', ')}`);
      }

      if (provider.previouslyHiredByCurrentUser) {
        compatibility += 6;
        reasons.push('Já atendeu você com sucesso');
      }

      // 2. Disponibilidade (0-20)
      const availability = provider.availableToday ? 20 : 12;
      if (provider.availableToday) {
        reasons.push(`Responde em ~${provider.responseTimeMinutes} min`);
      }

      // 3. Reputação (0-35) — peso dominante sobre o bônus do plano
      const reputationPoints = (composite / 5) * 35;

      // 4. Bônus moderado do plano (2-9)
      const planBonus = PLAN_PRIORITY_BONUS[provider.plan] || 2;

      // 5. Penalidades por baixa taxa de comparecimento ou resposta
      const penalty =
        provider.attendanceRatePercent < 95
          ? (95 - provider.attendanceRatePercent) * 1.5
          : 0;

      const priorityScore =
        Math.round(
          (compatibility + availability + reputationPoints + planBonus - penalty) * 10
        ) / 10;

      const matchPercentage = Math.min(
        99,
        Math.max(78, Math.round(priorityScore))
      );

      return {
        provider,
        matchPercentage,
        priorityScore,
        compositeScore: composite,
        matchReasons: reasons,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Valida seleção de até 2 substitutos confiáveis quando o profissional não pode atender.
 */
export function validateSubstituteSelection(
  originalProviderId: string,
  selectedSubstituteIds: string[],
  reason: string
): { valid: boolean; error?: string } {
  if (selectedSubstituteIds.length === 0) {
    return {
      valid: false,
      error: 'Selecione pelo menos 1 profissional substituto (máximo de 2).',
    };
  }
  if (selectedSubstituteIds.length > 2) {
    return {
      valid: false,
      error: 'Você pode indicar no máximo 2 profissionais substitutos por solicitação.',
    };
  }
  if (selectedSubstituteIds.includes(originalProviderId)) {
    return {
      valid: false,
      error: 'O profissional substituto deve ser diferente do profissional original.',
    };
  }
  if (!reason || reason.trim().length < 4) {
    return {
      valid: false,
      error: 'Informe um breve motivo para orientar o cliente na indicação.',
    };
  }
  return { valid: true };
}

/**
 * Registra uma nova avaliação pós-atendimento e recalcula a reputação do prestador.
 */
export function applyNewReviewToProvider(
  provider: ProviderProfile,
  newReviewInput: {
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
): ProviderProfile {
  const avgCriteria =
    (newReviewInput.qualidade +
      newReviewInput.pontualidade +
      newReviewInput.comunicacao +
      newReviewInput.organizacao) /
    4;
  const reviewRating = Math.round(avgCriteria * 10) / 10;

  const newReview: ReviewItem = {
    id: `rev-${Date.now()}`,
    clientName: newReviewInput.clientName.trim() || 'Cliente Verificado',
    neighborhood: newReviewInput.neighborhood.trim() || provider.neighborhoods[0],
    date: 'Hoje',
    serviceTitle: newReviewInput.serviceTitle.trim() || `Serviço de ${provider.category}`,
    rating: reviewRating,
    criteria: {
      qualidade: newReviewInput.qualidade,
      pontualidade: newReviewInput.pontualidade,
      comunicacao: newReviewInput.comunicacao,
      organizacao: newReviewInput.organizacao,
    },
    wouldRecommend: newReviewInput.wouldRecommend,
    comment: newReviewInput.comment.trim(),
  };

  const totalReviews = provider.reviewsCount + 1;
  const updatedRatingAvg =
    Math.round(
      ((provider.ratingAvg * provider.reviewsCount + reviewRating) / totalReviews) * 100
    ) / 100;

  return {
    ...provider,
    ratingAvg: updatedRatingAvg,
    reviewsCount: totalReviews,
    completedJobs: provider.completedJobs + 1,
    previouslyHiredByCurrentUser: true,
    lastServiceDate: 'Hoje',
    lastServiceSummary: newReview.serviceTitle,
    reviews: [newReview, ...provider.reviews],
  };
}

/**
 * Filtra notificações em tempo real do Painel do Prestador por tipo (Todas, Novas Oportunidades, Aceites de Orçamento).
 */
export function filterProviderNotifications(
  notifications: ProviderRealtimeNotification[],
  filterType: 'todas' | ProviderNotificationType
): ProviderRealtimeNotification[] {
  if (filterType === 'todas') {
    return notifications;
  }
  return notifications.filter((item) => item.type === filterType);
}

/**
 * Marca uma notificação específica ou todas as notificações como lidas.
 */
export function markProviderNotificationsRead(
  notifications: ProviderRealtimeNotification[],
  notificationId?: string
): ProviderRealtimeNotification[] {
  return notifications.map((item) => {
    if (!notificationId || item.id === notificationId) {
      return { ...item, read: true };
    }
    return item;
  });
}

/**
 * Cria uma nova notificação de status em tempo real para o prestador.
 */
export function createRealtimeNotification(input: {
  id?: string;
  type: ProviderNotificationType;
  title: string;
  message: string;
  clientName: string;
  neighborhood: string;
  urgencyOrScope: string;
  timestamp?: string;
  opportunityId?: string;
  clientWhatsapp?: string;
}): ProviderRealtimeNotification {
  return {
    id: input.id || `notif-${Date.now()}`,
    type: input.type,
    title: input.title,
    message: input.message,
    clientName: input.clientName,
    neighborhood: input.neighborhood,
    urgencyOrScope: input.urgencyOrScope,
    timestamp: input.timestamp || 'Agora mesmo',
    read: false,
    opportunityId: input.opportunityId,
    clientWhatsapp: input.clientWhatsapp,
  };
}

