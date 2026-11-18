import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(), // gratuito | essencial | profissional | premium | padrinho
  nome: text('nome').notNull(),
  descricao: text('descricao').notNull(),
  precoMensalCentavos: integer('preco_mensal_centavos').notNull(),
  precoAnualCentavos: integer('preco_anual_centavos').notNull(),
  limiteOportunidadesMensal: integer('limite_oportunidades_mensal').notNull(),
  prioridadeMatching: integer('prioridade_matching').notNull(),
  permiteDestaque: boolean('permite_destaque').notNull().default(false),
  permiteRelatoriosAvancados: boolean('permite_relatorios_avancados')
    .notNull()
    .default(false),
  permitePortfolioIlimitado: boolean('permite_portfolio_ilimitado')
    .notNull()
    .default(false),
  exibeAnuncios: boolean('exibe_anuncios').notNull().default(false),
  selo: text('selo'),
  suportePrioritario: boolean('suporte_prioritario').notNull().default(false),
  limiteFotosPortfolio: integer('limite_fotos_portfolio'),
  prioridadeLabel: text('prioridade_label').notNull().default('Baixa'),
  ativo: boolean('ativo').notNull().default(true),
  ordemExibicao: integer('ordem_exibicao').notNull().default(1),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const providerProfiles = pgTable('provider_profiles', {
  id: text('id').primaryKey(),
  userId: uuid('user_id'),
  slug: text('slug').unique(),
  name: text('name').notNull(),
  professionalName: text('professional_name'),
  category: text('category').notNull(),
  city: text('city').notNull(),
  neighborhoods: text('neighborhoods').array().notNull(),
  specialties: text('specialties').array().notNull(),
  radiusKm: integer('radius_km').notNull().default(10),
  yearsExperience: integer('years_experience').notNull().default(5),
  bio: text('bio').notNull().default(''),
  profileCompletenessPercent: integer('profile_completeness_percent')
    .notNull()
    .default(90),
  verificationStatus: text('verification_status').notNull().default('aprovado'),
  planSlug: text('plan_slug').notNull().default('gratuito'),
  ratingAvg: text('rating_avg').notNull().default('5.00'),
  reviewsCount: integer('reviews_count').notNull().default(0),
  completedJobs: integer('completed_jobs').notNull().default(0),
  responseTimeMinutes: integer('response_time_minutes').notNull().default(10),
  responseRatePercent: integer('response_rate_percent').notNull().default(100),
  attendanceRatePercent: integer('attendance_rate_percent').notNull().default(100),
  isVerified: boolean('is_verified').notNull().default(true),
  isTopRegion: boolean('is_top_region').notNull().default(false),
  isMentor: boolean('is_mentor').notNull().default(false),
  mentorName: text('mentor_name'),
  availableToday: boolean('available_today').notNull().default(true),
  whatsapp: text('whatsapp').notNull(),
  latitude: numeric('latitude', { precision: 9, scale: 6 }),
  longitude: numeric('longitude', { precision: 9, scale: 6 }),
  cpfCnpjNormalizado: text('cpf_cnpj_normalizado'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  providerProfileId: text('provider_profile_id').notNull(),
  planId: text('plan_id').notNull(),
  scheduledPlanId: text('scheduled_plan_id'),
  status: text('status').notNull(), // trial | ativa | pendente | inadimplente | cancelada | expirada
  ciclo: text('ciclo').notNull().default('mensal'), // mensal | anual
  inicio: timestamp('inicio', { withTimezone: true }).notNull().defaultNow(),
  fim: timestamp('fim', { withTimezone: true }).notNull(),
  proximaCobranca: timestamp('proxima_cobranca', { withTimezone: true }),
  toleranciaAte: timestamp('tolerancia_ate', { withTimezone: true }),
  gatewaySubscriptionId: text('gateway_subscription_id'),
  gatewayCustomerId: text('gateway_customer_id'),
  canceladaEm: timestamp('cancelada_em', { withTimezone: true }),
  motivoCancelamento: text('motivo_cancelamento'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptionEvents = pgTable('subscription_events', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscription_id').notNull(),
  evento: text('evento').notNull(),
  dadosAnterioresJson: jsonb('dados_anteriores_json'),
  dadosNovosJson: jsonb('dados_novos_json'),
  gatewayEventId: text('gateway_event_id'),
  processadoEm: timestamp('processado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscription_id').notNull(),
  valorCentavos: integer('valor_centavos').notNull(),
  status: text('status').notNull(), // pendente | paga | falhou | estornada | cancelada
  metodo: text('metodo').notNull(), // pix | cartao | boleto
  vencimento: timestamp('vencimento', { withTimezone: true }).notNull(),
  pagoEm: timestamp('pago_em', { withTimezone: true }),
  gatewayInvoiceId: text('gateway_invoice_id'),
  urlCheckout: text('url_checkout'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const opportunityUsage = pgTable('opportunity_usage', {
  id: text('id').primaryKey(),
  providerProfileId: text('provider_profile_id').notNull(),
  subscriptionId: text('subscription_id').notNull(),
  periodoInicio: timestamp('periodo_inicio', { withTimezone: true }).notNull(),
  periodoFim: timestamp('periodo_fim', { withTimezone: true }).notNull(),
  oportunidadesUtilizadas: integer('oportunidades_utilizadas')
    .notNull()
    .default(0),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const processedWebhookEvents = pgTable('processed_webhook_events', {
  id: text('id').primaryKey(),
  gateway: text('gateway').notNull().default('asaas'),
  eventId: text('event_id').notNull().unique(),
  tipoEvento: text('tipo_evento').notNull(),
  payloadHash: text('payload_hash').notNull(),
  status: text('status').notNull(), // recebido | processado | falhou | ignorado
  erro: text('erro'),
  processadoEm: timestamp('processado_em', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const adSlots = pgTable('ad_slots', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(), // banner_painel_prestador | banner_perfil_prestador | card_oferta
  categoria: text('categoria').notNull(),
  anunciante: text('anunciante').notNull(),
  imagemUrl: text('imagem_url').notNull(),
  linkDestino: text('link_destino').notNull(),
  texto: text('texto').notNull(),
  dataInicio: timestamp('data_inicio', { withTimezone: true }).notNull(),
  dataFim: timestamp('data_fim', { withTimezone: true }).notNull(),
  prioridade: integer('prioridade').notNull().default(1),
  status: text('status').notNull().default('ativo'), // ativo | pausado | expirado
  impressoes: integer('impressoes').notNull().default(0),
  cliques: integer('cliques').notNull().default(0),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const adImpressions = pgTable('ad_impressions', {
  id: text('id').primaryKey(),
  adSlotId: text('ad_slot_id').notNull(),
  providerProfileId: text('provider_profile_id').notNull(),
  exibidoEm: timestamp('exibido_em', { withTimezone: true }).notNull().defaultNow(),
  origem: text('origem').notNull().default('painel_prestador'),
});

export const adClicks = pgTable('ad_clicks', {
  id: text('id').primaryKey(),
  adSlotId: text('ad_slot_id').notNull(),
  providerProfileId: text('provider_profile_id').notNull(),
  clicadoEm: timestamp('clicado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const realtimeNotifications = pgTable('realtime_notifications', {
  id: text('id').primaryKey(),
  provider_id: text('provider_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  client_name: text('client_name').notNull(),
  neighborhood: text('neighborhood').notNull(),
  urgency_or_scope: text('urgency_or_scope').notNull(),
  read: boolean('read').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const storageAssets = pgTable('storage_assets', {
  id: text('id').primaryKey(),
  providerProfileId: text('provider_profile_id').notNull(),
  bucket: text('bucket').notNull().default('assets'),
  objectKey: text('object_key').notNull().unique(),
  contentType: text('content_type').notNull(),
  label: text('label').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const promotionalCampaigns = pgTable('promotional_campaigns', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  slug: text('slug').notNull().unique(),
  descricao: text('descricao').notNull(),
  tipo: text('tipo').notNull().default('introducao_novos_prestadores'),
  descontoPercentual: integer('desconto_percentual').notNull().default(50),
  duracaoCiclos: integer('duracao_ciclos').notNull().default(3),
  planosElegiveisJson: jsonb('planos_elegiveis_json').notNull(),
  precoCheioJson: jsonb('preco_cheio_json').notNull(),
  precoPromocionalJson: jsonb('preco_promocional_json').notNull(),
  dataInicio: timestamp('data_inicio', { withTimezone: true }).notNull(),
  dataFim: timestamp('data_fim', { withTimezone: true }).notNull(),
  limiteTotalResgates: integer('limite_total_resgates').notNull().default(10000),
  limitePorPrestador: integer('limite_por_prestador').notNull().default(1),
  status: text('status').notNull().default('ativo'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const promotionalRedemptions = pgTable('promotional_redemptions', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull(),
  providerProfileId: text('provider_profile_id').notNull(),
  userId: uuid('user_id'),
  subscriptionId: text('subscription_id').notNull(),
  planoId: text('plano_id').notNull(),
  cicloPromocionalAtual: integer('ciclo_promocional_atual').notNull().default(1),
  dataInicioPromocao: timestamp('data_inicio_promocao', {
    withTimezone: true,
  }).notNull(),
  dataFimPromocao: timestamp('data_fim_promocao', {
    withTimezone: true,
  }).notNull(),
  dataRetornoPrecoCheio: timestamp('data_retorno_preco_cheio', {
    withTimezone: true,
  }).notNull(),
  status: text('status').notNull().default('ativo'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const promotionEligibilityChecks = pgTable(
  'promotion_eligibility_checks',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id'),
    providerProfileId: text('provider_profile_id'),
    campaignId: text('campaign_id').notNull(),
    emailNormalizado: text('email_normalizado').notNull().default(''),
    telefoneNormalizado: text('telefone_normalizado').notNull().default(''),
    documentoNormalizado: text('documento_normalizado').notNull().default(''),
    fingerprintDispositivo: text('fingerprint_dispositivo')
      .notNull()
      .default(''),
    ipHash: text('ip_hash').notNull().default(''),
    resultado: text('resultado').notNull(),
    motivo: text('motivo').notNull().default(''),
    criadoEm: timestamp('criado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

export type PlanRow = typeof plans.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type SubscriptionEventRow = typeof subscriptionEvents.$inferSelect;
export type InvoiceRow = typeof invoices.$inferSelect;
export type OpportunityUsageRow = typeof opportunityUsage.$inferSelect;
export type ProcessedWebhookEventRow = typeof processedWebhookEvents.$inferSelect;
export type AdSlotRow = typeof adSlots.$inferSelect;
export type AdImpressionRow = typeof adImpressions.$inferSelect;
export type AdClickRow = typeof adClicks.$inferSelect;
export type RealtimeNotificationRow = typeof realtimeNotifications.$inferSelect;
export type StorageAssetRow = typeof storageAssets.$inferSelect;
