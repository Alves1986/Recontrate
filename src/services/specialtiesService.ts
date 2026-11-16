import { ensureSchemaAndSeed, pool } from '../db/index';
import {
  normalizeTaxonomyStem,
  normalizeTaxonomyTerm,
  slugifyTaxonomyTerm,
} from '../data/taxonomySeed';
import { sanitizeUserText } from './authService';

export const MAX_OFFICIAL_SPECIALTIES_PER_PROVIDER = 5;
export const MAX_PENDING_SUGGESTIONS_PER_PROVIDER = 3;
export const MAX_CUSTOM_TAGS_PER_PROVIDER = 10;

const GENERIC_BLOCKED_TERMS = new Set([
  'servicos',
  'servico',
  'diversos',
  'diverso',
  'outros',
  'outro',
  'geral',
  'servicos gerais',
  'servico geral',
  'manutencao geral',
  'faz tudo',
  'tudo',
  'varios',
  'qualquer',
  'outros servicos',
]);

const OFFENSIVE_OR_FORBIDDEN_KEYWORDS = [
  'idiota',
  'burro',
  'lixo',
  'merda',
  'porra',
  'caralho',
  'puta',
  'vagabundo',
  'racista',
  'nazista',
  'droga',
  'arma',
  'ilegal',
  'hack',
  'pirata',
  'porn',
  'sexo',
  'adulto',
  '+18',
  'aposta',
  'cassino',
  'tigrinho',
  'getninjas',
  'habitissimo',
  'triider',
  'olx',
];

const PRICE_PROMISE_KEYWORDS = [
  'barato',
  'mais barato',
  'menor preco',
  'promocao',
  'desconto',
  'gratis',
  'orcamento gratis',
  'r$',
  'reais',
];

export function validateTaxonomyLabel(
  rawText: string,
  kind: 'suggestion' | 'tag'
): { valid: boolean; reason?: string; cleaned: string } {
  const cleaned = sanitizeUserText(rawText).replace(/\s+/g, ' ').trim();
  const minLen = kind === 'suggestion' ? 3 : 2;
  const maxLen = kind === 'suggestion' ? 60 : 40;

  if (cleaned.length < minLen || cleaned.length > maxLen) {
    return {
      valid: false,
      cleaned,
      reason:
        kind === 'suggestion'
          ? 'O nome da especialidade deve ter entre 3 e 60 caracteres.'
          : 'A tag deve ter entre 2 e 40 caracteres.',
    };
  }

  const norm = normalizeTaxonomyTerm(cleaned);
  const stem = normalizeTaxonomyStem(cleaned);
  const tokens = norm.split(' ');

  if (
    GENERIC_BLOCKED_TERMS.has(norm) ||
    GENERIC_BLOCKED_TERMS.has(stem) ||
    tokens.some((t) =>
      ['diversos', 'diversas', 'diverso', 'outros', 'outras', 'outro', 'varios'].includes(t)
    )
  ) {
    return {
      valid: false,
      cleaned,
      reason:
        'Termos muito genéricos (como "serviços", "diversos" ou "outros") não são permitidos.',
    };
  }

  if (/https?:\/\/|www\.|\.com|\.br|@/i.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      reason:
        'Não é permitido incluir links, domínios ou e-mails em especialidades ou tags.',
    };
  }

  if (/(?:\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}|\b\d{4,5}[-\s]\d{4}\b|\b\d{10,11}\b)/.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      reason:
        'Não é permitido incluir números de telefone ou WhatsApp em especialidades ou tags.',
    };
  }

  for (const bad of OFFENSIVE_OR_FORBIDDEN_KEYWORDS) {
    if (norm.includes(bad)) {
      return {
        valid: false,
        cleaned,
        reason:
          'Conteúdo bloqueado pela moderação automática por conter termos ofensivos, ilegais ou concorrentes.',
      };
    }
  }

  for (const priceTerm of PRICE_PROMISE_KEYWORDS) {
    if (norm.includes(priceTerm) || cleaned.toLowerCase().includes('r$')) {
      return {
        valid: false,
        cleaned,
        reason:
          'Promessas de preço ou promoções não são permitidas em especialidades ou tags.',
      };
    }
  }

  return { valid: true, cleaned };
}

export class SpecialtiesTaxonomyService {
  async listCategoriesWithSpecialties() {
    await ensureSchemaAndSeed();
    const [catsRes, specsRes] = await Promise.all([
      pool.query(
        `SELECT id, slug, COALESCE(nome, name) AS nome, COALESCE(descricao, short_desc) AS descricao,
                icone, ordem_exibicao, avg_response_min, verified_count
         FROM categories
         WHERE ativo = true AND active = true
         ORDER BY ordem_exibicao ASC, nome ASC`
      ),
      pool.query(
        `SELECT id, category_id, nome, slug, descricao, sinonimos
         FROM specialties
         WHERE ativo = true AND oficial = true
         ORDER BY nome ASC`
      ),
    ]);

    const specsByCat = new Map<string, any[]>();
    for (const s of specsRes.rows) {
      const list = specsByCat.get(s.category_id) || [];
      list.push(s);
      specsByCat.set(s.category_id, list);
    }

    return catsRes.rows.map((c: any) => ({
      ...c,
      specialties: specsByCat.get(c.id) || [],
    }));
  }

  async searchOfficialSpecialties(params: {
    categoryId?: string;
    query?: string;
  }) {
    await ensureSchemaAndSeed();
    const values: unknown[] = [];
    let where = `WHERE s.ativo = true AND s.oficial = true`;

    if (params.categoryId) {
      values.push(params.categoryId);
      where += ` AND s.category_id = $${values.length}::uuid`;
    }

    const { rows } = await pool.query(
      `SELECT s.id, s.category_id, s.nome, s.slug, s.descricao, s.sinonimos,
              COALESCE(c.nome, c.name) AS category_name, c.slug AS category_slug
       FROM specialties s
       JOIN categories c ON c.id = s.category_id
       ${where}
       ORDER BY s.nome ASC`,
      values
    );

    const qNorm = normalizeTaxonomyTerm(params.query || '');
    const qStem = normalizeTaxonomyStem(params.query || '');
    if (!qNorm) return rows;

    return rows.filter((row: any) => {
      const nameNorm = normalizeTaxonomyTerm(row.nome);
      const nameStem = normalizeTaxonomyStem(row.nome);
      if (
        nameNorm.includes(qNorm) ||
        nameStem.includes(qStem) ||
        qNorm.includes(nameNorm)
      ) {
        return true;
      }
      const synonyms: string[] = Array.isArray(row.sinonimos)
        ? row.sinonimos
        : [];
      return synonyms.some((syn) => {
        const synNorm = normalizeTaxonomyTerm(syn);
        const synStem = normalizeTaxonomyStem(syn);
        return (
          synNorm.includes(qNorm) ||
          qNorm.includes(synNorm) ||
          synStem.includes(qStem)
        );
      });
    });
  }

  async findSimilarOfficialSpecialties(
    nomeSugerido: string,
    categoryId?: string
  ) {
    await ensureSchemaAndSeed();
    const norm = normalizeTaxonomyTerm(nomeSugerido);
    const stem = normalizeTaxonomyStem(nomeSugerido);
    const tokens = stem.split(' ').filter((t) => t.length >= 3);

    const { rows } = await pool.query(
      `SELECT s.id, s.category_id, s.nome, s.slug, s.sinonimos,
              COALESCE(c.nome, c.name) AS category_name
       FROM specialties s
       JOIN categories c ON c.id = s.category_id
       WHERE s.ativo = true AND s.oficial = true`
    );

    const matches: Array<{
      id: string;
      nome: string;
      slug: string;
      categoryName: string;
      exactDuplicate: boolean;
      score: number;
    }> = [];

    for (const row of rows) {
      const rowNorm = normalizeTaxonomyTerm(row.nome);
      const rowStem = normalizeTaxonomyStem(row.nome);
      const synonyms: string[] = Array.isArray(row.sinonimos)
        ? row.sinonimos
        : [];
      const synNorms = synonyms.map((s) => normalizeTaxonomyStem(s));

      const isExact =
        rowNorm === norm || rowStem === stem || synNorms.includes(stem);
      if (isExact) {
        matches.push({
          id: row.id,
          nome: row.nome,
          slug: row.slug,
          categoryName: row.category_name,
          exactDuplicate: true,
          score: 100,
        });
        continue;
      }

      if (tokens.length > 0) {
        const matchedTokens = tokens.filter(
          (tok) =>
            rowStem.includes(tok) || synNorms.some((sn) => sn.includes(tok))
        );
        const sameCatBonus = categoryId && row.category_id === categoryId ? 10 : 0;
        if (matchedTokens.length > 0) {
          matches.push({
            id: row.id,
            nome: row.nome,
            slug: row.slug,
            categoryName: row.category_name,
            exactDuplicate: false,
            score: matchedTokens.length * 25 + sameCatBonus,
          });
        }
      }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * Salva a categoria principal oficial + 1 a 5 especialidades oficiais do prestador.
   */
  async setProviderOfficialSpecialties(input: {
    providerProfileId: string;
    categoryId: string;
    specialtyIds: string[];
    principalSpecialtyId?: string;
  }) {
    await ensureSchemaAndSeed();

    if (
      !Array.isArray(input.specialtyIds) ||
      input.specialtyIds.length === 0
    ) {
      throw new Error(
        'Selecione pelo menos 1 especialidade oficial para sua atuação.'
      );
    }

    const uniqueSpecIds = Array.from(new Set(input.specialtyIds));
    if (uniqueSpecIds.length > MAX_OFFICIAL_SPECIALTIES_PER_PROVIDER) {
      throw new Error(
        `Você pode selecionar no máximo ${MAX_OFFICIAL_SPECIALTIES_PER_PROVIDER} especialidades oficiais.`
      );
    }

    const { rows: catRows } = await pool.query(
      `SELECT id, COALESCE(nome, name) AS nome FROM categories WHERE id = $1::uuid AND ativo = true`,
      [input.categoryId]
    );
    if (catRows.length === 0) {
      throw new Error(
        'Categoria oficial inválida. Não é permitido criar categoria principal livre.'
      );
    }
    const categoryName = catRows[0].nome;

    const { rows: specRows } = await pool.query(
      `SELECT id, nome, category_id FROM specialties
       WHERE id = ANY($1::uuid[]) AND ativo = true AND oficial = true`,
      [uniqueSpecIds]
    );
    if (specRows.length !== uniqueSpecIds.length) {
      throw new Error(
        'Uma ou mais especialidades selecionadas não pertencem ao catálogo oficial ativo.'
      );
    }

    await pool.query(
      `DELETE FROM provider_specialties WHERE provider_profile_id = $1`,
      [input.providerProfileId]
    );

    const principalId = input.principalSpecialtyId || uniqueSpecIds[0];
    for (const specId of uniqueSpecIds) {
      await pool.query(
        `INSERT INTO provider_specialties (provider_profile_id, specialty_id, especialidade_principal)
         VALUES ($1, $2::uuid, $3)`,
        [input.providerProfileId, specId, specId === principalId]
      );
    }

    const officialNames = specRows.map((s) => s.nome);
    await pool.query(
      `UPDATE provider_profiles
       SET category = $2,
           specialties = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [input.providerProfileId, categoryName, officialNames]
    );

    return {
      categoryId: input.categoryId,
      categoryName,
      specialties: specRows,
    };
  }

  /**
   * Prestador sugere uma nova especialidade para análise administrativa.
   * Nunca entra no perfil público ou matching enquanto pendente.
   */
  async createSpecialtySuggestion(input: {
    providerProfileId: string;
    categoryId: string;
    nomeSugerido: string;
    descricao?: string;
  }) {
    await ensureSchemaAndSeed();

    const validation = validateTaxonomyLabel(input.nomeSugerido, 'suggestion');
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const { rows: catRows } = await pool.query(
      `SELECT id, COALESCE(nome, name) AS nome FROM categories WHERE id = $1::uuid AND ativo = true`,
      [input.categoryId]
    );
    if (catRows.length === 0) {
      throw new Error('Selecione uma categoria oficial válida.');
    }

    // Limite de 3 sugestões pendentes por prestador
    const { rows: pendingRows } = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM specialty_suggestions
       WHERE provider_profile_id = $1 AND status = 'pendente'`,
      [input.providerProfileId]
    );
    if (
      Number(pendingRows[0]?.total || 0) >=
      MAX_PENDING_SUGGESTIONS_PER_PROVIDER
    ) {
      throw new Error(
        `Limite de ${MAX_PENDING_SUGGESTIONS_PER_PROVIDER} sugestões pendentes atingido. Aguarde a análise da moderação.`
      );
    }

    const norm = normalizeTaxonomyStem(validation.cleaned);

    // Verifica duplicidade exata com especialidade oficial ou sinônimo existente
    const similar = await this.findSimilarOfficialSpecialties(
      validation.cleaned,
      input.categoryId
    );
    const exactOfficial = similar.find((m) => m.exactDuplicate);
    if (exactOfficial) {
      throw new Error(
        `Esta especialidade já existe no catálogo oficial como "${exactOfficial.nome}". Selecione-a diretamente na lista.`
      );
    }

    // Verifica duplicidade com sugestão pendente do próprio prestador
    const { rows: dupPending } = await pool.query(
      `SELECT id FROM specialty_suggestions
       WHERE provider_profile_id = $1
         AND nome_normalizado = $2
         AND status = 'pendente'
       LIMIT 1`,
      [input.providerProfileId, norm]
    );
    if (dupPending.length > 0) {
      throw new Error(
        'Você já possui uma sugestão pendente semelhante em análise.'
      );
    }

    const safeDesc = sanitizeUserText(input.descricao || '');
    const { rows } = await pool.query(
      `INSERT INTO specialty_suggestions (
        provider_profile_id, category_id, nome_sugerido, nome_normalizado, descricao, status
      ) VALUES ($1, $2::uuid, $3, $4, $5, 'pendente')
      RETURNING *`,
      [
        input.providerProfileId,
        input.categoryId,
        validation.cleaned,
        norm,
        safeDesc,
      ]
    );

    return {
      suggestion: rows[0],
      similarOfficial: similar,
      message:
        'Sua sugestão foi enviada para análise. Enquanto isso, selecione uma especialidade oficial próxima.',
    };
  }

  /**
   * Adiciona tag livre complementar ao perfil (máx. 10 tags, com moderação automática).
   * Jamais cria categoria ou especialidade oficial.
   */
  async addProviderCustomTag(input: {
    providerProfileId: string;
    tag: string;
    requireHumanReview?: boolean;
  }) {
    await ensureSchemaAndSeed();

    const validation = validateTaxonomyLabel(input.tag, 'tag');
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const { rows: countRows } = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM provider_custom_tags
       WHERE provider_profile_id = $1 AND status IN ('aprovado', 'pendente')`,
      [input.providerProfileId]
    );
    if (Number(countRows[0]?.total || 0) >= MAX_CUSTOM_TAGS_PER_PROVIDER) {
      throw new Error(
        `Limite máximo de ${MAX_CUSTOM_TAGS_PER_PROVIDER} tags livres por prestador atingido.`
      );
    }

    const slug = slugifyTaxonomyTerm(validation.cleaned);
    if (!slug) {
      throw new Error('Tag inválida.');
    }

    const initialStatus = input.requireHumanReview ? 'pendente' : 'aprovado';
    const moderationNote = input.requireHumanReview
      ? 'Aguardando revisão humana'
      : 'Aprovada automaticamente na moderação de conteúdo';

    const { rows } = await pool.query(
      `INSERT INTO provider_custom_tags (
        provider_profile_id, tag, slug, status, motivo_moderacao
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (provider_profile_id, slug) DO UPDATE SET
        tag = EXCLUDED.tag,
        status = EXCLUDED.status,
        motivo_moderacao = EXCLUDED.motivo_moderacao
      RETURNING *`,
      [input.providerProfileId, validation.cleaned, slug, initialStatus, moderationNote]
    );

    return rows[0];
  }

  async removeProviderCustomTag(providerProfileId: string, tagId: string) {
    await ensureSchemaAndSeed();
    const { rows } = await pool.query(
      `UPDATE provider_custom_tags
       SET status = 'removido'
       WHERE id = $1::uuid AND provider_profile_id = $2
       RETURNING *`,
      [tagId, providerProfileId]
    );
    return rows[0] || null;
  }

  async getProviderTaxonomyOverview(providerProfileId: string) {
    await ensureSchemaAndSeed();
    const [officialRes, suggestionsRes, tagsRes] = await Promise.all([
      pool.query(
        `SELECT ps.id, ps.specialty_id, ps.especialidade_principal,
                s.nome, s.slug, s.sinonimos, COALESCE(c.nome, c.name) AS category_name, c.id AS category_id
         FROM provider_specialties ps
         JOIN specialties s ON s.id = ps.specialty_id
         JOIN categories c ON c.id = s.category_id
         WHERE ps.provider_profile_id = $1 AND s.ativo = true AND s.oficial = true
         ORDER BY ps.especialidade_principal DESC, s.nome ASC`,
        [providerProfileId]
      ),
      pool.query(
        `SELECT ss.*, COALESCE(c.nome, c.name) AS category_name
         FROM specialty_suggestions ss
         JOIN categories c ON c.id = ss.category_id
         WHERE ss.provider_profile_id = $1
         ORDER BY ss.criado_em DESC`,
        [providerProfileId]
      ),
      pool.query(
        `SELECT * FROM provider_custom_tags
         WHERE provider_profile_id = $1 AND status <> 'removido'
         ORDER BY criado_em DESC`,
        [providerProfileId]
      ),
    ]);

    return {
      officialSpecialties: officialRes.rows,
      suggestions: suggestionsRes.rows,
      customTags: tagsRes.rows,
    };
  }

  /**
   * Retorna exclusivamente dados públicos aprovados para SEO e vitrine (/profissionais/[slug]):
   * Nunca retorna sugestões pendentes, tags reprovadas/pendentes ou notas internas de moderação.
   */
  async getPublicProviderTaxonomy(providerProfileId: string) {
    await ensureSchemaAndSeed();
    const [officialRes, tagsRes] = await Promise.all([
      pool.query(
        `SELECT s.id, s.nome, s.slug, ps.especialidade_principal
         FROM provider_specialties ps
         JOIN specialties s ON s.id = ps.specialty_id
         WHERE ps.provider_profile_id = $1 AND s.ativo = true AND s.oficial = true
         ORDER BY ps.especialidade_principal DESC, s.nome ASC`,
        [providerProfileId]
      ),
      pool.query(
        `SELECT id, tag, slug
         FROM provider_custom_tags
         WHERE provider_profile_id = $1 AND status = 'aprovado'
         ORDER BY criado_em DESC`,
        [providerProfileId]
      ),
    ]);

    return {
      officialSpecialties: officialRes.rows,
      approvedTags: tagsRes.rows,
    };
  }

  // =========================================================================
  // ADMIN MODERATION
  // =========================================================================
  async listAdminModerationQueue() {
    await ensureSchemaAndSeed();
    const [suggestionsRes, tagsRes] = await Promise.all([
      pool.query(
        `SELECT ss.*,
                pp.name AS provider_name,
                COALESCE(c.nome, c.name) AS category_name,
                COUNT(*) OVER (PARTITION BY ss.nome_normalizado)::int AS similar_frequency
         FROM specialty_suggestions ss
         JOIN provider_profiles pp ON pp.id = ss.provider_profile_id
         JOIN categories c ON c.id = ss.category_id
         ORDER BY CASE WHEN ss.status = 'pendente' THEN 0 ELSE 1 END, ss.criado_em DESC`
      ),
      pool.query(
        `SELECT pct.*, pp.name AS provider_name
         FROM provider_custom_tags pct
         JOIN provider_profiles pp ON pp.id = pct.provider_profile_id
         WHERE pct.status <> 'removido'
         ORDER BY CASE WHEN pct.status = 'pendente' THEN 0 ELSE 1 END, pct.criado_em DESC
         LIMIT 100`
      ),
    ]);

    return {
      suggestions: suggestionsRes.rows,
      customTags: tagsRes.rows,
    };
  }

  async moderateSuggestion(input: {
    suggestionId: string;
    adminUserId?: string | null;
    decision:
      | 'aprovar_nova'
      | 'aprovar_sinonimo'
      | 'mesclar'
      | 'reprovar'
      | 'solicitar_correcao';
    targetSpecialtyId?: string;
    categoryId?: string;
    motivoRejeicao?: string;
  }) {
    await ensureSchemaAndSeed();

    const { rows: sugRows } = await pool.query(
      `SELECT * FROM specialty_suggestions WHERE id = $1::uuid LIMIT 1`,
      [input.suggestionId]
    );
    if (sugRows.length === 0) {
      throw new Error('Sugestão de especialidade não encontrada.');
    }
    const sug = sugRows[0];

    let updatedSuggestion: any = null;
    let createdOrLinkedSpecialty: any = null;

    if (input.decision === 'aprovar_nova') {
      const targetCatId = input.categoryId || sug.category_id;
      const slug = slugifyTaxonomyTerm(sug.nome_sugerido);

      // Verifica duplicidade antes de criar
      const { rows: existingSpec } = await pool.query(
        `SELECT * FROM specialties WHERE slug = $1 LIMIT 1`,
        [slug]
      );
      if (existingSpec.length > 0) {
        throw new Error(
          `Já existe a especialidade oficial "${existingSpec[0].nome}" com este slug. Utilize a opção de mesclar/sinônimo.`
        );
      }

      const { rows: insSpec } = await pool.query(
        `INSERT INTO specialties (
          category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por
        ) VALUES ($1::uuid, $2, $3, $4, $5, true, true, $6)
        RETURNING *`,
        [
          targetCatId,
          sug.nome_sugerido,
          slug,
          sug.descricao || '',
          [normalizeTaxonomyTerm(sug.nome_sugerido)],
          input.adminUserId || 'admin',
        ]
      );
      createdOrLinkedSpecialty = insSpec[0];

      // Vincula ao prestador se houver espaço no limite ou apenas sincroniza
      await pool.query(
        `INSERT INTO provider_specialties (provider_profile_id, specialty_id, especialidade_principal)
         VALUES ($1, $2::uuid, false)
         ON CONFLICT (provider_profile_id, specialty_id) DO NOTHING`,
        [sug.provider_profile_id, createdOrLinkedSpecialty.id]
      );

      await this.syncProviderSpecialtiesArray(sug.provider_profile_id);

      const { rows: updSug } = await pool.query(
        `UPDATE specialty_suggestions
         SET status = 'aprovada',
             specialty_id_criada = $2::uuid,
             revisado_por = $3,
             revisado_em = NOW(),
             atualizado_em = NOW()
         WHERE id = $1::uuid
         RETURNING *`,
        [sug.id, createdOrLinkedSpecialty.id, input.adminUserId || null]
      );
      updatedSuggestion = updSug[0];
    } else if (
      input.decision === 'aprovar_sinonimo' ||
      input.decision === 'mesclar'
    ) {
      if (!input.targetSpecialtyId) {
        throw new Error(
          'Informe a especialidade oficial existente para vincular como sinônimo ou mesclagem.'
        );
      }
      const { rows: targetRows } = await pool.query(
        `SELECT * FROM specialties WHERE id = $1::uuid LIMIT 1`,
        [input.targetSpecialtyId]
      );
      if (targetRows.length === 0) {
        throw new Error('Especialidade oficial de destino não encontrada.');
      }
      const targetSpec = targetRows[0];
      const normalizedAlias = normalizeTaxonomyTerm(sug.nome_sugerido);
      const currentSynonyms: string[] = Array.isArray(targetSpec.sinonimos)
        ? targetSpec.sinonimos
        : [];
      const mergedSynonyms = Array.from(
        new Set([...currentSynonyms, normalizedAlias])
      );

      const { rows: updSpec } = await pool.query(
        `UPDATE specialties
         SET sinonimos = $2,
             atualizado_em = NOW()
         WHERE id = $1::uuid
         RETURNING *`,
        [targetSpec.id, mergedSynonyms]
      );
      createdOrLinkedSpecialty = updSpec[0];

      await pool.query(
        `INSERT INTO provider_specialties (provider_profile_id, specialty_id, especialidade_principal)
         VALUES ($1, $2::uuid, false)
         ON CONFLICT (provider_profile_id, specialty_id) DO NOTHING`,
        [sug.provider_profile_id, targetSpec.id]
      );
      await this.syncProviderSpecialtiesArray(sug.provider_profile_id);

      const { rows: updSug } = await pool.query(
        `UPDATE specialty_suggestions
         SET status = 'convertida',
             specialty_pai_id = $2::uuid,
             revisado_por = $3,
             revisado_em = NOW(),
             atualizado_em = NOW()
         WHERE id = $1::uuid
         RETURNING *`,
        [sug.id, targetSpec.id, input.adminUserId || null]
      );
      updatedSuggestion = updSug[0];
    } else {
      const reason = sanitizeUserText(input.motivoRejeicao || '');
      if (reason.length < 4) {
        throw new Error(
          'Informe um motivo claro para orientar o prestador na reprovação/correção.'
        );
      }
      const nextStatus =
        input.decision === 'solicitar_correcao'
          ? 'correcao_solicitada'
          : 'reprovada';

      const { rows: updSug } = await pool.query(
        `UPDATE specialty_suggestions
         SET status = $2,
             motivo_rejeicao = $3,
             revisado_por = $4,
             revisado_em = NOW(),
             atualizado_em = NOW()
         WHERE id = $1::uuid
         RETURNING *`,
        [sug.id, nextStatus, reason, input.adminUserId || null]
      );
      updatedSuggestion = updSug[0];
    }

    await pool.query(
      `INSERT INTO audit_logs (
        actor_user_id, actor_role, action, target_type, target_id, metadata_json
      ) VALUES ($1, 'admin', 'taxonomy_suggestion_moderated', 'specialty_suggestion', $2, $3::jsonb)`,
      [
        input.adminUserId || null,
        sug.id,
        JSON.stringify({
          decision: input.decision,
          nomeSugerido: sug.nome_sugerido,
          targetSpecialtyId: input.targetSpecialtyId || null,
          motivoRejeicao: input.motivoRejeicao || null,
        }),
      ]
    );

    return {
      suggestion: updatedSuggestion,
      specialty: createdOrLinkedSpecialty,
    };
  }

  async moderateCustomTag(input: {
    tagId: string;
    adminUserId?: string | null;
    status: 'aprovado' | 'reprovado' | 'removido';
    motivo?: string;
  }) {
    await ensureSchemaAndSeed();
    const { rows } = await pool.query(
      `UPDATE provider_custom_tags
       SET status = $2,
           motivo_moderacao = $3
       WHERE id = $1::uuid
       RETURNING *`,
      [input.tagId, input.status, sanitizeUserText(input.motivo || '')]
    );
    if (rows.length === 0) {
      throw new Error('Tag não encontrada.');
    }

    await pool.query(
      `INSERT INTO audit_logs (
        actor_user_id, actor_role, action, target_type, target_id, metadata_json
      ) VALUES ($1, 'admin', 'custom_tag_moderated', 'provider_custom_tag', $2, $3::jsonb)`,
      [
        input.adminUserId || null,
        input.tagId,
        JSON.stringify({ status: input.status, motivo: input.motivo || null }),
      ]
    );

    return rows[0];
  }

  private async syncProviderSpecialtiesArray(providerProfileId: string) {
    const { rows } = await pool.query<{ nome: string }>(
      `SELECT s.nome
       FROM provider_specialties ps
       JOIN specialties s ON s.id = ps.specialty_id
       WHERE ps.provider_profile_id = $1 AND s.ativo = true AND s.oficial = true
       ORDER BY ps.especialidade_principal DESC, s.nome ASC`,
      [providerProfileId]
    );
    const names = rows.map((r) => r.nome);
    await pool.query(
      `UPDATE provider_profiles SET specialties = $2, updated_at = NOW() WHERE id = $1`,
      [providerProfileId, names]
    );
  }
}
