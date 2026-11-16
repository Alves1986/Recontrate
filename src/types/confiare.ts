export type CategoryName =
  | 'Eletricista'
  | 'Encanador'
  | 'Diarista'
  | 'Pintor'
  | 'Técnico de ar-condicionado';

export type PlanTier = 'Essencial' | 'Profissional' | 'Premium' | 'Padrinho';

export type ScreenId =
  | 'home'
  | 'cadastro-cliente'
  | 'cadastro-prestador'
  | 'criar-solicitacao'
  | 'profissionais-compativeis'
  | 'perfil-prestador'
  | 'solicitar-novamente'
  | 'indicacao-substituto'
  | 'avaliacao-pos-atendimento'
  | 'painel-prestador';

export interface PortfolioItem {
  id: string;
  title: string;
  neighborhood: string;
  date: string;
  description: string;
  beforeAfterLabel: string;
  duration: string;
  visualType: 'electrical' | 'plumbing' | 'cleaning' | 'painting' | 'hvac';
}

export interface ReviewItem {
  id: string;
  clientName: string;
  neighborhood: string;
  date: string;
  serviceTitle: string;
  rating: number;
  criteria: {
    qualidade: number;
    pontualidade: number;
    comunicacao: number;
    organizacao: number;
  };
  wouldRecommend: boolean;
  comment: string;
  providerReply?: string;
}

export interface ProviderProfile {
  id: string;
  name: string;
  initials: string;
  category: CategoryName;
  specialties: string[];
  neighborhoods: string[];
  city: string;
  yearsExperience: number;
  bio: string;
  isVerified: boolean;
  isTopRegion: boolean;
  mentorName?: string; // Selo "Indicado por [padrinho]"
  isMentor?: boolean; // Selo "Padrinho Verificado"
  menteesCount?: number;
  plan: PlanTier;
  ratingAvg: number;
  reviewsCount: number;
  completedJobs: number;
  responseTimeMinutes: number;
  responseRatePercent: number;
  attendanceRatePercent: number;
  profileCompletenessPercent: number;
  availableToday: boolean;
  whatsapp: string;
  previouslyHiredByCurrentUser?: boolean;
  lastServiceDate?: string;
  lastServiceSummary?: string;
  trustedSubstitutesIds: string[];
  portfolio: PortfolioItem[];
  reviews: ReviewItem[];
}

export interface ServiceRequest {
  id: string;
  category: CategoryName;
  problemTitle: string;
  description: string;
  neighborhood: string;
  city: string;
  urgency: 'Hoje' | 'Amanhã' | 'Esta semana' | 'Flexível';
  preferredTime: 'Manhã (08h–12h)' | 'Tarde (13h–18h)' | 'Noite (18h–21h)' | 'Comercial';
  estimatedBudget?: string;
  preferredPreviousProviderId?: string;
  lgpdContactConsent: boolean;
  createdAt: string;
  status: 'em_matching' | 'oportunidades_enviadas' | 'prestador_interessado' | 'contato_liberado' | 'concluido';
  photosCount: number;
}

export interface RepeatServiceRequest {
  id: string;
  providerId: string;
  category: CategoryName;
  serviceType: string;
  desiredDate: string;
  urgency: 'Hoje' | 'Amanhã' | 'Esta semana' | 'Flexível';
  notes: string;
  lgpdShareConsent: boolean;
  status: 'solicitado' | 'aceito' | 'indisponivel_com_substituto';
  createdAt: string;
}

export interface SubstituteReferral {
  id: string;
  originalProviderId: string;
  substituteProviderIds: string[];
  reasonCategory: 'Agenda cheia na data' | 'Em atendimento em outro bairro' | 'De folga / férias' | 'Especialidade específica';
  customNote: string;
  serviceContext: string;
  neighborhood: string;
  urgency: string;
  clientAcceptedProviderId?: string;
  createdAt: string;
}

export interface ProviderOpportunity {
  id: string;
  category: CategoryName;
  title: string;
  description: string;
  neighborhood: string;
  distanceKm: number;
  urgency: 'Hoje' | 'Amanhã' | 'Esta semana' | 'Flexível';
  preferredTime: string;
  clientNameMasked: string;
  clientNameFull: string;
  clientWhatsapp: string;
  origin: 'Matching Local' | 'Recontratação Direta' | 'Indicação de Colega';
  referredByProviderName?: string;
  photosAttached: number;
  expiresInMinutes: number;
  status: 'pendente' | 'aceita' | 'recusada' | 'substituto_indicado';
  substituteIdsReferred?: string[];
  declineReason?: string;
}

export type ProviderNotificationType = 'nova_oportunidade' | 'aceite_orcamento';

export interface ProviderRealtimeNotification {
  id: string;
  type: ProviderNotificationType;
  title: string;
  message: string;
  clientName: string;
  neighborhood: string;
  urgencyOrScope: string;
  timestamp: string;
  read: boolean;
  opportunityId?: string;
  clientWhatsapp?: string;
}

export interface ClientRegistration {
  name: string;
  phone: string;
  email: string;
  neighborhood: string;
  city: string;
  favoriteCategories: CategoryName[];
  preferredContact: 'WhatsApp' | 'Telefone' | 'Ambos';
  lgpdConsent: boolean;
}

export interface ProviderRegistration {
  name: string;
  professionalName: string;
  phone: string;
  email: string;
  category: CategoryName;
  specialties: string;
  neighborhoods: string;
  radiusKm: number;
  yearsExperience: number;
  bio: string;
  acceptsUrgent: boolean;
  documentUploaded: boolean;
  addressProofUploaded: boolean;
  mentorCode?: string;
  selectedPlan: PlanTier;
  lgpdConsent: boolean;
}
