import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { ensureSchemaAndSeed, pool } from '../db/index';

let server: Server;
let baseUrl: string;

test.before(async () => {
  await ensureSchemaAndSeed();
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await pool.end();
});

async function createProviderAndAdminTokens() {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const password = 'Confiare#2026!Password';

  const provEmail = `prov.spec.${ts}@example.com`;
  const regProv = (await (
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: provEmail,
        password,
        fullName: `Prestador Taxonomia ${ts}`,
        phone: '(11) 99123-4455',
        neighborhood: 'Pinheiros',
        role: 'prestador',
        category: 'Elétrica',
        lgpdConsent: true,
      }),
    })
  ).json()) as any;
  await fetch(`${baseUrl}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationToken: regProv.verificationToken }),
  });

  const adminEmail = `admin.spec.${ts}@example.com`;
  const regAdmin = (await (
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password,
        fullName: 'Admin Taxonomia Confiare',
        phone: '(11) 99123-0001',
        neighborhood: 'Pinheiros',
        role: 'cliente',
        lgpdConsent: true,
      }),
    })
  ).json()) as any;
  await fetch(`${baseUrl}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationToken: regAdmin.verificationToken }),
  });
  await pool.query(
    `UPDATE users SET roles = ARRAY['admin']::TEXT[], active_role = 'admin', onboarding_completed = true WHERE id = $1`,
    [regAdmin.user.userId]
  );
  const loginAdmin = (await (
    await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password }),
    })
  ).json()) as any;

  return {
    providerToken: regProv.token as string,
    providerProfileId: regProv.user.providerProfileId as string,
    adminToken: loginAdmin.token as string,
  };
}

test('1. Seed de 10 categorias e 81 especialidades oficiais + Autocomplete com sinônimos', async () => {
  const res = await fetch(`${baseUrl}/api/taxonomy/categories`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  assert.equal(body.ok, true);
  assert.equal(body.categories.length, 10);

  const totalSpecs = body.categories.reduce(
    (acc: number, c: any) => acc + (c.specialties?.length || 0),
    0
  );
  assert.ok(
    totalSpecs >= 81,
    `Esperado >= 81 especialidades oficiais no catálogo, encontrado ${totalSpecs}`
  );

  // Busca por sinônimo "troca de chuveiro" deve apontar para "Instalação de chuveiro"
  const searchRes = await fetch(
    `${baseUrl}/api/taxonomy/specialties?q=${encodeURIComponent(
      'troca de chuveiro'
    )}`
  );
  const searchBody = (await searchRes.json()) as any;
  assert.ok(
    searchBody.specialties.some((s: any) => s.nome === 'Instalação de chuveiro')
  );
});

test('2. Limite de 5 especialidades oficiais, bloqueios de duplicidade/genérico/ofensivo e limite de 3 sugestões pendentes', async () => {
  const { providerToken } = await createProviderAndAdminTokens();
  const catBody = (await (
    await fetch(`${baseUrl}/api/taxonomy/categories`)
  ).json()) as any;
  const eletrica = catBody.categories.find((c: any) => c.slug === 'eletrica');
  assert.ok(eletrica);

  // 2.1 Tentar selecionar 6 especialidades -> bloqueado (400)
  const sixIds = eletrica.specialties.slice(0, 6).map((s: any) => s.id);
  const tooManyRes = await fetch(`${baseUrl}/api/app/prestador/specialties`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({
      categoryId: eletrica.id,
      specialtyIds: sixIds,
    }),
  });
  assert.equal(tooManyRes.status, 400);

  // 2.2 Selecionar 2 especialidades oficiais -> sucesso (200)
  const validIds = eletrica.specialties.slice(0, 2).map((s: any) => s.id);
  const okSaveRes = await fetch(`${baseUrl}/api/app/prestador/specialties`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({
      categoryId: eletrica.id,
      specialtyIds: validIds,
    }),
  });
  assert.equal(okSaveRes.status, 200);

  // 2.3 Sugestão genérica ("outros", "diversos") e ofensiva/link -> bloqueadas (400)
  for (const invalidTerm of [
    'Outros',
    'Serviços diversos',
    'Instalação idiota de tomada',
    'Eletricista 11 99999-8888',
    'Manutenção preço mais barato R$ 10',
  ]) {
    const badRes = await fetch(
      `${baseUrl}/api/app/prestador/specialty-suggestions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({
          categoryId: eletrica.id,
          nomeSugerido: invalidTerm,
        }),
      }
    );
    assert.equal(
      badRes.status,
      400,
      `Termo inválido "${invalidTerm}" deveria ser bloqueado`
    );
  }

  // 2.4 Duplicidade com especialidade oficial (com variação de maiúsculas/acentos) -> bloqueada (400)
  const dupRes = await fetch(
    `${baseUrl}/api/app/prestador/specialty-suggestions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`,
      },
      body: JSON.stringify({
        categoryId: eletrica.id,
        nomeSugerido: 'Instalacao de Chuveiro',
      }),
    }
  );
  assert.equal(dupRes.status, 400);

  // 2.5 Limite de 3 sugestões pendentes: 3 válidas passam, a 4ª é bloqueada
  const alphaCode = Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 6) || 'conf';
  for (const idx of [1, 2, 3]) {
    const sugRes = await fetch(
      `${baseUrl}/api/app/prestador/specialty-suggestions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({
          categoryId: eletrica.id,
          nomeSugerido: `Automação cênica modelo ${idx} ${alphaCode}`,
        }),
      }
    );
    assert.equal(sugRes.status, 201);
  }

  const fourthSug = await fetch(
    `${baseUrl}/api/app/prestador/specialty-suggestions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`,
      },
      body: JSON.stringify({
        categoryId: eletrica.id,
        nomeSugerido: `Quarta sugestao bloqueada ${alphaCode}`,
      }),
    }
  );
  assert.equal(fourthSug.status, 400);
});

test('3. Sugestão pendente fora do perfil público/matching; tags livres (máx 10) e moderação Admin (aprovar, reprovar e mesclar)', async () => {
  const { providerToken, providerProfileId, adminToken } =
    await createProviderAndAdminTokens();

  // Admin aprova o cadastro do prestador para que ele participe do matching
  await fetch(`${baseUrl}/api/admin/providers/${providerProfileId}/verify`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ decision: 'aprovado' }),
  });

  const catBody = (await (
    await fetch(`${baseUrl}/api/taxonomy/categories`)
  ).json()) as any;
  const eletrica = catBody.categories.find((c: any) => c.slug === 'eletrica');
  const chuveiroSpec = eletrica.specialties.find(
    (s: any) => s.nome === 'Instalação de chuveiro'
  );

  // Seleciona especialidade oficial "Instalação de chuveiro"
  await fetch(`${baseUrl}/api/app/prestador/specialties`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({
      categoryId: eletrica.id,
      specialtyIds: [chuveiroSpec.id],
    }),
  });

  // Envia sugestão pendente única
  const ts = String(Date.now()).slice(-5);
  const alphaId = Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 6) || 'cenica';
  const pendingUniqueName = `Iluminacao cenica exclusiva ${alphaId}`;
  const sug1Http = await fetch(
    `${baseUrl}/api/app/prestador/specialty-suggestions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`,
      },
      body: JSON.stringify({
        categoryId: eletrica.id,
        nomeSugerido: pendingUniqueName,
        descricao: 'Projeto luminotécnico para ambientes comerciais.',
      }),
    }
  );
  assert.equal(sug1Http.status, 201);
  const sug1Res = (await sug1Http.json()) as any;
  const sug1Id = sug1Res.suggestion.id;

  // Envia outras duas sugestões para testar reprovação e mesclagem
  const rejectName = `Especialidade fora escopo ${alphaId}`;
  const sug2Http = await fetch(
    `${baseUrl}/api/app/prestador/specialty-suggestions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`,
      },
      body: JSON.stringify({
        categoryId: eletrica.id,
        nomeSugerido: rejectName,
      }),
    }
  );
  assert.equal(sug2Http.status, 201);
  const sug2Res = (await sug2Http.json()) as any;
  const sug2Id = sug2Res.suggestion.id;

  const mergeName = `Chuveiro Turbo ${alphaId}`;
  const sug3Http = await fetch(
    `${baseUrl}/api/app/prestador/specialty-suggestions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`,
      },
      body: JSON.stringify({
        categoryId: eletrica.id,
        nomeSugerido: mergeName,
      }),
    }
  );
  assert.equal(sug3Http.status, 201);
  const sug3Res = (await sug3Http.json()) as any;
  const sug3Id = sug3Res.suggestion.id;

  // Perfil público NÃO deve mostrar sugestão pendente
  const pubBefore = (await (
    await fetch(`${baseUrl}/api/public/providers/${providerProfileId}`)
  ).json()) as any;
  const pubSpecsBefore = pubBefore.provider.officialSpecialties.map(
    (s: any) => s.nome
  );
  assert.equal(pubSpecsBefore.includes(pendingUniqueName), false);
  assert.equal(pubSpecsBefore.includes('Instalação de chuveiro'), true);

  // Matching NÃO encontra pela sugestão pendente
  const matchPendingBefore = (await (
    await fetch(
      `${baseUrl}/api/public/providers/match?q=${encodeURIComponent(
        pendingUniqueName
      )}`
    )
  ).json()) as any;
  assert.equal(
    matchPendingBefore.matches.some(
      (m: any) => m.provider.id === providerProfileId
    ),
    false
  );

  // Tags livres: moderação bloqueia link/ofensa, aceita até 10 e bloqueia 11ª
  const badTagRes = await fetch(`${baseUrl}/api/app/prestador/custom-tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({ tag: 'contato@meusite.com.br' }),
  });
  assert.equal(badTagRes.status, 400);

  const uniqueApprovedTag = `cenografia-${ts}`;
  for (let i = 1; i <= 10; i++) {
    const tagText = i === 1 ? uniqueApprovedTag : `tag-eletrica-${i}-${ts}`;
    const tagRes = await fetch(`${baseUrl}/api/app/prestador/custom-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`,
      },
      body: JSON.stringify({ tag: tagText }),
    });
    assert.equal(tagRes.status, 201);
  }

  const eleventhTag = await fetch(`${baseUrl}/api/app/prestador/custom-tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({ tag: `tag-extra-11-${ts}` }),
  });
  assert.equal(eleventhTag.status, 400);

  // Matching encontra prestador por especialidade oficial e por tag aprovada
  const matchByOfficial = (await (
    await fetch(
      `${baseUrl}/api/public/providers/match?category=${encodeURIComponent(
        'Elétrica'
      )}&q=${encodeURIComponent('troca de chuveiro')}`
    )
  ).json()) as any;
  assert.equal(
    matchByOfficial.matches.some(
      (m: any) => m.provider.id === providerProfileId
    ),
    true
  );

  const matchByTag = (await (
    await fetch(
      `${baseUrl}/api/public/providers/match?q=${encodeURIComponent(
        uniqueApprovedTag
      )}`
    )
  ).json()) as any;
  assert.equal(
    matchByTag.matches.some((m: any) => m.provider.id === providerProfileId),
    true
  );

  // Admin aprova sug1 como nova especialidade oficial -> entra no catálogo e no perfil público
  const approveRes = await fetch(
    `${baseUrl}/api/admin/taxonomy/suggestions/${sug1Id}/moderate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ decision: 'aprovar_nova' }),
    }
  );
  assert.equal(approveRes.status, 200);

  // Admin reprova sug2 com motivo
  const rejectRes = await fetch(
    `${baseUrl}/api/admin/taxonomy/suggestions/${sug2Id}/moderate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        decision: 'reprovar',
        motivoRejeicao: 'Fora do escopo técnico da categoria elétrica.',
      }),
    }
  );
  assert.equal(rejectRes.status, 200);

  // Admin mescla sug3 como sinônimo de "Instalação de chuveiro"
  const mergeRes = await fetch(
    `${baseUrl}/api/admin/taxonomy/suggestions/${sug3Id}/moderate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        decision: 'aprovar_sinonimo',
        targetSpecialtyId: chuveiroSpec.id,
      }),
    }
  );
  assert.equal(mergeRes.status, 200);

  // Após aprovação, a nova especialidade aparece no perfil público e entra no matching
  const pubAfter = (await (
    await fetch(`${baseUrl}/api/public/providers/${providerProfileId}`)
  ).json()) as any;
  const pubSpecsAfter = pubAfter.provider.officialSpecialties.map(
    (s: any) => s.nome
  );
  assert.equal(pubSpecsAfter.includes(pendingUniqueName), true);

  const matchApprovedAfter = (await (
    await fetch(
      `${baseUrl}/api/public/providers/match?q=${encodeURIComponent(
        pendingUniqueName
      )}`
    )
  ).json()) as any;
  assert.equal(
    matchApprovedAfter.matches.some(
      (m: any) => m.provider.id === providerProfileId
    ),
    true
  );
});

test('4. Onboarding do Prestador exige escolha obrigatória de 1 a 5 especialidades oficiais antes de liberar acesso ao painel', async () => {
  const { providerToken } = await createProviderAndAdminTokens();

  // Tentar concluir onboarding com enforceOfficialSpecialties: true sem salvar especialidades -> 400
  const blockedOnboarding = await fetch(`${baseUrl}/api/auth/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({
      city: 'São Paulo, SP',
      neighborhood: 'Pinheiros',
      bio: 'Prestador em onboarding inicial.',
      enforceOfficialSpecialties: true,
    }),
  });
  assert.equal(blockedOnboarding.status, 400);

  // Salva 1 especialidade oficial via /api/app/prestador/specialties
  const catBody = (await (
    await fetch(`${baseUrl}/api/taxonomy/categories`)
  ).json()) as any;
  const eletrica = catBody.categories.find((c: any) => c.slug === 'eletrica');
  await fetch(`${baseUrl}/api/app/prestador/specialties`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({
      categoryId: eletrica.id,
      specialtyIds: [eletrica.specialties[0].id],
    }),
  });

  // Agora onboarding conclui com sucesso (200)
  const okOnboarding = await fetch(`${baseUrl}/api/auth/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({
      city: 'São Paulo, SP',
      neighborhood: 'Pinheiros',
      bio: 'Prestador com especialidade oficial configurada.',
      enforceOfficialSpecialties: true,
    }),
  });
  assert.equal(okOnboarding.status, 200);
  const okBody = (await okOnboarding.json()) as any;
  assert.equal(okBody.ok, true);
  assert.equal(okBody.redirectTo, '/app/prestador');
});
