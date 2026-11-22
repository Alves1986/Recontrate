import { eq, desc } from 'drizzle-orm';
import { db, ensureSchemaAndSeed, pool } from '../db/index';
import {
  invoices,
  opportunityUsage,
  plans,
  processedWebhookEvents,
  promotionalRedemptions,
  providerProfiles,
  subscriptionEvents,
  subscriptions,
  type PlanRow,
  type SubscriptionRow,
} from '../db/schema';
import {
  AsaasBillingAdapter,
  type BillingCycle,
  type BillingProvider,
  type PaymentMethod,
} from './billingProvider';
import {
  TransactionalEmailService,
  WhatsAppBusinessService,
} from './essentialIntegrations';
import {
  advancePromotionalCycleOrReturnFullPrice,
  checkLaunchOfferEligibility,
  forfeitLaunchOfferOnCancel,
  recordLaunchOfferRedemption,
} from './launchOfferService';
import { ProviderReferralService } from './providerReferralService';

const emailService = new TransactionalEmailService();
const whatsappService = new WhatsAppBusinessService();
const referralService = new ProviderReferralService();

export type SubscriptionStatus =
  | 'trial'
  | 'ativa'
  | 'pendente'
  | 'inadimplente'
  | 'cancelada'
  | 'expirada';

export const GRACE_PERIOD_DAYS = 7;

export function calculateCycleEndDate(
  startDate: Date,
  cycle: BillingCycle
): Date {
  const end = new Date(startDate.getTime());
  if (cycle === 'anual') {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else {
    end.setUTCDate(end.getUTCDate() + 30);
  }
  return end;
}

export function calculateProRataUpgradeCents(params: {
  currentPriceCents: number;
  newPriceCents: number;
  cycleStart: Date;
  cycleEnd: Date;
  now?: Date;
}): number {
  const now = params.now || new Date();
  if (params.newPriceCents <= params.currentPriceCents) {
    return 0;
  }
  const totalMs = Math.max(
    1,
    params.cycleEnd.getTime() - params.cycleStart.getTime()
  );
  const remainingMs = Math.max(0, params.cycleEnd.getTime() - now.getTime());
  const ratio = Math.min(1, remainingMs / totalMs);
  return Math.round(
    (params.newPriceCents - params.currentPriceCents) * ratio
  );
}

export function isPlanUpgrade(
  currentPlan: PlanRow,
  targetPlan: PlanRow,
  currentCycle: BillingCycle,
  targetCycle: BillingCycle
): boolean {
  if (targetPlan.ordemExibicao > currentPlan.ordemExibicao) {
    return true;
  }
  if (
    targetPlan.id === currentPlan.id &&
    currentCycle === 'mensal' &&
    targetCycle === 'anual'
  ) {
    return true;
  }
  return false;
}

export class SubscriptionLifecycleService {
  private readonly billing: BillingProvider;

  constructor(billingProvider?: BillingProvider) {
    this.billing = billingProvider || new AsaasBillingAdapter();
  }

  async getPlanBySlug(slug: string): Promise<PlanRow> {
    await ensureSchemaAndSeed();
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.slug, slug.toLowerCase()));
    if (!plan) {
      throw new Error(`Plano não encontrado: ${slug}`);
    }
    return plan;
  }

  async getPlanById(id: string): Promise<PlanRow> {
    await ensureSchemaAndSeed();
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    if (!plan) {
      throw new Error(`Plano não encontrado por ID: ${id}`);
    }
    return plan;
  }

  private async logEvent(params: {
    subscriptionId: string;
    evento: string;
    dadosAnteriores?: Record<string, unknown> | null;
    dadosNovos?: Record<string, unknown> | null;
    gatewayEventId?: string;
  }) {
    await db.insert(subscriptionEvents).values({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subscriptionId: params.subscriptionId,
      evento: params.evento,
      dadosAnterioresJson: params.dadosAnteriores ?? null,
      dadosNovosJson: params.dadosNovos ?? null,
      gatewayEventId: params.gatewayEventId ?? null,
    });
  }

  async ensureOpportunityUsageForCycle(params: {
    providerProfileId: string;
    subscriptionId: string;
    periodoInicio: Date;
    periodoFim: Date;
  }) {
    const existing = await db
      .select()
      .from(opportunityUsage)
      .where(eq(opportunityUsage.subscriptionId, params.subscriptionId));

    if (existing.length > 0) {
      return existing[0];
    }

    const id = `usage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const [created] = await db
      .insert(opportunityUsage)
      .values({
        id,
        providerProfileId: params.providerProfileId,
        subscriptionId: params.subscriptionId,
        periodoInicio: params.periodoInicio,
        periodoFim: params.periodoFim,
        oportunidadesUtilizadas: 0,
      })
      .returning();

    return created;
  }

  /**
   * Starts a checkout flow or activates the Free plan immediately.
   */
  async startCheckout(input: {
    providerProfileId: string;
    providerName: string;
    providerEmail: string;
    providerPhone: string;
    planSlug: string;
    cycle: BillingCycle;
    paymentMethod: PaymentMethod;
    startWithTrial?: boolean;
    applyLaunchOffer?: boolean;
    cpfCnpj?: string;
    deviceFingerprint?: string;
    ipAddress?: string;
    userId?: string;
  }) {
    await ensureSchemaAndSeed();
    const plan = await this.getPlanBySlug(input.planSlug);
    const now = new Date();
    let fim = calculateCycleEndDate(now, input.cycle);
    let amountCents =
      input.cycle === 'anual'
        ? plan.precoAnualCentavos
        : plan.precoMensalCentavos;

    let appliedCampaignId: string | null = null;
    let appliedRedemption: any = null;

    if (input.applyLaunchOffer) {
      const eligibility = await checkLaunchOfferEligibility(
        {
          userId: input.userId,
          email: input.providerEmail,
          phone: input.providerPhone,
          cpfCnpj: input.cpfCnpj,
          deviceFingerprint: input.deviceFingerprint,
          ipAddress: input.ipAddress,
        },
        {
          providerProfileId: input.providerProfileId,
          whatsapp: input.providerPhone,
          cpfCnpj: input.cpfCnpj,
        },
        {
          planSlug: plan.slug,
          cycle: input.cycle,
          now,
        }
      );

      if (!eligibility.eligible || !eligibility.campaignId) {
        throw new Error(
          eligibility.reason ||
          'Não foi possível validar sua elegibilidade. Fale com o suporte.'
        );
      }

      if (typeof eligibility.selectedPlanPromoCentavos === 'number') {
        amountCents = eligibility.selectedPlanPromoCentavos;
        appliedCampaignId = eligibility.campaignId;
      }
    }

    const isFreeLaunchPromo = Boolean(appliedCampaignId && amountCents === 0);
    if (isFreeLaunchPromo) {
      fim = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    }

    let gatewayCustomerId: string | null = null;
    let gatewaySubscriptionId: string | null = null;
    let gatewayInvoiceId: string | null = null;
    let checkoutUrl = '';
    const subId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const dueDateStr = (isFreeLaunchPromo ? fim : now)
      .toISOString()
      .slice(0, 10);

    if (amountCents > 0 || (input.cpfCnpj && input.cpfCnpj.replace(/\D/g, '').length >= 11)) {
      const customer = await this.billing.createCustomer({
        providerProfileId: input.providerProfileId,
        name: input.providerName,
        email: input.providerEmail,
        phone: input.providerPhone,
        cpfCnpj: input.cpfCnpj,
      });
      gatewayCustomerId = customer.gatewayCustomerId;

      if (amountCents > 0) {
        const gatewaySub = await this.billing.createSubscription({
          gatewayCustomerId: customer.gatewayCustomerId,
          planSlug: plan.slug,
          planName: plan.nome,
          cycle: input.cycle,
          amountCents,
          paymentMethod: input.paymentMethod,
          nextDueDate: dueDateStr,
          externalReference: subId,
        });
        gatewaySubscriptionId = gatewaySub.gatewaySubscriptionId;
        gatewayInvoiceId = gatewaySub.gatewayInvoiceId;
        checkoutUrl = gatewaySub.checkoutUrl;
      }
    }

    const initialStatus: SubscriptionStatus =
      input.startWithTrial || isFreeLaunchPromo
        ? 'trial'
        : amountCents === 0
          ? 'ativa'
          : 'pendente';

    const usageCycleEnd = isFreeLaunchPromo
      ? calculateCycleEndDate(now, 'mensal')
      : fim;

    const [createdSub] = await db
      .insert(subscriptions)
      .values({
        id: subId,
        providerProfileId: input.providerProfileId,
        planId: plan.id,
        status: initialStatus,
        ciclo: input.cycle,
        inicio: now,
        fim,
        proximaCobranca: fim,
        gatewaySubscriptionId,
        gatewayCustomerId,
      })
      .returning();

    const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const [createdInvoice] = await db
      .insert(invoices)
      .values({
        id: invoiceId,
        subscriptionId: subId,
        valorCentavos: amountCents,
        status: amountCents === 0 ? 'paga' : 'pendente',
        metodo: input.paymentMethod,
        vencimento: now,
        pagoEm: amountCents === 0 ? now : null,
        gatewayInvoiceId,
        urlCheckout: checkoutUrl,
      })
      .returning();

    await this.ensureOpportunityUsageForCycle({
      providerProfileId: input.providerProfileId,
      subscriptionId: subId,
      periodoInicio: now,
      periodoFim: usageCycleEnd,
    });

    await this.logEvent({
      subscriptionId: subId,
      evento: 'subscription_created',
      dadosNovos: {
        planSlug: plan.slug,
        cycle: input.cycle,
        status: initialStatus,
        amountCents,
        freeDaysPromo: isFreeLaunchPromo ? 90 : 0,
      },
    });

    if (initialStatus === 'ativa' || initialStatus === 'trial') {
      await db
        .update(providerProfiles)
        .set({ planSlug: plan.slug })
        .where(eq(providerProfiles.id, input.providerProfileId));
    }

    if (appliedCampaignId) {
      appliedRedemption = await recordLaunchOfferRedemption({
        campaignId: appliedCampaignId,
        providerProfileId: input.providerProfileId,
        userId: input.userId,
        subscriptionId: subId,
        planId: plan.id,
        cpfCnpj: input.cpfCnpj,
        now,
      });
    }

    let referralBonusDaysApplied = 0;
    let finalSubscription = createdSub;
    if (
      plan.precoMensalCentavos > 0 &&
      (initialStatus === 'ativa' || initialStatus === 'trial')
    ) {
      try {
        let resolvedUserId = input.userId;
        if (!resolvedUserId) {
          const { rows: provUserRows } = await pool.query<{ user_id: string | null }>(
            `SELECT user_id FROM provider_profiles WHERE id = $1 LIMIT 1`,
            [input.providerProfileId]
          );
          resolvedUserId = provUserRows[0]?.user_id || undefined;
        }
        if (resolvedUserId) {
          const refApply =
            await referralService.applyAvailableDaysToReferrerSubscription(
              resolvedUserId,
              subId
            );
          if (refApply.applied && refApply.newEndDate) {
            referralBonusDaysApplied = refApply.appliedDays;
            finalSubscription = {
              ...createdSub,
              fim: new Date(refApply.newEndDate),
              proximaCobranca: new Date(refApply.newEndDate),
            };
          }
        }
      } catch {
        // Não bloquear checkout caso aplicação de saldo de indicação falhe
      }
    }

    return {
      subscription: finalSubscription,
      invoice: createdInvoice,
      plan,
      checkoutUrl,
      launchOfferApplied: Boolean(appliedCampaignId),
      launchOfferRedemption: appliedRedemption,
      referralBonusDaysApplied,
    };
  }

  /**
   * Activates a subscription upon payment confirmation (from trial, pendente, or inadimplente).
   */
  async activateSubscription(
    subscriptionId: string,
    gatewayEventId?: string
  ): Promise<SubscriptionRow> {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));
    if (!sub) {
      throw new Error(`Assinatura não encontrada: ${subscriptionId}`);
    }

    const plan = await this.getPlanById(sub.planId);
    const now = new Date();
    const fim =
      sub.fim > now ? sub.fim : calculateCycleEndDate(now, sub.ciclo as BillingCycle);

    const [updated] = await db
      .update(subscriptions)
      .set({
        status: 'ativa',
        toleranciaAte: null,
        fim,
        proximaCobranca: fim,
        atualizadoEm: now,
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    await db
      .update(providerProfiles)
      .set({ planSlug: plan.slug })
      .where(eq(providerProfiles.id, sub.providerProfileId));

    await this.ensureOpportunityUsageForCycle({
      providerProfileId: sub.providerProfileId,
      subscriptionId: sub.id,
      periodoInicio: sub.inicio,
      periodoFim: fim,
    });

    await this.logEvent({
      subscriptionId: sub.id,
      evento: 'subscription_activated',
      dadosAnteriores: { status: sub.status },
      dadosNovos: { status: 'ativa', planSlug: plan.slug },
      gatewayEventId,
    });

    if (plan.precoMensalCentavos > 0) {
      try {
        const { rows: provUserRows } = await pool.query<{ user_id: string | null }>(
          `SELECT user_id FROM provider_profiles WHERE id = $1 LIMIT 1`,
          [sub.providerProfileId]
        );
        const ownerUserId = provUserRows[0]?.user_id;
        if (ownerUserId) {
          await referralService.applyAvailableDaysToReferrerSubscription(
            ownerUserId,
            sub.id
          );
        }
      } catch {
        // Não bloquear ativação caso aplicação de saldo de indicação falhe
      }
    }

    // Se já era uma assinatura ativa (renovação mensal), avança o ciclo promocional e agenda retorno ao preço cheio no 4º ciclo
    if (sub.status === 'ativa') {
      const promoAdvance = await advancePromotionalCycleOrReturnFullPrice(
        sub.id,
        now
      );
      if (promoAdvance.returnedToFullPrice && sub.gatewaySubscriptionId) {
        await this.billing.updateSubscription(sub.gatewaySubscriptionId, {
          planSlug: plan.slug,
          planName: plan.nome,
          amountCents: plan.precoMensalCentavos,
          cycle: sub.ciclo as BillingCycle,
        });
        await this.logEvent({
          subscriptionId: sub.id,
          evento: 'promotion_returned_to_full_price',
          dadosNovos: {
            planSlug: plan.slug,
            fullPriceCentavos: plan.precoMensalCentavos,
            cycleNumber: promoAdvance.cycleNumber,
          },
          gatewayEventId,
        });
      }
    }

    // Envia confirmação por E-mail e WhatsApp de forma resiliente
    try {
      const { rows: provRows } = await pool.query<{
        name: string;
        whatsapp: string;
        user_id: string | null;
        email: string | null;
      }>(
        `SELECT pp.name, pp.whatsapp, pp.user_id, u.email
         FROM provider_profiles pp
         LEFT JOIN users u ON u.id = pp.user_id
         WHERE pp.id = $1
         LIMIT 1`,
        [sub.providerProfileId]
      );
      const prov = provRows[0];
      const nextChargeLabel = fim.toLocaleDateString('pt-BR');

      if (prov?.email) {
        await emailService.sendEmail({
          to: prov.email,
          subject: `Recontrate: Assinatura ${plan.nome} (${sub.ciclo}) ativada`,
          template: 'aviso_aprovacao_cadastro',
          userId: prov.user_id || undefined,
          variables: {
            providerName: prov.name,
            planName: plan.nome,
            cycle: sub.ciclo,
            nextBillingDate: nextChargeLabel,
          },
        });
      }

      if (prov?.whatsapp) {
        await whatsappService.sendTemplateNotification({
          recipientPhone: prov.whatsapp,
          templateName: 'nova_oportunidade_compativel',
          providerProfileId: sub.providerProfileId,
          customerUserId: prov.user_id || undefined,
          parameters: {
            event: 'subscription_activated',
            planName: plan.nome,
            cycle: sub.ciclo,
            nextBillingDate: nextChargeLabel,
          },
        });
      }
    } catch {
      // Não falhar a ativação da assinatura caso o canal de notificação externo esteja indisponível
    }

    return updated;
  }

  /**
   * Handles payment failure: transitions to 'inadimplente' with 7-day grace period ('tolerancia_ate').
   * Keeps full access during the 7 days while showing pending payment notice.
   */
  async markPaymentFailed(
    subscriptionId: string,
    now = new Date(),
    gatewayEventId?: string
  ): Promise<SubscriptionRow> {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));
    if (!sub) {
      throw new Error(`Assinatura não encontrada: ${subscriptionId}`);
    }

    const toleranciaAte = new Date(
      now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
    );

    const [updated] = await db
      .update(subscriptions)
      .set({
        status: 'inadimplente',
        toleranciaAte,
        atualizadoEm: now,
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    await this.logEvent({
      subscriptionId: sub.id,
      evento: 'invoice_payment_failed',
      dadosAnteriores: { status: sub.status },
      dadosNovos: {
        status: 'inadimplente',
        toleranciaAte: toleranciaAte.toISOString(),
      },
      gatewayEventId,
    });

    return updated;
  }

  /**
   * Cancels subscription at provider's request:
   * - Standard cancel: status='cancelada', keeps paid plan features until 'fim'.
   * - CDC art. 49 (7-day withdrawal right): if exerciseWithdrawalRight=true within 7 days of sub.inicio,
   *   refunds paid invoice(s) in full, marks invoice 'estornada', returns to 'gratuito' immediately, and logs audit.
   */
  async cancelSubscription(
    subscriptionId: string,
    reason = 'Solicitação do prestador',
    now = new Date(),
    options?: { exerciseWithdrawalRight?: boolean }
  ): Promise<
    SubscriptionRow & {
      withdrawalRefund?: {
        refunded: boolean;
        amountCents: number;
        invoiceId: string;
        refundedAt: string;
      } | null;
    }
  > {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));
    if (!sub) {
      throw new Error(`Assinatura não encontrada: ${subscriptionId}`);
    }

    const exerciseWithdrawal = Boolean(options?.exerciseWithdrawalRight);
    const elapsedMs = now.getTime() - new Date(sub.inicio).getTime();
    const withinWithdrawalWindow = elapsedMs <= 7 * 24 * 60 * 60 * 1000;

    if (exerciseWithdrawal && !withinWithdrawalWindow) {
      throw new Error(
        'O prazo legal de 7 dias corridos para arrependimento com estorno integral (CDC art. 49) encerrou para esta assinatura. Você ainda pode cancelar sem multa mantendo acesso até o fim do período pago.'
      );
    }

    if (sub.gatewaySubscriptionId) {
      await this.billing.cancelSubscription(sub.gatewaySubscriptionId, reason);
    }

    let withdrawalRefund: {
      refunded: boolean;
      amountCents: number;
      invoiceId: string;
      refundedAt: string;
    } | null = null;

    if (exerciseWithdrawal) {
      const { rows: paidInvoices } = await pool.query<{
        id: string;
        gateway_invoice_id: string | null;
        valor_centavos: number;
      }>(
        `SELECT id, gateway_invoice_id, valor_centavos
         FROM invoices
         WHERE subscription_id = $1
           AND status = 'paga'
           AND valor_centavos > 0
         ORDER BY pago_em DESC NULLS LAST, criado_em DESC
         LIMIT 1`,
        [subscriptionId]
      );

      if (paidInvoices.length > 0) {
        const inv = paidInvoices[0];
        const refundResult = await this.billing.refundInvoice(
          inv.gateway_invoice_id || inv.id,
          inv.valor_centavos
        );
        await pool.query(
          `UPDATE invoices
           SET status = 'estornada', atualizado_em = $2
           WHERE id = $1`,
          [inv.id, now]
        );
        withdrawalRefund = {
          refunded: true,
          amountCents: refundResult.refundedAmountCents || inv.valor_centavos,
          invoiceId: inv.id,
          refundedAt: refundResult.refundedAt,
        };
      } else {
        withdrawalRefund = {
          refunded: true,
          amountCents: 0,
          invoiceId: '',
          refundedAt: now.toISOString(),
        };
      }

      const freePlan = await this.getPlanBySlug('gratuito');
      const [updated] = await db
        .update(subscriptions)
        .set({
          status: 'expirada',
          planId: freePlan.id,
          scheduledPlanId: null,
          canceladaEm: now,
          fim: now,
          motivoCancelamento: `${reason} (CDC art. 49 — Direito de arrependimento em 7 dias)`,
          proximaCobranca: null,
          atualizadoEm: now,
        })
        .where(eq(subscriptions.id, subscriptionId))
        .returning();

      await db
        .update(providerProfiles)
        .set({ planSlug: 'gratuito' })
        .where(eq(providerProfiles.id, sub.providerProfileId));

      await forfeitLaunchOfferOnCancel(subscriptionId, now);

      await this.logEvent({
        subscriptionId: sub.id,
        evento: 'subscription_canceled',
        dadosAnteriores: { status: sub.status, planId: sub.planId },
        dadosNovos: {
          status: 'expirada',
          cdcArt49WithdrawalRight: true,
          withdrawalRefund,
          motivo: reason,
        },
      });

      return { ...updated, withdrawalRefund };
    }

    const [updated] = await db
      .update(subscriptions)
      .set({
        status: 'cancelada',
        canceladaEm: now,
        motivoCancelamento: reason,
        proximaCobranca: null,
        atualizadoEm: now,
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    await forfeitLaunchOfferOnCancel(subscriptionId, now);

    await this.logEvent({
      subscriptionId: sub.id,
      evento: 'subscription_canceled',
      dadosAnteriores: { status: sub.status },
      dadosNovos: {
        status: 'cancelada',
        acessoMantidoAte: sub.fim.toISOString(),
        motivo: reason,
      },
    });

    return { ...updated, withdrawalRefund: null };
  }

  /**
   * Upgrade: immediate effect on benefits & limits, pro-rata charge in integer cents,
   * stable renewal date ('fim').
   */
  async upgradeSubscription(params: {
    subscriptionId: string;
    targetPlanSlug: string;
    targetCycle?: BillingCycle;
    paymentMethod?: PaymentMethod;
    cpfCnpj?: string;
    now?: Date;
  }) {
    const now = params.now || new Date();
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, params.subscriptionId));
    if (!sub) {
      throw new Error(`Assinatura não encontrada: ${params.subscriptionId}`);
    }

    const currentPlan = await this.getPlanById(sub.planId);
    const targetPlan = await this.getPlanBySlug(params.targetPlanSlug);
    const currentCycle = (sub.ciclo as BillingCycle) || 'mensal';
    const targetCycle = params.targetCycle || currentCycle;

    if (!isPlanUpgrade(currentPlan, targetPlan, currentCycle, targetCycle)) {
      throw new Error(
        `O plano ${targetPlan.nome} (${targetCycle}) não é um upgrade em relação a ${currentPlan.nome} (${currentCycle}). Use downgrade.`
      );
    }

    const currentPriceCents =
      currentCycle === 'anual'
        ? currentPlan.precoAnualCentavos
        : currentPlan.precoMensalCentavos;
    const newPriceCents =
      targetCycle === 'anual'
        ? targetPlan.precoAnualCentavos
        : targetPlan.precoMensalCentavos;

    const proRataCents = calculateProRataUpgradeCents({
      currentPriceCents,
      newPriceCents,
      cycleStart: sub.inicio,
      cycleEnd: sub.fim,
      now,
    });

    // Renewal date remains stable on monthly->monthly upgrade; extends if switching to annual
    const newFim =
      currentCycle === 'mensal' && targetCycle === 'anual'
        ? calculateCycleEndDate(now, 'anual')
        : sub.fim;

    let resolvedGatewayCustomerId = sub.gatewayCustomerId;
    if (!resolvedGatewayCustomerId && (proRataCents > 0 || newPriceCents > 0)) {
      const [profile] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.id, sub.providerProfileId));
      let ownerEmail = 'contato@recontrate.app.br';
      if (profile?.userId) {
        const { rows: userRows } = await pool.query<{ email: string }>(
          'SELECT email FROM users WHERE id = $1::uuid LIMIT 1',
          [profile.userId]
        );
        if (userRows[0]?.email) {
          ownerEmail = userRows[0].email;
        }
      }
      const cpfCnpj = params.cpfCnpj || profile?.cpfCnpjNormalizado || undefined;
      if (profile || cpfCnpj) {
        const customer = await this.billing.createCustomer({
          providerProfileId: sub.providerProfileId,
          name: profile?.professionalName || profile?.name || 'Prestador Recontrate',
          email: ownerEmail,
          phone: profile?.whatsapp || '',
          cpfCnpj,
        });
        resolvedGatewayCustomerId = customer.gatewayCustomerId;
      }
    }

    let resolvedGatewaySubscriptionId = sub.gatewaySubscriptionId;
    if (sub.gatewaySubscriptionId) {
      await this.billing.updateSubscription(sub.gatewaySubscriptionId, {
        planSlug: targetPlan.slug,
        planName: targetPlan.nome,
        cycle: targetCycle,
        amountCents: newPriceCents,
      });
    } else if (newPriceCents > 0) {
      if (!resolvedGatewayCustomerId) {
        throw new Error(
          'Informe um CPF ou CNPJ válido para ativar a cobrança recorrente desta assinatura.'
        );
      }
      const createdGwSub = await this.billing.createSubscription({
        gatewayCustomerId: resolvedGatewayCustomerId,
        planSlug: targetPlan.slug,
        planName: targetPlan.nome,
        cycle: targetCycle,
        amountCents: newPriceCents,
        paymentMethod: params.paymentMethod || 'pix',
        nextDueDate: newFim.toISOString().slice(0, 10),
        externalReference: sub.id,
      });
      resolvedGatewaySubscriptionId = createdGwSub.gatewaySubscriptionId;
    }

    const [updatedSub] = await db
      .update(subscriptions)
      .set({
        planId: targetPlan.id,
        scheduledPlanId: null,
        ciclo: targetCycle,
        status: 'ativa',
        gatewayCustomerId: resolvedGatewayCustomerId,
        gatewaySubscriptionId: resolvedGatewaySubscriptionId,
        fim: newFim,
        proximaCobranca: newFim,
        atualizadoEm: now,
      })
      .where(eq(subscriptions.id, sub.id))
      .returning();

    await db
      .update(providerProfiles)
      .set({ planSlug: targetPlan.slug })
      .where(eq(providerProfiles.id, sub.providerProfileId));

    let proRataInvoice = null;
    if (proRataCents > 0 && resolvedGatewayCustomerId) {
      const checkout = await this.billing.createCheckoutSession({
        gatewayCustomerId: resolvedGatewayCustomerId,
        subscriptionId: sub.id,
        planSlug: targetPlan.slug,
        planName: `${targetPlan.nome} (Pro-Rata Upgrade)`,
        cycle: targetCycle,
        amountCents: proRataCents,
        paymentMethod: params.paymentMethod || 'pix',
        dueDate: now.toISOString().slice(0, 10),
      });

      const [inv] = await db
        .insert(invoices)
        .values({
          id: `inv-prorata-${Date.now()}`,
          subscriptionId: sub.id,
          valorCentavos: proRataCents,
          status: 'pendente',
          metodo: params.paymentMethod || 'pix',
          vencimento: now,
          gatewayInvoiceId: checkout.gatewayInvoiceId,
          urlCheckout: checkout.checkoutUrl,
        })
        .returning();
      proRataInvoice = inv;
    }

    await this.logEvent({
      subscriptionId: sub.id,
      evento: 'subscription_updated',
      dadosAnteriores: {
        planId: currentPlan.id,
        planSlug: currentPlan.slug,
        ciclo: currentCycle,
      },
      dadosNovos: {
        planId: targetPlan.id,
        planSlug: targetPlan.slug,
        ciclo: targetCycle,
        proRataCents,
        newLimit: targetPlan.limiteOportunidadesMensal,
      },
    });

    return {
      subscription: updatedSub,
      newPlan: targetPlan,
      proRataCents,
      proRataInvoice,
    };
  }

  /**
   * Downgrade: keeps current plan and limits until the end of the paid cycle ('fim'),
   * scheduling the new plan to take effect on 'fim'.
   */
  async scheduleDowngrade(params: {
    subscriptionId: string;
    targetPlanSlug: string;
    now?: Date;
  }) {
    const now = params.now || new Date();
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, params.subscriptionId));
    if (!sub) {
      throw new Error(`Assinatura não encontrada: ${params.subscriptionId}`);
    }

    const currentPlan = await this.getPlanById(sub.planId);
    const targetPlan = await this.getPlanBySlug(params.targetPlanSlug);

    if (targetPlan.ordemExibicao >= currentPlan.ordemExibicao) {
      throw new Error(
        `O plano ${targetPlan.nome} não é um downgrade em relação a ${currentPlan.nome}.`
      );
    }

    const [updatedSub] = await db
      .update(subscriptions)
      .set({
        scheduledPlanId: targetPlan.id,
        atualizadoEm: now,
      })
      .where(eq(subscriptions.id, sub.id))
      .returning();

    await this.logEvent({
      subscriptionId: sub.id,
      evento: 'subscription_updated',
      dadosAnteriores: {
        planId: currentPlan.id,
        planSlug: currentPlan.slug,
      },
      dadosNovos: {
        scheduledPlanId: targetPlan.id,
        scheduledPlanSlug: targetPlan.slug,
        effectiveDate: sub.fim.toISOString(),
      },
    });

    return {
      subscription: updatedSub,
      currentPlan,
      scheduledPlan: targetPlan,
      effectiveDate: sub.fim,
    };
  }

  /**
   * Scheduled lifecycle job:
   * 1. Downgrades overdue ('inadimplente') accounts whose 7-day grace period ('toleranciaAte') has expired to 'gratuito', preserving all provider data.
   * 2. Transitions 'cancelada' accounts past 'fim' to 'expirada' and migrates them automatically to 'gratuito'.
   * 3. Applies scheduled downgrades when 'fim' is reached.
   */
  async runLifecycleJobs(now = new Date()) {
    await ensureSchemaAndSeed();
    const freePlan = await this.getPlanBySlug('gratuito');
    const allSubs = await db.select().from(subscriptions);

    let overdueDowngraded = 0;
    let canceledExpiredToFree = 0;
    let scheduledDowngradesApplied = 0;

    for (const sub of allSubs) {
      // 1. Inadimplente past 7-day grace period -> cancelada -> expirada -> gratuito
      if (
        sub.status === 'inadimplente' &&
        sub.toleranciaAte &&
        now > sub.toleranciaAte
      ) {
        await db
          .update(subscriptions)
          .set({
            status: 'expirada',
            planId: freePlan.id,
            scheduledPlanId: null,
            toleranciaAte: null,
            atualizadoEm: now,
          })
          .where(eq(subscriptions.id, sub.id));

        await db
          .update(providerProfiles)
          .set({ planSlug: 'gratuito' })
          .where(eq(providerProfiles.id, sub.providerProfileId));

        await this.logEvent({
          subscriptionId: sub.id,
          evento: 'subscription_expired',
          dadosAnteriores: { status: 'inadimplente', planId: sub.planId },
          dadosNovos: {
            status: 'expirada',
            migratedToPlan: 'gratuito',
            dataPreserved: true,
          },
        });
        overdueDowngraded += 1;
        continue;
      }

      // 2. Cancelada past paid period end ('fim') -> expirada -> gratuito
      if (sub.status === 'cancelada' && now >= sub.fim) {
        await db
          .update(subscriptions)
          .set({
            status: 'expirada',
            planId: freePlan.id,
            scheduledPlanId: null,
            atualizadoEm: now,
          })
          .where(eq(subscriptions.id, sub.id));

        await db
          .update(providerProfiles)
          .set({ planSlug: 'gratuito' })
          .where(eq(providerProfiles.id, sub.providerProfileId));

        await this.logEvent({
          subscriptionId: sub.id,
          evento: 'subscription_expired',
          dadosAnteriores: { status: 'cancelada', planId: sub.planId },
          dadosNovos: {
            status: 'expirada',
            migratedToPlan: 'gratuito',
          },
        });
        canceledExpiredToFree += 1;
        continue;
      }

      // 3. Scheduled downgrade at end of cycle ('fim')
      if (
        sub.status === 'ativa' &&
        sub.scheduledPlanId &&
        now >= sub.fim
      ) {
        const targetPlan = await this.getPlanById(sub.scheduledPlanId);
        const newEnd = calculateCycleEndDate(now, sub.ciclo as BillingCycle);

        await db
          .update(subscriptions)
          .set({
            planId: targetPlan.id,
            scheduledPlanId: null,
            inicio: now,
            fim: newEnd,
            proximaCobranca: newEnd,
            atualizadoEm: now,
          })
          .where(eq(subscriptions.id, sub.id));

        await db
          .update(providerProfiles)
          .set({ planSlug: targetPlan.slug })
          .where(eq(providerProfiles.id, sub.providerProfileId));

        await this.ensureOpportunityUsageForCycle({
          providerProfileId: sub.providerProfileId,
          subscriptionId: sub.id,
          periodoInicio: now,
          periodoFim: newEnd,
        });

        scheduledDowngradesApplied += 1;
      }
    }

    return {
      overdueDowngraded,
      canceledExpiredToFree,
      scheduledDowngradesApplied,
    };
  }

  /**
   * Secure, idempotent, out-of-order-safe webhook handler.
   */
  async processWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ) {
    await ensureSchemaAndSeed();

    // 1. Validate webhook signature and parse canonical event
    const parsed = await this.billing.handleWebhook(rawBody, headers);

    // 2. Check idempotency in processed_webhook_events before processing
    const existing = await db
      .select()
      .from(processedWebhookEvents)
      .where(eq(processedWebhookEvents.eventId, parsed.eventId));

    if (existing.length > 0) {
      return {
        ok: true,
        duplicate: true,
        eventId: parsed.eventId,
        canonicalEvent: parsed.canonicalEvent,
        status: existing[0].status,
      };
    }

    // 3. Record event as 'recebido' before mutating state
    const webhookRowId = `wh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db.insert(processedWebhookEvents).values({
      id: webhookRowId,
      gateway: 'asaas',
      eventId: parsed.eventId,
      tipoEvento: parsed.canonicalEvent,
      payloadHash: parsed.payloadHash,
      status: 'recebido',
    });

    try {
      // Find target subscription by externalReference or gatewaySubscriptionId
      let targetSub: SubscriptionRow | undefined;
      if (parsed.externalReference) {
        const [byRef] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, parsed.externalReference));
        targetSub = byRef;
      }
      if (!targetSub && parsed.gatewaySubscriptionId) {
        const [byGw] = await db
          .select()
          .from(subscriptions)
          .where(
            eq(
              subscriptions.gatewaySubscriptionId,
              parsed.gatewaySubscriptionId
            )
          );
        targetSub = byGw;
      }

      if (!targetSub) {
        await db
          .update(processedWebhookEvents)
          .set({
            status: 'ignorado',
            processadoEm: new Date(),
          })
          .where(eq(processedWebhookEvents.id, webhookRowId));

        return {
          ok: true,
          duplicate: false,
          eventId: parsed.eventId,
          canonicalEvent: parsed.canonicalEvent,
          status: 'ignorado',
        };
      }

      // 4. Out-of-order protection: if subscription is already 'ativa' and an older 'invoice_created' or 'subscription_created' arrives, ignore regression
      if (
        targetSub.status === 'ativa' &&
        (parsed.canonicalEvent === 'invoice_created' ||
          parsed.canonicalEvent === 'subscription_created')
      ) {
        await db
          .update(processedWebhookEvents)
          .set({
            status: 'ignorado',
            processadoEm: new Date(),
          })
          .where(eq(processedWebhookEvents.id, webhookRowId));

        return {
          ok: true,
          duplicate: false,
          outOfOrderIgnored: true,
          eventId: parsed.eventId,
          canonicalEvent: parsed.canonicalEvent,
          status: 'ignorado',
        };
      }

      if (parsed.canonicalEvent === 'invoice_paid') {
        if (parsed.gatewayInvoiceId) {
          await db
            .update(invoices)
            .set({
              status: 'paga',
              pagoEm: new Date(),
              atualizadoEm: new Date(),
            })
            .where(eq(invoices.gatewayInvoiceId, parsed.gatewayInvoiceId));
        }
        await this.activateSubscription(targetSub.id, parsed.eventId);
      } else if (parsed.canonicalEvent === 'invoice_payment_failed') {
        if (parsed.gatewayInvoiceId) {
          await db
            .update(invoices)
            .set({
              status: 'falhou',
              atualizadoEm: new Date(),
            })
            .where(eq(invoices.gatewayInvoiceId, parsed.gatewayInvoiceId));
        }
        await this.markPaymentFailed(targetSub.id, new Date(), parsed.eventId);
      } else if (parsed.canonicalEvent === 'subscription_canceled') {
        await this.cancelSubscription(
          targetSub.id,
          'Cancelado via webhook Asaas'
        );
      } else {
        await this.logEvent({
          subscriptionId: targetSub.id,
          evento: parsed.canonicalEvent,
          dadosNovos: parsed.rawPayload,
          gatewayEventId: parsed.eventId,
        });
      }

      await db
        .update(processedWebhookEvents)
        .set({
          status: 'processado',
          processadoEm: new Date(),
        })
        .where(eq(processedWebhookEvents.id, webhookRowId));

      return {
        ok: true,
        duplicate: false,
        eventId: parsed.eventId,
        canonicalEvent: parsed.canonicalEvent,
        status: 'processado',
      };
    } catch (err) {
      await db
        .update(processedWebhookEvents)
        .set({
          status: 'falhou',
          erro: (err as Error).message,
          processadoEm: new Date(),
        })
        .where(eq(processedWebhookEvents.id, webhookRowId));
      throw err;
    }
  }

  async getProviderSubscriptionSummary(providerProfileId: string) {
    await ensureSchemaAndSeed();
    const subs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.providerProfileId, providerProfileId))
      .orderBy(desc(subscriptions.criadoEm));

    const [latestRedemption] = await db
      .select()
      .from(promotionalRedemptions)
      .where(eq(promotionalRedemptions.providerProfileId, providerProfileId))
      .orderBy(desc(promotionalRedemptions.criadoEm))
      .limit(1);

    const activeLaunchOffer =
      latestRedemption &&
      (latestRedemption.status === 'ativo' ||
        latestRedemption.status === 'ativa')
        ? {
            id: latestRedemption.id,
            status: latestRedemption.status,
            cicloPromocionalAtual: latestRedemption.cicloPromocionalAtual,
            ciclosMaximos: 3,
            dataInicioPromocao: latestRedemption.dataInicioPromocao,
            dataFimPromocao: latestRedemption.dataFimPromocao,
            dataRetornoPrecoCheio: latestRedemption.dataRetornoPrecoCheio,
          }
        : null;

    const currentSub = subs[0];
    if (!currentSub) {
      const freePlan = await this.getPlanBySlug('gratuito');
      return {
        subscription: null,
        plan: freePlan,
        scheduledPlan: null,
        invoices: [],
        inGracePeriod: false,
        portalUrl: null,
        activeLaunchOffer,
      };
    }

    const plan = await this.getPlanById(currentSub.planId);
    const scheduledPlan = currentSub.scheduledPlanId
      ? await this.getPlanById(currentSub.scheduledPlanId)
      : null;
    const subInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.subscriptionId, currentSub.id))
      .orderBy(desc(invoices.criadoEm));

    let portalUrl: string | null = null;
    if (
      currentSub.gatewayCustomerId &&
      !currentSub.gatewayCustomerId.startsWith('cus_free_') &&
      plan.precoMensalCentavos > 0
    ) {
      try {
        const portal = await this.billing.createBillingPortalSession(
          currentSub.gatewayCustomerId
        );
        portalUrl = portal.portalUrl;
      } catch {
        portalUrl = null;
      }
    }

    return {
      subscription: currentSub,
      plan,
      scheduledPlan,
      invoices: subInvoices,
      inGracePeriod:
        currentSub.status === 'inadimplente' &&
        Boolean(currentSub.toleranciaAte && currentSub.toleranciaAte > new Date()),
      portalUrl,
      activeLaunchOffer,
    };
  }
}
