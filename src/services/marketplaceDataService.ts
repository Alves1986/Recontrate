import { ensureSchemaAndSeed, pool } from '../db/index';
import { withRlsContext } from '../db/rls';
import { sanitizeUserText } from './authService';
import {
  GeolocationRadiusService,
  TransactionalEmailService,
  WhatsAppBusinessService,
} from './essentialIntegrations';
import { OpportunityLimitService } from './opportunityLimitService';
import {
  anonymizeCustomerDisplayName,
  getMatchingPriority,
  validateSubstituteSelection,
} from '../utils/marketplaceRules';
import { assetsFiles } from '../server/neonServices';
import {
  CATEGORY_EQUIVALENCES,
  INITIAL_TAXONOMY_CATEGORIES,
  normalizeTaxonomyStem,
  normalizeTaxonomyTerm,
  slugifyTaxonomyTerm,
} from '../data/taxonomySeed';
import type { PlanTier, ProviderProfile } from '../types/confiare';

const geoService = new GeolocationRadiusService();
const emailService = new TransactionalEmailService();
const whatsappService = new WhatsAppBusinessService();
const opportunityLimitService = new OpportunityLimitService();

function slugToPlanTier(slug: string): PlanTier {
  switch ((slug || '').toLowerCase()) {
    case 'essencial':
      return 'Essencial';
    case 'profissional':
      return 'Profissional';
    case 'premium':
      return 'Premium';
    default:
      return 'Gratuito';
  }
}

function expandEquivalentCategoryNames(categoryName: string): string[] {
  const slug = slugifyTaxonomyTerm(categoryName);
  const eqSlugs = CATEGORY_EQUIVALENCES[slug] || [slug];
  const names = new Set<string>([categoryName.trim()]);
  for (const s of eqSlugs) {
    const found = INITIAL_TAXONOMY_CATEGORIES.find(
      (c) => c.slug === s || c.legacySlug === s
    );
    if (found) {
      names.add(found.nome);
      if (found.legacySlug === 'eletricista') names.add('Eletricista');
      if (found.legacySlug === 'encanador') names.add('Encanador');
      if (found.legacySlug === 'diarista') names.add('Diarista');
      if (found.legacySlug === 'pintor') names.add('Pintor');
      if (found.legacySlug === 'tecnico-de-ar-condicionado')
        names.add('Técnico de ar-condicionado');
    }
  }
  return Array.from(names);
}

export class MarketplaceDataService {
  /**
   * Busca e ranking de prestadores compatíveis por categoria oficial, especialidades oficiais
   * (incluindo sinônimos aprovados), tags livres aprovadas e raio de atendimento.
   * Sugestões pendentes e tags não aprovadas NUNCA entram na busca ou no matching.
   */
  async findMatchingProviders(input: {
    categoryName?: string;
    searchText?: string;
    neighborhood?: string;
    city?: string;
  }) {
    await ensureSchemaAndSeed();

    const params: unknown[] = [];
    let catClause = '';
    if (input.categoryName && input.categoryName !== 'Todas') {
      const equivNames = expandEquivalentCategoryNames(input.categoryName);
      params.push(equivNames);
      catClause = `AND pp.category = ANY($1::text[])`;
    }

    const { rows: candidateRows } = await pool.query(
      `SELECT pp.*,
              COALESCE(
                (SELECT json_agg(json_build_object('nome', s.nome, 'sinonimos', s.sinonimos))
                 FROM provider_specialties ps
                 JOIN specialties s ON s.id = ps.specialty_id
                 WHERE ps.provider_profile_id = pp.id AND s.ativo = true AND s.oficial = true),
                '[]'::json
              ) AS official_specialties_json,
              COALESCE(
                (SELECT json_agg(pct.tag)
                 FROM provider_custom_tags pct
                 WHERE pct.provider_profile_id = pp.id AND pct.status = 'aprovado'),
                '[]'::json
              ) AS approved_tags_json
       FROM provider_profiles pp
       WHERE pp.deleted_at IS NULL
         AND pp.verification_status = 'aprovado'
         ${catClause}`,
      params
    );

    const qNorm = normalizeTaxonomyTerm(input.searchText || '');
    const qStem = normalizeTaxonomyStem(input.searchText || '');
    const results: Array<{
      provider: any;
      priorityScore: number;
      distanceKm: number;
      matchedBy: string[];
    }> = [];

    for (const row of candidateRows) {
      const officialSpecs: Array<{ nome: string; sinonimos?: string[] }> =
        Array.isArray(row.official_specialties_json)
          ? row.official_specialties_json
          : [];
      const approvedTags: string[] = Array.isArray(row.approved_tags_json)
        ? row.approved_tags_json
        : [];
      const legacySpecialties: string[] = Array.isArray(row.specialties)
        ? row.specialties
        : [];

      const matchedBy: string[] = [];
      let textBonus = 0;

      if (qNorm) {
        const matchesOfficialSpec = officialSpecs.some((spec) => {
          const n = normalizeTaxonomyTerm(spec.nome);
          const st = normalizeTaxonomyStem(spec.nome);
          const syns = Array.isArray(spec.sinonimos) ? spec.sinonimos : [];
          return (
            n.includes(qNorm) ||
            st.includes(qStem) ||
            syns.some((syn) => {
              const sn = normalizeTaxonomyTerm(syn);
              return sn.includes(qNorm) || qNorm.includes(sn);
            })
          );
        });

        const matchesLegacySpec = legacySpecialties.some((s) =>
          normalizeTaxonomyTerm(s).includes(qNorm)
        );

        if (matchesOfficialSpec || matchesLegacySpec) {
          textBonus += 25;
          matchedBy.push('especialidade_oficial');
        }

        const matchesApprovedTag = approvedTags.some((t) => {
          const tn = normalizeTaxonomyTerm(t);
          return tn.includes(qNorm) || qNorm.includes(tn);
        });
        if (matchesApprovedTag) {
          textBonus += 15;
          matchedBy.push('tag_aprovada');
        }

        const matchesBioOrCat =
          normalizeTaxonomyTerm(row.bio || '').includes(qNorm) ||
          normalizeTaxonomyTerm(row.category || '').includes(qNorm) ||
          normalizeTaxonomyTerm(row.name || '').includes(qNorm);
        if (matchesBioOrCat) {
          textBonus += 5;
          matchedBy.push('perfil');
        }

        if (matchedBy.length === 0) {
          continue;
        }
      }

      const neighborhoods: string[] = Array.isArray(row.neighborhoods)
        ? row.neighborhoods
        : ['Pinheiros'];
      const radiusCheck = input.neighborhood
        ? await geoService.checkProviderRadius({
            requestNeighborhood: input.neighborhood,
            requestCity: input.city || row.city,
            providerNeighborhoods: neighborhoods,
            providerLat: row.latitude ? Number(row.latitude) : undefined,
            providerLng: row.longitude ? Number(row.longitude) : undefined,
            radiusKm: Number(row.radius_km || 10),
          })
        : { withinRadius: true, distanceKm: 1.5 };

      if (!radiusCheck.withinRadius) {
        continue;
      }

      const displayName = String(
        row.professional_name || row.name || 'Profissional'
      );
      const initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('');

      const mappedProfile: ProviderProfile = {
        id: row.id,
        name: displayName,
        initials: initials || 'PR',
        category: row.category,
        city: row.city,
        neighborhoods,
        yearsExperience: Number(row.years_experience || 5),
        bio: row.bio || '',
        specialties:
          officialSpecs.length > 0
            ? officialSpecs.map((s) => s.nome)
            : legacySpecialties,
        plan: slugToPlanTier(row.plan_slug),
        ratingAvg: Number(row.rating_avg || 5),
        reviewsCount: Number(row.reviews_count || 0),
        completedJobs: Number(row.completed_jobs || 0),
        responseTimeMinutes: Number(row.response_time_minutes || 12),
        responseRatePercent: Number(row.response_rate_percent || 98),
        attendanceRatePercent: Number(row.attendance_rate_percent || 100),
        isVerified: Boolean(row.is_verified),
        isTopRegion: Boolean(row.is_top_region),
        isMentor: Boolean(row.is_mentor),
        availableToday: Boolean(row.available_today),
        profileCompletenessPercent: Number(
          row.profile_completeness_percent || 90
        ),
        whatsapp: row.whatsapp,
        trustedSubstitutesIds: [],
        portfolio: [],
        reviews: [],
      };

      const priority = getMatchingPriority(mappedProfile, {
        locationQuery: input.neighborhood,
      });

      results.push({
        provider: {
          id: row.id,
          slug: row.slug || row.id,
          name: displayName,
          category: row.category,
          city: row.city,
          neighborhoods,
          rating_avg: row.rating_avg,
          reviews_count: row.reviews_count,
          officialSpecialties: officialSpecs.map((s) => s.nome),
          approvedTags,
        },
        priorityScore: priority.priorityScore + textBonus,
        distanceKm: radiusCheck.distanceKm,
        matchedBy,
      });
    }

    return results.sort((a, b) => b.priorityScore - a.priorityScore);
  }
  /**
   * 1. Cria solicitação real persistida (RLS cliente) e dispara oportunidades reais
   * para prestadores compatíveis dentro do raio de atendimento e limite mensal do plano.
   */
  async createServiceRequestAndDispatch(input: {
    customerUserId: string;
    customerName: string;
    customerPhone: string;
    categoryName: string;
    problemTitle: string;
    description: string;
    neighborhood: string;
    city?: string;
    urgency: 'Hoje' | 'Amanhã' | 'Esta semana' | 'Flexível';
    preferredTime: string;
    estimatedBudget?: string;
    lgpdContactConsent: boolean;
  }) {
    await ensureSchemaAndSeed();
    const city = input.city || 'São Paulo, SP';

    // 1. Insert service_request under customer RLS context
    const createdRequest = await withRlsContext(
      { userId: input.customerUserId, role: 'cliente' },
      async (client) => {
        const res = await client.query(
          `INSERT INTO service_requests (
            customer_user_id, category_name, problem_title, description,
            neighborhood, city, urgency, preferred_time, estimated_budget,
            lgpd_contact_consent, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'oportunidades_enviadas')
          RETURNING *`,
          [
            input.customerUserId,
            sanitizeUserText(input.categoryName),
            sanitizeUserText(input.problemTitle),
            sanitizeUserText(input.description),
            sanitizeUserText(input.neighborhood),
            sanitizeUserText(city),
            input.urgency,
            sanitizeUserText(input.preferredTime),
            input.estimatedBudget ? sanitizeUserText(input.estimatedBudget) : null,
            input.lgpdContactConsent,
          ]
        );
        return res.rows[0];
      }
    );

    // 2. Find active, approved providers in the requested category (including taxonomy equivalences)
    const equivCategoryNames = expandEquivalentCategoryNames(input.categoryName);
    const { rows: candidateRows } = await pool.query(
      `SELECT * FROM provider_profiles
       WHERE category = ANY($1::text[])
         AND deleted_at IS NULL
         AND verification_status = 'aprovado'`,
      [equivCategoryNames]
    );

    const dispatchedOpportunities: any[] = [];
    const skippedProviders: Array<{ providerId: string; reason: string }> = [];

    // 3. Evaluate radius + Fair Matching Priority (getMatchingPriority)
    const scoredCandidates: Array<{
      row: any;
      priorityScore: number;
      distanceKm: number;
    }> = [];

    for (const row of candidateRows) {
      const neighborhoods: string[] = Array.isArray(row.neighborhoods)
        ? row.neighborhoods
        : ['Pinheiros'];
      const radiusCheck = await geoService.checkProviderRadius({
        requestNeighborhood: input.neighborhood,
        requestCity: city,
        providerNeighborhoods: neighborhoods,
        providerLat: row.latitude ? Number(row.latitude) : undefined,
        providerLng: row.longitude ? Number(row.longitude) : undefined,
        radiusKm: Number(row.radius_km || 10),
      });

      if (!radiusCheck.withinRadius) {
        skippedProviders.push({
          providerId: row.id,
          reason: `Fora do raio de atendimento (${radiusCheck.distanceKm} km > ${row.radius_km || 10} km)`,
        });
        continue;
      }

      const displayName = String(row.professional_name || row.name || 'Profissional');
      const initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('');

      const mappedProfile: ProviderProfile = {
        id: row.id,
        name: displayName,
        initials: initials || 'PR',
        category: row.category,
        city: row.city,
        neighborhoods,
        yearsExperience: Number(row.years_experience || 5),
        bio: row.bio || '',
        specialties: Array.isArray(row.specialties) ? row.specialties : [],
        plan: slugToPlanTier(row.plan_slug),
        ratingAvg: Number(row.rating_avg || 5),
        reviewsCount: Number(row.reviews_count || 0),
        completedJobs: Number(row.completed_jobs || 0),
        responseTimeMinutes: Number(row.response_time_minutes || 12),
        responseRatePercent: Number(row.response_rate_percent || 98),
        attendanceRatePercent: Number(row.attendance_rate_percent || 100),
        isVerified: Boolean(row.is_verified),
        isTopRegion: Boolean(row.is_top_region),
        isMentor: Boolean(row.is_mentor),
        availableToday: Boolean(row.available_today),
        profileCompletenessPercent: Number(
          row.profile_completeness_percent || 90
        ),
        whatsapp: row.whatsapp,
        trustedSubstitutesIds: [],
        portfolio: [],
        reviews: [],
      };

      const priority = getMatchingPriority(mappedProfile, {
        locationQuery: input.neighborhood,
      });

      scoredCandidates.push({
        row,
        priorityScore: priority.priorityScore,
        distanceKm: radiusCheck.distanceKm,
      });
    }

    scoredCandidates.sort((a, b) => b.priorityScore - a.priorityScore);

    // 4. Dispatch opportunities to top up-to-3 compatible providers respecting monthly plan limits
    const firstName = input.customerName.trim().split(' ')[0] || 'Cliente';
    const maskedName = `${firstName} (Cliente Verificado)`;

    for (const candidate of scoredCandidates.slice(0, 3)) {
      const quota = await opportunityLimitService.recordOpportunitySent(
        candidate.row.id
      );
      if (!quota.allowed) {
        skippedProviders.push({
          providerId: candidate.row.id,
          reason: quota.reason || 'Limite mensal atingido',
        });
        continue;
      }

      const oppRow = await withRlsContext(
        {
          userId: input.customerUserId,
          role: 'cliente',
          providerProfileId: candidate.row.id,
        },
        async (client) => {
          const ins = await client.query(
            `INSERT INTO opportunities (
              service_request_id, provider_profile_id, customer_user_id,
              category_name, title, description, neighborhood, distance_km,
              urgency, preferred_time, client_name_masked, client_name_full,
              client_whatsapp, lgpd_contact_consent, origin, status, contact_released
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Matching Local','pendente',false)
            RETURNING *`,
            [
              createdRequest.id,
              candidate.row.id,
              input.customerUserId,
              sanitizeUserText(input.categoryName),
              sanitizeUserText(input.problemTitle),
              sanitizeUserText(input.description),
              sanitizeUserText(input.neighborhood),
              candidate.distanceKm,
              input.urgency,
              sanitizeUserText(input.preferredTime),
              maskedName,
              sanitizeUserText(input.customerName),
              sanitizeUserText(input.customerPhone),
              input.lgpdContactConsent,
            ]
          );
          return ins.rows[0];
        }
      );

      dispatchedOpportunities.push(oppRow);

      await whatsappService.sendTemplateNotification({
        recipientPhone: candidate.row.whatsapp,
        templateName: 'nova_oportunidade_compativel',
        providerProfileId: candidate.row.id,
        customerUserId: input.customerUserId,
        parameters: {
          title: input.problemTitle,
          neighborhood: input.neighborhood,
          distanceKm: String(candidate.distanceKm),
        },
      });
    }

    return {
      request: createdRequest,
      dispatchedCount: dispatchedOpportunities.length,
      opportunities: dispatchedOpportunities,
      skippedProviders,
    };
  }

  /**
   * 2. Marca solicitação de serviço como concluída pelo cliente autenticado e libera avaliação verificada.
   */
  async completeServiceRequest(input: {
    requestId: string;
    customerUserId: string;
  }) {
    await ensureSchemaAndSeed();
    return withRlsContext(
      { userId: input.customerUserId, role: 'cliente' },
      async (client) => {
        const existing = await client.query(
          `SELECT id, customer_user_id, status
           FROM service_requests
           WHERE id = $1::uuid AND deleted_at IS NULL
           LIMIT 1`,
          [input.requestId]
        );
        if (existing.rows.length === 0) {
          throw new Error('Solicitação de serviço não encontrada.');
        }
        if (existing.rows[0].customer_user_id !== input.customerUserId) {
          throw new Error(
            'Apenas o cliente autor da solicitação pode marcá-la como concluída.'
          );
        }
        const upd = await client.query(
          `UPDATE service_requests
           SET status = 'concluido', updated_at = NOW()
           WHERE id = $1::uuid
           RETURNING *`,
          [input.requestId]
        );
        return upd.rows[0];
      }
    );
  }

  /**
   * 2b. Registra avaliação real pós-atendimento no banco exigindo solicitação concluída do cliente,
   * anonimizando o nome exibido por padrão, recalculando reputação e atualizando Lista de Confiança.
   */
  async submitReviewAndRecalculateReputation(input: {
    customerUserId: string;
    customerName: string;
    providerProfileId: string;
    serviceRequestId: string;
    displayPublicName?: boolean;
    neighborhood: string;
    serviceTitle: string;
    qualidade: number;
    pontualidade: number;
    comunicacao: number;
    organizacao: number;
    wouldRecommend: boolean;
    comment: string;
  }) {
    await ensureSchemaAndSeed();

    if (!input.serviceRequestId) {
      throw new Error(
        'É obrigatório informar uma solicitação de serviço concluída para avaliar.'
      );
    }

    const { rows: reqRows } = await pool.query(
      `SELECT id, customer_user_id, status
       FROM service_requests
       WHERE id = $1::uuid AND deleted_at IS NULL
       LIMIT 1`,
      [input.serviceRequestId]
    );
    if (reqRows.length === 0) {
      throw new Error('Solicitação de serviço informada não encontrada.');
    }
    const reqRow = reqRows[0];
    if (reqRow.customer_user_id !== input.customerUserId) {
      throw new Error(
        'Você só pode avaliar atendimentos vinculados às suas próprias solicitações.'
      );
    }
    if (reqRow.status !== 'concluido') {
      throw new Error(
        'A avaliação só pode ser publicada após marcar a solicitação de serviço como concluída.'
      );
    }

    const { rows: linkRows } = await pool.query(
      `SELECT 1 AS linked
       FROM opportunities
       WHERE service_request_id = $1::uuid
         AND provider_profile_id = $2
         AND status = 'aceita'
         AND contact_released = TRUE
       UNION ALL
       SELECT 1 AS linked
       FROM repeat_requests
       WHERE customer_user_id = $3::uuid
         AND provider_profile_id = $2
         AND status = 'aceito'
       LIMIT 1`,
      [input.serviceRequestId, input.providerProfileId, input.customerUserId]
    );
    if (linkRows.length === 0) {
      throw new Error(
        'Apenas profissionais que aceitaram a solicitação com contato liberado podem receber avaliação verificada.'
      );
    }

    const avgCriteria =
      (input.qualidade +
        input.pontualidade +
        input.comunicacao +
        input.organizacao) /
      4;
    const rating = Math.round(avgCriteria * 100) / 100;
    const publicReviewerName = input.displayPublicName
      ? sanitizeUserText(input.customerName)
      : anonymizeCustomerDisplayName(input.customerName);

    // 1. Insert review under customer RLS policy
    let createdReview: any;
    try {
      createdReview = await withRlsContext(
        { userId: input.customerUserId, role: 'cliente' },
        async (client) => {
          const ins = await client.query(
            `INSERT INTO reviews (
              service_request_id, provider_profile_id, customer_user_id,
              client_name_display, neighborhood, service_title, rating,
              qualidade, pontualidade, comunicacao, organizacao, would_recommend, comment
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING *`,
            [
              input.serviceRequestId,
              input.providerProfileId,
              input.customerUserId,
              publicReviewerName,
              sanitizeUserText(input.neighborhood),
              sanitizeUserText(input.serviceTitle),
              rating,
              input.qualidade,
              input.pontualidade,
              input.comunicacao,
              input.organizacao,
              input.wouldRecommend,
              sanitizeUserText(input.comment),
            ]
          );

          // Upsert into professional_trust_list under customer RLS
          await client.query(
            `INSERT INTO professional_trust_list (
              customer_user_id, provider_profile_id, last_service_date, last_service_summary, times_hired
            ) VALUES ($1, $2, TO_CHAR(NOW(), 'DD/MM/YYYY'), $3, 1)
            ON CONFLICT (customer_user_id, provider_profile_id)
            DO UPDATE SET
              last_service_date = EXCLUDED.last_service_date,
              last_service_summary = EXCLUDED.last_service_summary,
              times_hired = professional_trust_list.times_hired + 1`,
            [
              input.customerUserId,
              input.providerProfileId,
              sanitizeUserText(input.serviceTitle),
            ]
          );

          return ins.rows[0];
        }
      );
    } catch (err: any) {
      if (
        err?.code === '23505' ||
        String(err?.constraint || '').includes('idx_reviews_unique_service_request_customer')
      ) {
        const dupErr: any = new Error(
          'Esta solicitação de serviço já foi avaliada por você.'
        );
        dupErr.code = 'DUPLICATE_REVIEW';
        throw dupErr;
      }
      throw err;
    }

    // 2. Recalculate provider rating_avg, reviews_count, and completed_jobs in PostgreSQL
    const { rows: provRows } = await pool.query(
      `SELECT rating_avg, reviews_count, completed_jobs
       FROM provider_profiles
       WHERE id = $1`,
      [input.providerProfileId]
    );
    if (provRows.length === 0) {
      throw new Error('Prestador não encontrado para avaliação.');
    }

    const prevRating = Number(provRows[0].rating_avg || 5);
    const prevCount = Number(provRows[0].reviews_count || 0);
    const prevJobs = Number(provRows[0].completed_jobs || 0);
    const newCount = prevCount + 1;
    const newRatingAvg = (
      (prevRating * prevCount + rating) /
      newCount
    ).toFixed(2);

    const { rows: updatedProvRows } = await pool.query(
      `UPDATE provider_profiles
       SET rating_avg = $2,
           reviews_count = $3,
           completed_jobs = $4,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, category, rating_avg, reviews_count, completed_jobs`,
      [input.providerProfileId, newRatingAvg, newCount, prevJobs + 1]
    );

    return {
      review: createdReview,
      updatedProvider: updatedProvRows[0],
    };
  }

  /**
   * 3. Recontratação em 1 clique (repeat_requests) + notificação WhatsApp Business
   */
  async createRepeatRequest(input: {
    customerUserId: string;
    customerName: string;
    customerPhone: string;
    providerProfileId: string;
    categoryName: string;
    serviceType: string;
    desiredDate: string;
    urgency: string;
    notes?: string;
    lgpdShareConsent: boolean;
  }) {
    await ensureSchemaAndSeed();

    const repeatRow = await withRlsContext(
      {
        userId: input.customerUserId,
        role: 'cliente',
        providerProfileId: input.providerProfileId,
      },
      async (client) => {
        const ins = await client.query(
          `INSERT INTO repeat_requests (
            customer_user_id, provider_profile_id, category_name,
            service_type, desired_date, urgency, notes, lgpd_share_consent, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'solicitado')
          RETURNING *`,
          [
            input.customerUserId,
            input.providerProfileId,
            sanitizeUserText(input.categoryName),
            sanitizeUserText(input.serviceType),
            sanitizeUserText(input.desiredDate),
            sanitizeUserText(input.urgency),
            sanitizeUserText(input.notes || ''),
            input.lgpdShareConsent,
          ]
        );
        return ins.rows[0];
      }
    );

    const { rows: provRows } = await pool.query(
      `SELECT whatsapp FROM provider_profiles WHERE id = $1`,
      [input.providerProfileId]
    );
    if (provRows[0]?.whatsapp) {
      await whatsappService.sendTemplateNotification({
        recipientPhone: provRows[0].whatsapp,
        templateName: 'recontratacao_1_clique',
        providerProfileId: input.providerProfileId,
        customerUserId: input.customerUserId,
        parameters: {
          customerName: input.customerName,
          serviceType: input.serviceType,
          desiredDate: input.desiredDate,
        },
      });
    }

    return repeatRow;
  }

  async getCustomerTrustList(customerUserId: string) {
    await ensureSchemaAndSeed();
    return withRlsContext(
      { userId: customerUserId, role: 'cliente' },
      async (client) => {
        const res = await client.query(
          `SELECT ptl.*, pp.name AS provider_name, pp.category, pp.rating_avg, pp.slug
           FROM professional_trust_list ptl
           JOIN provider_profiles pp ON pp.id = ptl.provider_profile_id
           ORDER BY ptl.times_hired DESC, ptl.created_at DESC`
        );
        return res.rows;
      }
    );
  }

  /**
   * 4. Indicação de Substituto de Confiança (máx. 2 substitutos + consentimento explícito do cliente)
   */
  async createSubstituteReferral(input: {
    originalProviderId: string;
    customerUserId: string;
    repeatRequestId?: string;
    substituteProviderIds: string[];
    reasonCategory: string;
    customNote: string;
    serviceContext: string;
    neighborhood: string;
    urgency: string;
    clientConsentShared: boolean;
  }) {
    await ensureSchemaAndSeed();

    const validation = validateSubstituteSelection(
      input.originalProviderId,
      input.substituteProviderIds,
      input.customNote
    );
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const referral = await withRlsContext(
      {
        userId: input.customerUserId,
        role: 'prestador',
        providerProfileId: input.originalProviderId,
      },
      async (client) => {
        const ins = await client.query(
          `INSERT INTO substitute_referrals (
            repeat_request_id, original_provider_id, customer_user_id,
            substitute_provider_ids, reason_category, custom_note,
            service_context, neighborhood, urgency, client_consent_shared
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING *`,
          [
            input.repeatRequestId || null,
            input.originalProviderId,
            input.customerUserId,
            input.substituteProviderIds,
            sanitizeUserText(input.reasonCategory),
            sanitizeUserText(input.customNote),
            sanitizeUserText(input.serviceContext),
            sanitizeUserText(input.neighborhood),
            sanitizeUserText(input.urgency),
            input.clientConsentShared,
          ]
        );
        return ins.rows[0];
      }
    );

    if (input.clientConsentShared) {
      for (const subId of input.substituteProviderIds) {
        const { rows: subProv } = await pool.query(
          `SELECT whatsapp FROM provider_profiles WHERE id = $1`,
          [subId]
        );
        if (subProv[0]?.whatsapp) {
          await whatsappService.sendTemplateNotification({
            recipientPhone: subProv[0].whatsapp,
            templateName: 'indicacao_substituto_confiavel',
            providerProfileId: subId,
            customerUserId: input.customerUserId,
            parameters: {
              referredBy: input.originalProviderId,
              serviceContext: input.serviceContext,
              neighborhood: input.neighborhood,
            },
          });
        }
      }
    }

    return referral;
  }

  /**
   * Consulta indicações de substituto aplicando a política RLS:
   * Um prestituto indicado SÓ consegue ler os dados da indicação se client_consent_shared = true.
   */
  async getSubstituteReferralsForActor(actor: {
    userId: string;
    role: 'cliente' | 'prestador' | 'padrinho' | 'admin';
    providerProfileId?: string | null;
  }) {
    await ensureSchemaAndSeed();
    return withRlsContext(actor, async (client) => {
      const res = await client.query(
        `SELECT * FROM substitute_referrals ORDER BY created_at DESC`
      );
      return res.rows;
    });
  }

  /**
   * 5. Mentoria / Padrinho Verificado (criação e listagem protegida por RLS)
   */
  async createMentorship(input: {
    mentorProviderId: string;
    menteeProviderId: string;
    mentorCode: string;
    actorUserId: string;
    actorRole: 'padrinho' | 'admin';
  }) {
    await ensureSchemaAndSeed();
    if (input.mentorProviderId === input.menteeProviderId) {
      throw new Error('O padrinho não pode apadrinhar o próprio perfil.');
    }

    return withRlsContext(
      {
        userId: input.actorUserId,
        role: input.actorRole,
        providerProfileId: input.mentorProviderId,
      },
      async (client) => {
        const ins = await client.query(
          `INSERT INTO mentorships (
            mentor_provider_id, mentee_provider_id, mentor_code, status
          ) VALUES ($1, $2, $3, 'ativo')
          ON CONFLICT (mentor_provider_id, mentee_provider_id)
          DO UPDATE SET status = 'ativo', mentor_code = EXCLUDED.mentor_code
          RETURNING *`,
          [
            input.mentorProviderId,
            input.menteeProviderId,
            sanitizeUserText(input.mentorCode),
          ]
        );
        return ins.rows[0];
      }
    );
  }

  /**
   * 6. Documentos de Verificação do Prestador (Acesso privado restrito ao prestador dono e admin)
   */
  async uploadVerificationDocument(input: {
    actorUserId: string;
    actorRole: 'prestador' | 'padrinho' | 'admin';
    providerProfileId: string;
    documentType: 'rg_cnh' | 'comprovante_endereco' | 'certificado_tecnico';
    label: string;
    contentBase64OrText: string;
    contentType?: string;
  }) {
    await ensureSchemaAndSeed();
    const objectKey = `verification-private/${input.providerProfileId}/${input.documentType}-${Date.now()}.txt`;
    const bytes = Buffer.from(input.contentBase64OrText, 'utf-8');

    await assetsFiles.upload(objectKey, bytes, {
      contentType: input.contentType || 'text/plain',
    });

    const assetId = `verif-doc-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    const createdDoc = await withRlsContext(
      {
        userId: input.actorUserId,
        role: input.actorRole === 'admin' ? 'admin' : 'prestador',
        providerProfileId: input.providerProfileId,
      },
      async (client) => {
        const ins = await client.query(
          `INSERT INTO storage_assets (
            id, provider_profile_id, bucket, object_key, content_type,
            label, size_bytes, visibility, document_type
          ) VALUES ($1,$2,'assets',$3,$4,$5,$6,'private_verification',$7)
          RETURNING *`,
          [
            assetId,
            input.providerProfileId,
            objectKey,
            input.contentType || 'text/plain',
            sanitizeUserText(input.label),
            bytes.byteLength,
            input.documentType,
          ]
        );
        return ins.rows[0];
      }
    );

    return createdDoc;
  }

  /**
   * Retorna documento de verificação com URL pré-assinada APENAS para o prestador dono ou admin.
   * Bloqueado em nível de banco por RLS (rls_storage_assets_policy) para qualquer outro usuário.
   */
  async getVerificationDocuments(actor: {
    userId: string;
    role: 'cliente' | 'prestador' | 'padrinho' | 'admin';
    providerProfileId?: string | null;
    targetProviderProfileId?: string;
  }) {
    await ensureSchemaAndSeed();
    const rows = await withRlsContext(actor, async (client) => {
      const params: unknown[] = [];
      let whereClause = `WHERE visibility = 'private_verification'`;
      if (actor.targetProviderProfileId) {
        params.push(actor.targetProviderProfileId);
        whereClause += ` AND provider_profile_id = $1`;
      }
      const res = await client.query(
        `SELECT * FROM storage_assets ${whereClause} ORDER BY created_at DESC`,
        params
      );
      return res.rows;
    });

    const docsWithUrls = await Promise.all(
      rows.map(async (row: any) => {
        const presignedUrl = await assetsFiles.url(row.object_key, {
          expiresIn: 900,
        });
        return {
          id: row.id,
          providerProfileId: row.provider_profile_id,
          documentType: row.document_type,
          label: row.label,
          visibility: row.visibility,
          sizeBytes: row.size_bytes,
          presignedUrl,
          createdAt: row.created_at,
        };
      })
    );

    return docsWithUrls;
  }

  /**
   * 7. Aprovação ou rejeição de cadastro de prestador pelo Administrador
   */
  async adminVerifyProviderRegistration(input: {
    adminUserId: string;
    providerProfileId: string;
    decision: 'aprovado' | 'rejeitado';
    notes?: string;
  }) {
    await ensureSchemaAndSeed();
    const isVerified = input.decision === 'aprovado';

    const { rows } = await pool.query(
      `UPDATE provider_profiles
       SET verification_status = $2,
           is_verified = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, category, city, verification_status, is_verified, user_id`,
      [input.providerProfileId, input.decision, isVerified]
    );

    if (rows.length === 0) {
      throw new Error('Perfil de prestador não encontrado.');
    }

    const updated = rows[0];

    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, actor_role, action, target_type, target_id, metadata_json)
       VALUES ($1, 'admin', 'admin_provider_verification_decision', 'provider_profile', $2, $3::jsonb)`,
      [
        input.adminUserId,
        input.providerProfileId,
        JSON.stringify({
          decision: input.decision,
          notes: input.notes || null,
        }),
      ]
    );

    if (updated.user_id) {
      const { rows: uRows } = await pool.query(
        `SELECT email FROM users WHERE id = $1`,
        [updated.user_id]
      );
      if (uRows[0]?.email) {
        await emailService.sendEmail({
          to: uRows[0].email,
          subject: `Recontrate: Cadastro de Prestador ${input.decision.toUpperCase()}`,
          template: 'aviso_aprovacao_cadastro',
          userId: updated.user_id,
          variables: {
            providerName: updated.name,
            decision: input.decision,
          },
        });
      }
    }

    return updated;
  }
}
