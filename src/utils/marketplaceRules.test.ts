import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCompositeScore,
  rankCompatibleProviders,
  validateSubstituteSelection,
  applyNewReviewToProvider,
} from './marketplaceRules';
import { ProviderProfile } from '../types/confiare';

const mockProviderA: ProviderProfile = {
  id: 'prov-1',
  name: 'João Batista Silva',
  initials: 'JB',
  category: 'Eletricista',
  specialties: ['Quadros de distribuição', 'Chuveiros 220V', 'Padrão de entrada'],
  neighborhoods: ['Pinheiros', 'Vila Madalena', 'Perdizes'],
  city: 'São Paulo, SP',
  yearsExperience: 14,
  bio: 'Eletricista residencial e comercial certificado NR-10.',
  isVerified: true,
  isTopRegion: true,
  isMentor: true,
  menteesCount: 2,
  plan: 'Padrinho',
  ratingAvg: 4.95,
  reviewsCount: 84,
  completedJobs: 112,
  responseTimeMinutes: 8,
  responseRatePercent: 98,
  attendanceRatePercent: 99,
  profileCompletenessPercent: 100,
  availableToday: true,
  whatsapp: '(11) 99812-4401',
  previouslyHiredByCurrentUser: true,
  lastServiceDate: '12 Set 2026',
  lastServiceSummary: 'Troca de disjuntor DR e revisão de tomada 20A',
  trustedSubstitutesIds: ['prov-2'],
  portfolio: [],
  reviews: [],
};

const mockProviderB: ProviderProfile = {
  ...mockProviderA,
  id: 'prov-2',
  name: 'Carlos Eduardo Rocha',
  initials: 'CE',
  plan: 'Profissional',
  isMentor: false,
  mentorName: 'João Batista Silva',
  ratingAvg: 4.85,
  reviewsCount: 26,
  completedJobs: 31,
  responseTimeMinutes: 14,
  responseRatePercent: 95,
  previouslyHiredByCurrentUser: false,
};

test('calculateCompositeScore weights 40% reviews, 20% response time, 20% response rate, 10% jobs, 10% verification', () => {
  const breakdown = calculateCompositeScore(mockProviderA);
  assert.ok(breakdown.totalScore >= 4.8 && breakdown.totalScore <= 5.0);
  assert.equal(breakdown.reviewsComponent, Math.round(4.95 * 0.4 * 100) / 100);
  assert.equal(breakdown.responseTimeComponent, 1.0); // <=10 min -> 5.0 * 0.2 = 1.0
});

test('rankCompatibleProviders prioritizes matching neighborhood and previous hire history fairly', () => {
  const ranked = rankCompatibleProviders([mockProviderB, mockProviderA], {
    category: 'Eletricista',
    locationQuery: 'Pinheiros',
  });
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].provider.id, 'prov-1');
  assert.ok(ranked[0].priorityScore > ranked[1].priorityScore);
});

test('validateSubstituteSelection enforces max 2 substitutes and non-empty reason', () => {
  const emptyResult = validateSubstituteSelection('prov-1', [], 'Agenda cheia');
  assert.equal(emptyResult.valid, false);

  const tooManyResult = validateSubstituteSelection(
    'prov-1',
    ['prov-2', 'prov-3', 'prov-4'],
    'Agenda cheia'
  );
  assert.equal(tooManyResult.valid, false);

  const selfResult = validateSubstituteSelection('prov-1', ['prov-1'], 'Agenda cheia');
  assert.equal(selfResult.valid, false);

  const validResult = validateSubstituteSelection(
    'prov-1',
    ['prov-2', 'prov-3'],
    'Estou em atendimento emergencial em outro bairro'
  );
  assert.equal(validResult.valid, true);
});

test('applyNewReviewToProvider updates review list, increments completedJobs and updates ratingAvg', () => {
  const updated = applyNewReviewToProvider(mockProviderB, {
    clientName: 'Marina Costa',
    neighborhood: 'Pinheiros',
    serviceTitle: 'Instalação de luminárias LED',
    qualidade: 5,
    pontualidade: 5,
    comunicacao: 5,
    organizacao: 5,
    wouldRecommend: true,
    comment: 'Excelente atendimento, muito pontual e organizado.',
  });

  assert.equal(updated.reviewsCount, mockProviderB.reviewsCount + 1);
  assert.equal(updated.completedJobs, mockProviderB.completedJobs + 1);
  assert.equal(updated.reviews[0].clientName, 'Marina Costa');
  assert.equal(updated.previouslyHiredByCurrentUser, true);
});
