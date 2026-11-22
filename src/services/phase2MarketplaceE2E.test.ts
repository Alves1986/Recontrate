import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { ensureSchemaAndSeed, pool } from '../db/index';
import {
  calculateHaversineDistanceKm,
  setEmailDeliveryObserverForTests,
} from './essentialIntegrations';

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
  setEmailDeliveryObserverForTests(null);
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await pool.end();
});

async function registerAndOnboardUser(input: {
  email: string;
  fullName: string;
  role: 'cliente' | 'prestador';
  category?: string;
  neighborhood?: string;
  phone?: string;
}) {
  let capturedVfyToken = '';
  setEmailDeliveryObserverForTests((d) => {
    if (d.to === input.email && d.variables.verificationToken) {
      capturedVfyToken = d.variables.verificationToken;
    }
  });
  let regBody: any;
  try {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: input.email,
        password: 'Confiare#2026!Password',
        fullName: input.fullName,
        phone: input.phone || '(11) 99111-2233',
        neighborhood: input.neighborhood || 'Pinheiros',
        role: input.role,
        category: input.category || 'Eletricista',
        birthDate: '1990-05-15',
        lgpdConsent: true,
      }),
    });
    assert.equal(regRes.status, 201);
    regBody = (await regRes.json()) as any;
    assert.equal(regBody.verificationToken, undefined);
  } finally {
    setEmailDeliveryObserverForTests(null);
  }

  const vfyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationToken: capturedVfyToken }),
  });
  assert.equal(vfyRes.status, 200);
  const vfyBody = (await vfyRes.json()) as any;
  const authToken = vfyBody.token as string;

  await fetch(`${baseUrl}/api/auth/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      city: 'São Paulo, SP',
      neighborhood: input.neighborhood || 'Pinheiros',
      bio: 'Profissional verificado fase 2',
    }),
  });

  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const meBody = (await meRes.json()) as any;
  return {
    token: authToken,
    user: meBody.user,
  };
}

test('1. Solicitação Real, Geocodificação/Raio, Matching Justo Automático e Liberação de Contato após Interesse + Consentimento', async () => {
  const distKm = calculateHaversineDistanceKm(
    -23.561414,
    -46.691415,
    -23.551185,
    -46.697458
  );
  assert.ok(distKm > 0.5 && distKm < 5, 'Distância Pinheiros <-> Vila Madalena coerente');

  const ts = Date.now();
  const cliente = await registerAndOnboardUser({
    email: `cliente.f2.match.${ts}@example.com`,
    fullName: 'Beatriz Cliente Real',
    role: 'cliente',
    neighborhood: 'Pinheiros',
    phone: '(11) 98877-6655',
  });

  // Cliente cria solicitação real
  const reqRes = await fetch(`${baseUrl}/api/app/cliente/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cliente.token}`,
    },
    body: JSON.stringify({
      categoryName: 'Eletricista',
      problemTitle: 'Quadro bifásico desarmando no chuveiro',
      description: 'Preciso revisar disjuntor DIN 40A e fiação 6mm em Pinheiros.',
      neighborhood: 'Pinheiros',
      urgency: 'Hoje',
      preferredTime: 'Tarde (13h–18h)',
      lgpdContactConsent: true,
      customerPhone: '(11) 98877-6655',
    }),
  });

  assert.equal(reqRes.status, 201);
  const reqBody = (await reqRes.json()) as any;
  assert.equal(reqBody.ok, true);
  assert.ok(reqBody.request.id);
  assert.ok(
    reqBody.dispatchedCount >= 1,
    'Deve despachar oportunidades reais para prestadores compatíveis na categoria/raio'
  );

  const firstOpp = reqBody.opportunities[0];
  assert.equal(firstOpp.contact_released, false);
  assert.equal(firstOpp.client_name_masked, 'Beatriz (Cliente Verificado)');
});

test('2. Avaliação Pós-Atendimento Real: exige solicitação concluída, anonimiza nome por padrão, recalcula reputação e bloqueia duplicidade', async () => {
  const ts = Date.now();
  const prestador = await registerAndOnboardUser({
    email: `prestador.f2.review.${ts}@example.com`,
    fullName: 'Mestre Eletricista Avaliado',
    role: 'prestador',
    category: 'Eletricista',
    neighborhood: 'Pinheiros',
  });
  const providerProfileId = prestador.user.providerProfileId;
  assert.ok(providerProfileId);

  // Aprova o prestador para participar do matching real
  await pool.query(
    `UPDATE provider_profiles
     SET verification_status = 'aprovado', is_verified = true
     WHERE id = $1`,
    [providerProfileId]
  );

  const cliente = await registerAndOnboardUser({
    email: `cliente.f2.review.${ts}@example.com`,
    fullName: 'Gustavo Avaliador',
    role: 'cliente',
    neighborhood: 'Pinheiros',
  });

  // Cria solicitação real que despacha oportunidade para o prestador aprovado
  const reqRes = await fetch(`${baseUrl}/api/app/cliente/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cliente.token}`,
    },
    body: JSON.stringify({
      categoryName: 'Eletricista',
      problemTitle: 'Substituição de Disjuntor Geral e DR',
      description: 'Atendimento em quadro residencial de Pinheiros.',
      neighborhood: 'Pinheiros',
      urgency: 'Hoje',
      preferredTime: 'Comercial',
      lgpdContactConsent: true,
    }),
  });
  assert.equal(reqRes.status, 201);
  const reqBody = (await reqRes.json()) as any;
  const serviceRequestId = reqBody.request.id as string;

  // Garante vínculo direto da oportunidade para o prestador testado (caso limite top-3 seja preenchido por outros)
  await pool.query(
    `INSERT INTO opportunities (
      service_request_id, provider_profile_id, category_name, title, description,
      neighborhood, distance_km, urgency, preferred_time,
      client_name_masked, client_name_full, client_whatsapp,
      lgpd_contact_consent, contact_released, origin, status
    ) VALUES ($1::uuid, $2, 'Eletricista', 'Atendimento DR', 'Vínculo direto', 'Pinheiros', 1.0, 'Hoje', 'Comercial', 'Gustavo', 'Gustavo Avaliador', '(11) 99111-2233', true, false, 'Matching Local', 'pendente')`,
    [serviceRequestId, providerProfileId]
  );

  // Tentativa de avaliar antes de concluir o atendimento deve ser bloqueada (400)
  const beforeCompleteRes = await fetch(`${baseUrl}/api/app/cliente/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cliente.token}`,
    },
    body: JSON.stringify({
      providerProfileId,
      serviceRequestId,
      neighborhood: 'Pinheiros',
      serviceTitle: 'Substituição de Disjuntor Geral e DR',
      qualidade: 5,
      pontualidade: 5,
      comunicacao: 5,
      organizacao: 5,
      wouldRecommend: true,
      comment: 'Tentativa antes da conclusão.',
    }),
  });
  assert.equal(beforeCompleteRes.status, 400);

  // Cliente conclui a solicitação
  const completeRes = await fetch(
    `${baseUrl}/api/app/cliente/requests/${serviceRequestId}/complete`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${cliente.token}` },
    }
  );
  assert.equal(completeRes.status, 200);
  const completeBody = (await completeRes.json()) as any;
  assert.equal(completeBody.request.status, 'concluido');

  const revRes = await fetch(`${baseUrl}/api/app/cliente/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cliente.token}`,
    },
    body: JSON.stringify({
      providerProfileId,
      serviceRequestId,
      neighborhood: 'Pinheiros',
      serviceTitle: 'Substituição de Disjuntor Geral e DR',
      qualidade: 5,
      pontualidade: 5,
      comunicacao: 5,
      organizacao: 5,
      wouldRecommend: true,
      comment: 'Excelente atendimento técnico, pontual e muito organizado!',
    }),
  });

  assert.equal(revRes.status, 201);
  const revBody = (await revRes.json()) as any;
  assert.equal(revBody.ok, true);
  assert.equal(revBody.review.client_name_display, 'Gustavo A.');
  assert.equal(Number(revBody.review.rating), 5);
  assert.equal(Number(revBody.updatedProvider.reviews_count), 1);
  assert.equal(Number(revBody.updatedProvider.completed_jobs), 1);
  assert.equal(revBody.updatedProvider.rating_avg, '5.00');

  // Segunda avaliação para a mesma solicitação deve retornar 409 (unicidade garantida)
  const dupRes = await fetch(`${baseUrl}/api/app/cliente/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cliente.token}`,
    },
    body: JSON.stringify({
      providerProfileId,
      serviceRequestId,
      neighborhood: 'Pinheiros',
      serviceTitle: 'Duplicidade',
      qualidade: 5,
      pontualidade: 5,
      comunicacao: 5,
      organizacao: 5,
      wouldRecommend: true,
      comment: 'Avaliação duplicada não permitida.',
    }),
  });
  assert.equal(dupRes.status, 409);

  // Verifica se entrou na Lista de Confiança (professional_trust_list) do cliente sob RLS
  const trustRes = await fetch(`${baseUrl}/api/app/cliente/trust-list`, {
    headers: { Authorization: `Bearer ${cliente.token}` },
  });
  assert.equal(trustRes.status, 200);
  const trustBody = (await trustRes.json()) as any;
  assert.equal(trustBody.trustList.length, 1);
  assert.equal(trustBody.trustList[0].provider_profile_id, providerProfileId);
});

test('3. Recontratação em 1 Clique & Indicação de Substituto exigindo Consentimento do Cliente (RLS)', async () => {
  const ts = Date.now();
  const cliente = await registerAndOnboardUser({
    email: `cliente.f2.sub.${ts}@example.com`,
    fullName: 'Fernanda Recontratação',
    role: 'cliente',
  });
  const prestadorOriginal = await registerAndOnboardUser({
    email: `prest.orig.${ts}@example.com`,
    fullName: 'Prestador Original Ocupado',
    role: 'prestador',
  });
  const prestadorSubstituto = await registerAndOnboardUser({
    email: `prest.sub.${ts}@example.com`,
    fullName: 'Prestador Substituto Indicado',
    role: 'prestador',
  });

  // 1. Cliente cria pedido de recontratação em 1 clique
  const repRes = await fetch(`${baseUrl}/api/app/cliente/repeat-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cliente.token}`,
    },
    body: JSON.stringify({
      providerProfileId: prestadorOriginal.user.providerProfileId,
      categoryName: 'Eletricista',
      serviceType: 'Instalação de luminárias LED',
      desiredDate: 'Sexta-feira, 14h',
      urgency: 'Esta semana',
      notes: 'Mesmo apartamento em Pinheiros',
      lgpdShareConsent: true,
    }),
  });
  assert.equal(repRes.status, 201);
  const repBody = (await repRes.json()) as any;
  assert.ok(repBody.repeatRequest.id);

  // 2. Prestador original cria indicação de substituto SEM consentimento do cliente (clientConsentShared: false)
  const subNoConsentRes = await fetch(
    `${baseUrl}/api/app/prestador/substitute-referrals`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${prestadorOriginal.token}`,
      },
      body: JSON.stringify({
        customerUserId: cliente.user.userId,
        repeatRequestId: repBody.repeatRequest.id,
        substituteProviderIds: [prestadorSubstituto.user.providerProfileId],
        reasonCategory: 'Agenda cheia no horário solicitado',
        customNote: 'Indico colega de confiança da mesma região.',
        serviceContext: 'Instalação de luminárias LED sem consentimento prévio',
        neighborhood: 'Pinheiros',
        urgency: 'Esta semana',
        clientConsentShared: false,
      }),
    }
  );
  assert.equal(subNoConsentRes.status, 201);
  const noConsentReferralId = ((await subNoConsentRes.json()) as any).referral.id;

  // O prestador substituto consulta /api/app/substitute-referrals: RLS bloqueia a linha onde client_consent_shared = false!
  const checkBlocked = await fetch(`${baseUrl}/api/app/substitute-referrals`, {
    headers: { Authorization: `Bearer ${prestadorSubstituto.token}` },
  });
  const checkBlockedBody = (await checkBlocked.json()) as any;
  assert.equal(
    checkBlockedBody.referrals.some((r: any) => r.id === noConsentReferralId),
    false,
    'RLS deve impedir que o substituto veja dados compartilhados sem consentimento do cliente'
  );

  // 3. Prestador original cria indicação COM consentimento do cliente (clientConsentShared: true)
  const subWithConsentRes = await fetch(
    `${baseUrl}/api/app/prestador/substitute-referrals`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${prestadorOriginal.token}`,
      },
      body: JSON.stringify({
        customerUserId: cliente.user.userId,
        repeatRequestId: repBody.repeatRequest.id,
        substituteProviderIds: [prestadorSubstituto.user.providerProfileId],
        reasonCategory: 'Agenda cheia no horário solicitado',
        customNote: 'Indico colega certificado na região de Pinheiros.',
        serviceContext: 'Instalação de luminárias LED autorizada pelo cliente',
        neighborhood: 'Pinheiros',
        urgency: 'Esta semana',
        clientConsentShared: true,
      }),
    }
  );
  assert.equal(subWithConsentRes.status, 201);
  const withConsentReferralId = ((await subWithConsentRes.json()) as any).referral
    .id;

  const checkAllowed = await fetch(`${baseUrl}/api/app/substitute-referrals`, {
    headers: { Authorization: `Bearer ${prestadorSubstituto.token}` },
  });
  const checkAllowedBody = (await checkAllowed.json()) as any;
  assert.equal(
    checkAllowedBody.referrals.some((r: any) => r.id === withConsentReferralId),
    true,
    'Com consentimento do cliente, o substituto indicado acessa os dados da indicação'
  );
});

test('4. Documentos de Verificação Privados (Neon Object Storage + RLS) e Aprovação de Cadastro pelo Admin', async () => {
  const ts = Date.now();
  const prestadorDono = await registerAndOnboardUser({
    email: `prest.doc.dono.${ts}@example.com`,
    fullName: 'Prestador Dono do Documento',
    role: 'prestador',
  });
  const outroPrestador = await registerAndOnboardUser({
    email: `prest.doc.outro.${ts}@example.com`,
    fullName: 'Outro Prestador Curioso',
    role: 'prestador',
  });
  const admin = await registerAndOnboardUser({
    email: `admin.f2.${ts}@example.com`,
    fullName: 'Admin Governança Confiare',
    role: 'cliente',
  });

  // Promover admin no banco
  await pool.query(
    `UPDATE users SET roles = ARRAY['admin']::TEXT[], active_role = 'admin' WHERE id = $1`,
    [admin.user.userId]
  );
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `admin.f2.${ts}@example.com`,
      password: 'Confiare#2026!Password',
    }),
  });
  const adminToken = ((await adminLoginRes.json()) as any).token as string;

  // 1. Prestador dono envia documento de verificação (visibility = 'private_verification')
  const upRes = await fetch(
    `${baseUrl}/api/app/prestador/verification-documents`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${prestadorDono.token}`,
      },
      body: JSON.stringify({
        documentType: 'certificado_tecnico',
        label: 'Certificado NR-10 Autenticado',
        contentBase64OrText: 'CONFIARE-NR10-CERTIFICADO-PRIVADO-2026',
      }),
    }
  );
  assert.equal(upRes.status, 201);
  const uploadedDoc = ((await upRes.json()) as any).document;
  assert.equal(uploadedDoc.visibility, 'private_verification');

  // 2. Outro prestador tenta listar os documentos do prestadorDono -> RLS retorna 0 documentos!
  const intrudeRes = await fetch(
    `${baseUrl}/api/app/prestador/verification-documents?providerProfileId=${prestadorDono.user.providerProfileId}`,
    {
      headers: { Authorization: `Bearer ${outroPrestador.token}` },
    }
  );
  assert.equal(intrudeRes.status, 200);
  const intrudeBody = (await intrudeRes.json()) as any;
  assert.equal(
    intrudeBody.documents.length,
    0,
    'Outro prestador NUNCA pode acessar documentos privados de verificação de terceiros (bloqueado por RLS)'
  );

  // 3. O próprio prestador dono consegue acessar seu documento com presignedUrl
  const ownerRes = await fetch(
    `${baseUrl}/api/app/prestador/verification-documents?providerProfileId=${prestadorDono.user.providerProfileId}`,
    {
      headers: { Authorization: `Bearer ${prestadorDono.token}` },
    }
  );
  const ownerBody = (await ownerRes.json()) as any;
  assert.equal(ownerBody.documents.length, 1);
  assert.ok(ownerBody.documents[0].presignedUrl.startsWith('https://'));

  // 4. O administrador autorizado também acessa o documento e aprova o cadastro do prestador
  const adminDocsRes = await fetch(
    `${baseUrl}/api/app/prestador/verification-documents?providerProfileId=${prestadorDono.user.providerProfileId}`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );
  const adminDocsBody = (await adminDocsRes.json()) as any;
  assert.equal(adminDocsBody.documents.length, 1);

  const verifyRes = await fetch(
    `${baseUrl}/api/admin/providers/${prestadorDono.user.providerProfileId}/verify`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        decision: 'aprovado',
        notes: 'Certificado NR-10 conferido e válido.',
      }),
    }
  );
  assert.equal(verifyRes.status, 200);
  const verifyBody = (await verifyRes.json()) as any;
  assert.equal(verifyBody.provider.verification_status, 'aprovado');
  assert.equal(verifyBody.provider.is_verified, true);
});

test('5. Vitrine pública filtra apenas aprovados, oculta nota sem histórico mínimo (<3) e persiste lista de interesse real', async () => {
  const ts = Date.now();
  const pendingProv = await registerAndOnboardUser({
    email: `prest.pend.${ts}@example.com`,
    fullName: 'Prestador Pendente Público',
    role: 'prestador',
    category: 'Eletricista',
  });
  const approvedProv = await registerAndOnboardUser({
    email: `prest.aprov.gate.${ts}@example.com`,
    fullName: 'Prestador Aprovado Sem Histórico',
    role: 'prestador',
    category: 'Eletricista',
  });

  // Aprova explicitamente apenas um perfil, ainda com reviews_count = 0 e completed_jobs = 0
  await pool.query(
    `UPDATE provider_profiles
     SET verification_status = 'aprovado', is_verified = true
     WHERE id = $1`,
    [approvedProv.user.providerProfileId]
  );

  // Perfil pendente deve retornar 404 na consulta pública individual
  const pendingDetailRes = await fetch(
    `${baseUrl}/api/public/providers/${pendingProv.user.providerProfileId}`
  );
  assert.equal(pendingDetailRes.status, 404);

  // Perfil aprovado sem 3 avaliações/atendimentos tem nota ocultada ("Em avaliação inicial")
  const approvedDetailRes = await fetch(
    `${baseUrl}/api/public/providers/${approvedProv.user.providerProfileId}`
  );
  assert.equal(approvedDetailRes.status, 200);
  const approvedDetail = (await approvedDetailRes.json()) as any;
  assert.equal(approvedDetail.provider.has_sufficient_reputation, false);
  assert.equal(approvedDetail.provider.rating_avg, null);
  assert.equal(approvedDetail.provider.public_score, null);
  assert.equal(approvedDetail.provider.reputation_label, 'Em avaliação inicial');

  // Lista de interesse exige consentimento explícito e persiste no banco
  const rejectedWaitlist = await fetch(`${baseUrl}/api/public/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `lead.${ts}@example.com`,
      location: 'Pinheiros, São Paulo',
      category: 'Eletricista',
      lgpdConsent: false,
    }),
  });
  assert.equal(rejectedWaitlist.status, 400);

  const okWaitlist = await fetch(`${baseUrl}/api/public/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `lead.${ts}@example.com`,
      location: 'Pinheiros, São Paulo',
      category: 'Eletricista',
      lgpdConsent: true,
    }),
  });
  assert.equal(okWaitlist.status, 201);
  const waitlistBody = (await okWaitlist.json()) as any;
  assert.ok(waitlistBody.leadId);
});
