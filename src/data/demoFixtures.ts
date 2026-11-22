import type {
  ProviderOpportunity,
  ProviderProfile,
  ServiceRequest,
  SubstituteReferral,
} from '../types/confiare';

export const DEMO_SANDBOX_BADGE_TEXT = 'Ambiente de demonstração';

export type DemoBlockedChannel =
  | 'cadastro_real'
  | 'cobranca_gateway'
  | 'whatsapp_real'
  | 'email_real'
  | 'webhook_real';

export interface DemoSandboxBlockResult {
  blocked: true;
  channel: DemoBlockedChannel;
  message: string;
  timestamp: string;
}

export function simulateDemoBlockedAction(
  channel: DemoBlockedChannel
): DemoSandboxBlockResult {
  const messages: Record<DemoBlockedChannel, string> = {
    cadastro_real:
      'Bloqueado no Ambiente de demonstração: criação de contas reais ocorre apenas na área pública (/criar-conta).',
    cobranca_gateway:
      'Bloqueado no Ambiente de demonstração: nenhuma cobrança real ou chamada ao gateway Asaas é executada.',
    whatsapp_real:
      'Bloqueado no Ambiente de demonstração: notificações reais via WhatsApp Business Cloud API estão desativadas.',
    email_real:
      'Bloqueado no Ambiente de demonstração: disparos reais de e-mail transacional estão desativados.',
    webhook_real:
      'Bloqueado no Ambiente de demonstração: recebimento/processamento de webhooks reais está desativado.',
  };

  return {
    blocked: true,
    channel,
    message: messages[channel],
    timestamp: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}

export const DEMO_CLIENT_PERSONA = {
  name: 'Mariana Silva (Demo)',
  maskedName: 'Mariana S. (Demo)',
  email: 'cliente.demo@demo.confiare.invalid',
  phone: '(11) 90000-0101',
  neighborhood: 'Pinheiros',
  city: 'São Paulo, SP',
};

export const DEMO_SANDBOX_PROVIDERS: ProviderProfile[] = [
  {
    id: 'demo-prov-joao',
    name: 'João Batista (Demo)',
    initials: 'JB',
    category: 'Eletricista',
    specialties: [
      'Quadro de distribuição',
      'Instalação de chuveiro',
      'Instalação elétrica residencial',
      'Aterramento',
    ],
    neighborhoods: ['Pinheiros', 'Vila Madalena', 'Jardins'],
    city: 'São Paulo, SP',
    yearsExperience: 14,
    bio: '[DADO FICTÍCIO DEMO] Especialista simulado em quadros DIN, disjuntores DR e instalações residenciais NBR 5410.',
    isVerified: true,
    isTopRegion: true,
    isMentor: true,
    menteesCount: 2,
    plan: 'Premium',
    ratingAvg: 4.96,
    reviewsCount: 94,
    completedJobs: 128,
    responseTimeMinutes: 9,
    responseRatePercent: 98,
    attendanceRatePercent: 100,
    profileCompletenessPercent: 100,
    availableToday: true,
    whatsapp: '(11) 90000-0102',
    previouslyHiredByCurrentUser: true,
    lastServiceDate: 'Out 2026 (Demo)',
    lastServiceSummary: '[DEMO] Substituição de disjuntor DR e tomada 20A',
    trustedSubstitutesIds: ['demo-prov-carlos'],
    portfolio: [
      {
        id: 'demo-port-1',
        title: '[DEMO] Modernização de Quadro DIN com DR e DPS',
        neighborhood: 'Pinheiros',
        date: 'Outubro 2026',
        description: 'Registro ilustrativo de portfólio sem dados ou imagens reais.',
        beforeAfterLabel: 'Antes e depois (Demo)',
        duration: '3h',
        visualType: 'electrical',
      },
    ],
    reviews: [
      {
        id: 'demo-rev-1',
        clientName: 'Mariana S. (Demo)',
        neighborhood: 'Pinheiros',
        date: 'Out 2026',
        serviceTitle: '[DEMO] Adequação de disjuntor DR',
        rating: 5,
        criteria: {
          qualidade: 5,
          pontualidade: 5,
          comunicacao: 5,
          organizacao: 5,
        },
        wouldRecommend: true,
        comment:
          '[DEMO] Avaliação fictícia para demonstrar cálculo de reputação composta.',
      },
    ],
  },
  {
    id: 'demo-prov-carlos',
    name: 'Carlos Mendes (Demo)',
    initials: 'CM',
    category: 'Eletricista',
    specialties: [
      'Instalação elétrica residencial',
      'Instalação de tomadas e interruptores',
      'Iluminação',
    ],
    neighborhoods: ['Pinheiros', 'Perdizes', 'Butantã'],
    city: 'São Paulo, SP',
    yearsExperience: 6,
    bio: '[DADO FICTÍCIO DEMO] Profissional fictício apadrinhado na rede para ilustrar indicação rastreável de substituto.',
    isVerified: true,
    isTopRegion: false,
    isMentor: false,
    mentorName: 'João Batista (Demo)',
    plan: 'Profissional',
    ratingAvg: 4.89,
    reviewsCount: 52,
    completedJobs: 76,
    responseTimeMinutes: 12,
    responseRatePercent: 96,
    attendanceRatePercent: 99,
    profileCompletenessPercent: 95,
    availableToday: true,
    whatsapp: '(11) 90000-0103',
    trustedSubstitutesIds: ['demo-prov-joao'],
    portfolio: [],
    reviews: [],
  },
  {
    id: 'demo-prov-ana',
    name: 'Ana Ribeiro (Demo)',
    initials: 'AR',
    category: 'Diarista',
    specialties: [
      'Limpeza residencial',
      'Limpeza pós-obra',
      'Organização residencial',
    ],
    neighborhoods: ['Pinheiros', 'Itaim Bibi', 'Moema'],
    city: 'São Paulo, SP',
    yearsExperience: 9,
    bio: '[DADO FICTÍCIO DEMO] Perfil fictício de demonstração para fluxo de limpeza residencial e pós-obra.',
    isVerified: true,
    isTopRegion: true,
    isMentor: false,
    plan: 'Premium',
    ratingAvg: 4.98,
    reviewsCount: 112,
    completedJobs: 164,
    responseTimeMinutes: 11,
    responseRatePercent: 99,
    attendanceRatePercent: 100,
    profileCompletenessPercent: 100,
    availableToday: true,
    whatsapp: '(11) 90000-0104',
    trustedSubstitutesIds: [],
    portfolio: [],
    reviews: [],
  },
];

export const DEMO_SANDBOX_REQUESTS: ServiceRequest[] = [
  {
    id: 'demo-req-1',
    category: 'Eletricista',
    problemTitle: '[DEMO] Revisão de disjuntor e tomada 20A na cozinha',
    description:
      'Solicitação fictícia para demonstrar matching sem leilão por reputação e proximidade.',
    neighborhood: 'Pinheiros',
    city: 'São Paulo, SP',
    urgency: 'Hoje',
    preferredTime: 'Tarde (13h–18h)',
    estimatedBudget: 'R$ 220 – R$ 350',
    lgpdContactConsent: true,
    photosCount: 0,
    createdAt: 'Hoje · Simulação Demo',
    status: 'oportunidades_enviadas',
  },
];

export const DEMO_SANDBOX_OPPORTUNITIES: ProviderOpportunity[] = [
  {
    id: 'demo-opp-1',
    category: 'Eletricista',
    title: '[DEMO] Revisão de disjuntor e tomada 20A na cozinha',
    description:
      'Oportunidade fictícia: contato do cliente protegido até o aceite do prestador.',
    neighborhood: 'Pinheiros',
    distanceKm: 1.2,
    urgency: 'Hoje',
    preferredTime: 'Tarde (13h–18h)',
    clientNameMasked: 'Mariana S. (Demo)',
    clientNameFull: 'Mariana Silva (Demo)',
    clientWhatsapp: '(11) 90000-0101',
    origin: 'Matching Local',
    photosAttached: 0,
    expiresInMinutes: 25,
    status: 'pendente',
  },
];

export const DEMO_SANDBOX_REFERRAL: SubstituteReferral = {
  id: 'demo-ref-1',
  originalProviderId: 'demo-prov-joao',
  substituteProviderIds: ['demo-prov-carlos'],
  reasonCategory: 'Agenda cheia na data',
  customNote:
    '[DEMO] O Carlos Mendes (Demo) atuou comigo em instalações NBR 5410 e está disponível amanhã.',
  serviceContext: '[DEMO] Instalação de tomada 20A na lavanderia',
  neighborhood: 'Pinheiros',
  urgency: 'Amanhã',
  createdAt: 'Agora · Simulação Demo',
};

export interface DemoPendingSuggestion {
  id: string;
  providerName: string;
  categoryName: string;
  suggestedName: string;
  status: 'pendente' | 'aprovada' | 'reprovada';
}

export const DEMO_INITIAL_SUGGESTIONS: DemoPendingSuggestion[] = [
  {
    id: 'demo-sug-1',
    providerName: 'João Batista (Demo)',
    categoryName: 'Elétrica',
    suggestedName: 'Carregador Veicular Residencial (Wallbox)',
    status: 'pendente',
  },
  {
    id: 'demo-sug-2',
    providerName: 'Ana Ribeiro (Demo)',
    categoryName: 'Diarista e limpeza',
    suggestedName: 'Higienização de Colchões',
    status: 'pendente',
  },
];
