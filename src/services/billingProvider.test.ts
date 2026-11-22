import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AsaasBillingAdapter,
  isValidCpfOrCnpj,
  mapAsaasEventToCanonical,
} from './billingProvider';

const VALID_TEST_CPF = '52998224725';

test('AsaasBillingAdapter implements all BillingProvider methods and enforces centavo integers & valid CPF/CNPJ', async () => {
  const adapter = new AsaasBillingAdapter({
    apiKey: '', // deterministic local mode for unit testing
    webhookToken: 'test_secret_token_123',
    allowLocalFallback: true,
  });

  // Must reject missing or invalid CPF/CNPJ (no hardcoded fallback CPF)
  assert.equal(isValidCpfOrCnpj(VALID_TEST_CPF), true);
  assert.equal(isValidCpfOrCnpj('11111111111'), false);
  await assert.rejects(
    async () =>
      adapter.createCustomer({
        providerProfileId: 'prov-no-cpf',
        name: 'Sem CPF',
        email: 'semcpf@example.com',
        phone: '(11) 99812-4401',
      }),
    /CPF ou CNPJ válido é obrigatório/
  );

  const customer = await adapter.createCustomer({
    providerProfileId: 'prov-joao',
    name: 'João Batista Silva',
    email: 'joao@confiare.com.br',
    phone: '(11) 99812-4401',
    cpfCnpj: VALID_TEST_CPF,
  });
  assert.ok(customer.gatewayCustomerId.startsWith('cus_asaas_'));

  const sub = await adapter.createSubscription({
    gatewayCustomerId: customer.gatewayCustomerId,
    planSlug: 'profissional',
    planName: 'Profissional',
    cycle: 'mensal',
    amountCents: 5990,
    paymentMethod: 'pix',
    nextDueDate: '2026-12-16',
    externalReference: 'sub-local-1',
  });
  assert.ok(sub.gatewaySubscriptionId.startsWith('sub_asaas_'));
  assert.equal(sub.status, 'pendente');

  const checkout = await adapter.createCheckoutSession({
    gatewayCustomerId: customer.gatewayCustomerId,
    subscriptionId: 'sub-local-1',
    planSlug: 'profissional',
    planName: 'Profissional',
    cycle: 'mensal',
    amountCents: 5990,
    paymentMethod: 'pix',
    dueDate: '2026-11-20',
  });
  assert.equal(checkout.amountCents, 5990);
  assert.ok(checkout.checkoutUrl.startsWith('https://'));

  const updated = await adapter.updateSubscription(sub.gatewaySubscriptionId, {
    amountCents: 9990,
    cycle: 'mensal',
    planSlug: 'premium',
  });
  assert.equal(updated.amountCents, 9990);

  const portal = await adapter.createBillingPortalSession(
    customer.gatewayCustomerId
  );
  assert.ok(portal.portalUrl.includes(customer.gatewayCustomerId));

  const invoice = await adapter.getInvoice(checkout.gatewayInvoiceId);
  assert.equal(invoice.gatewayInvoiceId, checkout.gatewayInvoiceId);

  const refund = await adapter.refundInvoice(checkout.gatewayInvoiceId, 5990);
  assert.equal(refund.status, 'estornada');
  assert.equal(refund.refundedAmountCents, 5990);

  const canceled = await adapter.cancelSubscription(sub.gatewaySubscriptionId);
  assert.equal(canceled.canceled, true);

  // Float values must be rejected
  await assert.rejects(
    async () =>
      adapter.createCheckoutSession({
        gatewayCustomerId: customer.gatewayCustomerId,
        subscriptionId: 'sub-float',
        planSlug: 'essencial',
        planName: 'Essencial',
        cycle: 'mensal',
        amountCents: 29.9, // invalid float
        paymentMethod: 'pix',
        dueDate: '2026-11-20',
      }),
    /Invalid monetary value in cents/
  );
});

test('AsaasBillingAdapter.handleWebhook validates signature and maps canonical events', async () => {
  const adapter = new AsaasBillingAdapter({
    apiKey: '',
    webhookToken: 'test_secret_token_123',
  });

  const payload = JSON.stringify({
    id: 'evt_asaas_001',
    event: 'PAYMENT_CONFIRMED',
    payment: {
      id: 'pay_001',
      subscription: 'sub_001',
      customer: 'cus_001',
      value: 59.9,
      billingType: 'PIX',
      externalReference: 'sub-local-1',
    },
  });

  // Reject missing or invalid token
  await assert.rejects(
    async () => adapter.handleWebhook(payload, {}),
    /Missing Asaas webhook signature token/
  );
  await assert.rejects(
    async () =>
      adapter.handleWebhook(payload, { 'asaas-access-token': 'wrong_token' }),
    /Invalid Asaas webhook signature token/
  );

  // Accept valid token and convert 59.90 to 5990 integer cents
  const parsed = await adapter.handleWebhook(payload, {
    'asaas-access-token': 'test_secret_token_123',
  });
  assert.equal(parsed.eventId, 'evt_asaas_001');
  assert.equal(parsed.canonicalEvent, 'invoice_paid');
  assert.equal(parsed.amountCents, 5990);
  assert.equal(parsed.paymentMethod, 'pix');
  assert.equal(parsed.payloadHash.length, 64);

  assert.equal(mapAsaasEventToCanonical('PAYMENT_OVERDUE'), 'invoice_payment_failed');
  assert.equal(mapAsaasEventToCanonical('SUBSCRIPTION_CREATED'), 'subscription_created');
  assert.equal(mapAsaasEventToCanonical('SUBSCRIPTION_DELETED'), 'subscription_canceled');
});

test('AsaasBillingAdapter fails closed in production/staging when ASAAS_API_KEY or ASAAS_WEBHOOK_TOKEN is absent', async () => {
  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const prodAdapter = new AsaasBillingAdapter({
      apiKey: '',
      webhookToken: '',
      allowLocalFallback: true, // ignored in production
    });

    await assert.rejects(
      async () =>
        prodAdapter.createCustomer({
          providerProfileId: 'prov-prod-1',
          name: 'Prestador Produção',
          email: 'prod@example.com',
          phone: '(11) 99812-4401',
          cpfCnpj: VALID_TEST_CPF,
        }),
      /ASAAS_API_KEY não configurada|fail-closed/
    );

    await assert.rejects(
      async () => prodAdapter.handleWebhook('{}', {}),
      /webhook signature token not configured/
    );
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});
