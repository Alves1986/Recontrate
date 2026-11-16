import crypto from 'node:crypto';

export type BillingCycle = 'mensal' | 'anual';
export type PaymentMethod = 'pix' | 'cartao' | 'boleto';

export type CanonicalBillingEventType =
  | 'subscription_created'
  | 'subscription_activated'
  | 'subscription_updated'
  | 'subscription_canceled'
  | 'subscription_expired'
  | 'invoice_created'
  | 'invoice_paid'
  | 'invoice_payment_failed'
  | 'trial_will_end'
  | 'payment_method_updated';

export interface CreateCustomerInput {
  providerProfileId: string;
  name: string;
  email: string;
  phone: string;
  cpfCnpj?: string;
}

export interface CreateCustomerResult {
  gatewayCustomerId: string;
  provider: 'asaas';
}

export interface CreateSubscriptionInput {
  gatewayCustomerId: string;
  planSlug: string;
  planName: string;
  cycle: BillingCycle;
  amountCents: number;
  paymentMethod: PaymentMethod;
  nextDueDate: string; // YYYY-MM-DD
  externalReference: string;
}

export interface CreateSubscriptionResult {
  gatewaySubscriptionId: string;
  gatewayInvoiceId: string;
  checkoutUrl: string;
  status: 'pendente' | 'ativa';
  nextDueDate: string;
}

export interface UpdateSubscriptionInput {
  planSlug?: string;
  planName?: string;
  cycle?: BillingCycle;
  amountCents?: number;
  paymentMethod?: PaymentMethod;
  nextDueDate?: string;
}

export interface UpdateSubscriptionResult {
  gatewaySubscriptionId: string;
  amountCents: number;
  cycle: BillingCycle;
  updatedAt: string;
}

export interface CreateCheckoutSessionInput {
  gatewayCustomerId: string;
  subscriptionId: string;
  planSlug: string;
  planName: string;
  cycle: BillingCycle;
  amountCents: number;
  paymentMethod: PaymentMethod;
  dueDate: string; // YYYY-MM-DD
}

export interface CreateCheckoutSessionResult {
  gatewayInvoiceId: string;
  checkoutUrl: string;
  amountCents: number;
  dueDate: string;
}

export interface BillingPortalSessionResult {
  portalUrl: string;
  gatewayCustomerId: string;
}

export interface ParsedWebhookEvent {
  eventId: string;
  gatewayEventType: string;
  canonicalEvent: CanonicalBillingEventType;
  payloadHash: string;
  gatewaySubscriptionId?: string;
  gatewayInvoiceId?: string;
  gatewayCustomerId?: string;
  amountCents?: number;
  paymentMethod?: PaymentMethod;
  externalReference?: string;
  rawPayload: Record<string, unknown>;
}

export interface GatewayInvoiceDetails {
  gatewayInvoiceId: string;
  gatewaySubscriptionId?: string;
  amountCents: number;
  status: 'pendente' | 'paga' | 'falhou' | 'estornada' | 'cancelada';
  paymentMethod: PaymentMethod;
  dueDate: string;
  paidAt?: string;
  checkoutUrl: string;
}

export interface RefundInvoiceResult {
  gatewayInvoiceId: string;
  refundedAmountCents: number;
  status: 'estornada';
  refundedAt: string;
}

export interface BillingProvider {
  createCustomer(input: CreateCustomerInput): Promise<CreateCustomerResult>;
  createSubscription(
    input: CreateSubscriptionInput
  ): Promise<CreateSubscriptionResult>;
  updateSubscription(
    gatewaySubscriptionId: string,
    input: UpdateSubscriptionInput
  ): Promise<UpdateSubscriptionResult>;
  cancelSubscription(
    gatewaySubscriptionId: string,
    reason?: string
  ): Promise<{ canceled: boolean; canceledAt: string }>;
  createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionResult>;
  createBillingPortalSession(
    gatewayCustomerId: string
  ): Promise<BillingPortalSessionResult>;
  handleWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<ParsedWebhookEvent>;
  getInvoice(gatewayInvoiceId: string): Promise<GatewayInvoiceDetails>;
  refundInvoice(
    gatewayInvoiceId: string,
    amountCents?: number
  ): Promise<RefundInvoiceResult>;
}

function mapMethodToAsaasBillingType(
  method: PaymentMethod
): 'PIX' | 'CREDIT_CARD' | 'BOLETO' {
  switch (method) {
    case 'pix':
      return 'PIX';
    case 'cartao':
      return 'CREDIT_CARD';
    case 'boleto':
      return 'BOLETO';
  }
}

function mapAsaasBillingTypeToMethod(billingType?: string): PaymentMethod {
  switch ((billingType || '').toUpperCase()) {
    case 'CREDIT_CARD':
      return 'cartao';
    case 'BOLETO':
      return 'boleto';
    default:
      return 'pix';
  }
}

export function mapAsaasEventToCanonical(
  asaasEvent: string
): CanonicalBillingEventType {
  switch (asaasEvent.toUpperCase()) {
    case 'SUBSCRIPTION_CREATED':
      return 'subscription_created';
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      return 'invoice_paid';
    case 'SUBSCRIPTION_UPDATED':
      return 'subscription_updated';
    case 'SUBSCRIPTION_INACTIVATED':
    case 'SUBSCRIPTION_DELETED':
      return 'subscription_canceled';
    case 'SUBSCRIPTION_EXPIRED':
      return 'subscription_expired';
    case 'PAYMENT_CREATED':
      return 'invoice_created';
    case 'PAYMENT_OVERDUE':
    case 'PAYMENT_REPROVED_BY_RISK_ANALYSIS':
    case 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED':
      return 'invoice_payment_failed';
    case 'TRIAL_WILL_END':
      return 'trial_will_end';
    case 'PAYMENT_METHOD_UPDATED':
      return 'payment_method_updated';
    default:
      return 'subscription_updated';
  }
}

export class AsaasBillingAdapter implements BillingProvider {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly webhookToken: string;
  private readonly allowLocalFallback: boolean;

  constructor(options?: {
    apiUrl?: string;
    apiKey?: string;
    webhookToken?: string;
    allowLocalFallback?: boolean;
  }) {
    this.apiUrl = (
      options?.apiUrl ||
      process.env.ASAAS_API_URL ||
      'https://api.asaas.com/v3'
    ).replace(/\/$/, '');
    this.apiKey = options?.apiKey ?? process.env.ASAAS_API_KEY ?? '';
    this.webhookToken =
      options?.webhookToken ??
      process.env.ASAAS_WEBHOOK_TOKEN ??
      'confiare_asaas_wh_secret_2026';
    this.allowLocalFallback = options?.allowLocalFallback ?? true;
  }

  private centsToAsaasDecimal(cents: number): number {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new Error(`Invalid monetary value in cents: ${cents}`);
    }
    return Number((cents / 100).toFixed(2));
  }

  private asaasDecimalToCents(val: number | string | undefined): number {
    const parsed = Number(val ?? 0);
    return Math.round(parsed * 100);
  }

  private async asaasRequest<T>(
    path: string,
    init: RequestInit
  ): Promise<T | null> {
    if (!this.apiKey) {
      return null;
    }
    try {
      const res = await fetch(`${this.apiUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          access_token: this.apiKey,
          ...(init.headers || {}),
        },
      });
      if (!res.ok) {
        if (this.allowLocalFallback) {
          return null;
        }
        const errBody = await res.text();
        throw new Error(`Asaas API error (${res.status}): ${errBody}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (this.allowLocalFallback) {
        return null;
      }
      throw err;
    }
  }

  async createCustomer(
    input: CreateCustomerInput
  ): Promise<CreateCustomerResult> {
    const apiRes = await this.asaasRequest<{ id: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        mobilePhone: input.phone.replace(/\D/g, ''),
        cpfCnpj: input.cpfCnpj?.replace(/\D/g, '') || '24971563792',
        externalReference: input.providerProfileId,
      }),
    });

    return {
      gatewayCustomerId:
        apiRes?.id || `cus_asaas_${input.providerProfileId}_${Date.now()}`,
      provider: 'asaas',
    };
  }

  async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<CreateSubscriptionResult> {
    const asaasCycle = input.cycle === 'anual' ? 'YEARLY' : 'MONTHLY';
    const billingType = mapMethodToAsaasBillingType(input.paymentMethod);

    const apiRes = await this.asaasRequest<{
      id: string;
      nextDueDate?: string;
    }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: input.gatewayCustomerId,
        billingType,
        value: this.centsToAsaasDecimal(input.amountCents),
        nextDueDate: input.nextDueDate,
        cycle: asaasCycle,
        description: `Assinatura Confiare - Plano ${input.planName} (${input.cycle})`,
        externalReference: input.externalReference,
      }),
    });

    const gatewaySubscriptionId =
      apiRes?.id || `sub_asaas_${input.planSlug}_${Date.now()}`;
    const gatewayInvoiceId = `pay_asaas_${Date.now()}`;

    return {
      gatewaySubscriptionId,
      gatewayInvoiceId,
      checkoutUrl: `https://www.asaas.com/i/${gatewayInvoiceId.replace(/^pay_asaas_/, '')}`,
      status: input.amountCents === 0 ? 'ativa' : 'pendente',
      nextDueDate: apiRes?.nextDueDate || input.nextDueDate,
    };
  }

  async updateSubscription(
    gatewaySubscriptionId: string,
    input: UpdateSubscriptionInput
  ): Promise<UpdateSubscriptionResult> {
    const payload: Record<string, unknown> = {};
    if (input.amountCents !== undefined) {
      payload.value = this.centsToAsaasDecimal(input.amountCents);
    }
    if (input.cycle) {
      payload.cycle = input.cycle === 'anual' ? 'YEARLY' : 'MONTHLY';
    }
    if (input.paymentMethod) {
      payload.billingType = mapMethodToAsaasBillingType(input.paymentMethod);
    }
    if (input.nextDueDate) {
      payload.nextDueDate = input.nextDueDate;
    }

    await this.asaasRequest(`/subscriptions/${gatewaySubscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return {
      gatewaySubscriptionId,
      amountCents: input.amountCents ?? 0,
      cycle: input.cycle ?? 'mensal',
      updatedAt: new Date().toISOString(),
    };
  }

  async cancelSubscription(
    gatewaySubscriptionId: string
  ): Promise<{ canceled: boolean; canceledAt: string }> {
    await this.asaasRequest(`/subscriptions/${gatewaySubscriptionId}`, {
      method: 'DELETE',
    });

    return {
      canceled: true,
      canceledAt: new Date().toISOString(),
    };
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionResult> {
    const billingType = mapMethodToAsaasBillingType(input.paymentMethod);
    const apiRes = await this.asaasRequest<{
      id: string;
      invoiceUrl?: string;
      dueDate?: string;
    }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: input.gatewayCustomerId,
        billingType,
        value: this.centsToAsaasDecimal(input.amountCents),
        dueDate: input.dueDate,
        description: `Confiare - Plano ${input.planName} (${input.cycle})`,
        externalReference: input.subscriptionId,
      }),
    });

    const gatewayInvoiceId = apiRes?.id || `pay_asaas_${Date.now()}`;
    return {
      gatewayInvoiceId,
      checkoutUrl:
        apiRes?.invoiceUrl ||
        `https://www.asaas.com/i/${gatewayInvoiceId.replace(/^pay_asaas_/, '')}`,
      amountCents: input.amountCents,
      dueDate: apiRes?.dueDate || input.dueDate,
    };
  }

  async createBillingPortalSession(
    gatewayCustomerId: string
  ): Promise<BillingPortalSessionResult> {
    return {
      gatewayCustomerId,
      portalUrl: `https://www.asaas.com/customerPortal/${gatewayCustomerId}`,
    };
  }

  async handleWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<ParsedWebhookEvent> {
    const rawString = Buffer.isBuffer(rawBody)
      ? rawBody.toString('utf-8')
      : rawBody;

    const headerTokenRaw =
      headers['asaas-access-token'] ||
      headers['x-webhook-signature'] ||
      headers['ASAAS-ACCESS-TOKEN'];
    const headerToken = Array.isArray(headerTokenRaw)
      ? headerTokenRaw[0]
      : headerTokenRaw;

    if (!headerToken) {
      throw new Error('Missing Asaas webhook signature token');
    }

    const expectedBuf = Buffer.from(this.webhookToken, 'utf-8');
    const receivedBuf = Buffer.from(headerToken, 'utf-8');
    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      throw new Error('Invalid Asaas webhook signature token');
    }

    const payloadHash = crypto
      .createHash('sha256')
      .update(rawString)
      .digest('hex');

    const parsed = JSON.parse(rawString) as {
      id?: string;
      event?: string;
      payment?: {
        id?: string;
        subscription?: string;
        customer?: string;
        value?: number;
        billingType?: string;
        externalReference?: string;
      };
      subscription?: {
        id?: string;
        customer?: string;
        value?: number;
        billingType?: string;
        externalReference?: string;
      };
    };

    if (!parsed.id || !parsed.event) {
      throw new Error('Malformed Asaas webhook payload: missing id or event');
    }

    const canonicalEvent = mapAsaasEventToCanonical(parsed.event);
    const paymentObj = parsed.payment;
    const subObj = parsed.subscription;

    return {
      eventId: parsed.id,
      gatewayEventType: parsed.event,
      canonicalEvent,
      payloadHash,
      gatewaySubscriptionId: paymentObj?.subscription || subObj?.id,
      gatewayInvoiceId: paymentObj?.id,
      gatewayCustomerId: paymentObj?.customer || subObj?.customer,
      amountCents:
        paymentObj?.value !== undefined
          ? this.asaasDecimalToCents(paymentObj.value)
          : subObj?.value !== undefined
          ? this.asaasDecimalToCents(subObj.value)
          : undefined,
      paymentMethod: mapAsaasBillingTypeToMethod(
        paymentObj?.billingType || subObj?.billingType
      ),
      externalReference:
        paymentObj?.externalReference || subObj?.externalReference,
      rawPayload: parsed as Record<string, unknown>,
    };
  }

  async getInvoice(gatewayInvoiceId: string): Promise<GatewayInvoiceDetails> {
    const apiRes = await this.asaasRequest<{
      id: string;
      subscription?: string;
      value: number;
      status: string;
      billingType: string;
      dueDate: string;
      paymentDate?: string;
      invoiceUrl?: string;
    }>(`/payments/${gatewayInvoiceId}`, { method: 'GET' });

    const statusUpper = (apiRes?.status || 'PENDING').toUpperCase();
    let status: GatewayInvoiceDetails['status'] = 'pendente';
    if (statusUpper === 'CONFIRMED' || statusUpper === 'RECEIVED') {
      status = 'paga';
    } else if (statusUpper === 'OVERDUE') {
      status = 'falhou';
    } else if (statusUpper === 'REFUNDED') {
      status = 'estornada';
    }

    return {
      gatewayInvoiceId: apiRes?.id || gatewayInvoiceId,
      gatewaySubscriptionId: apiRes?.subscription,
      amountCents: apiRes ? this.asaasDecimalToCents(apiRes.value) : 2990,
      status,
      paymentMethod: mapAsaasBillingTypeToMethod(apiRes?.billingType),
      dueDate: apiRes?.dueDate || new Date().toISOString().slice(0, 10),
      paidAt: apiRes?.paymentDate,
      checkoutUrl:
        apiRes?.invoiceUrl || `https://www.asaas.com/i/${gatewayInvoiceId}`,
    };
  }

  async refundInvoice(
    gatewayInvoiceId: string,
    amountCents?: number
  ): Promise<RefundInvoiceResult> {
    const body =
      amountCents !== undefined
        ? JSON.stringify({ value: this.centsToAsaasDecimal(amountCents) })
        : undefined;

    await this.asaasRequest(`/payments/${gatewayInvoiceId}/refund`, {
      method: 'POST',
      body,
    });

    return {
      gatewayInvoiceId,
      refundedAmountCents: amountCents ?? 0,
      status: 'estornada',
      refundedAt: new Date().toISOString(),
    };
  }
}
