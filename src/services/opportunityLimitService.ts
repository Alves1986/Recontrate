import { desc, eq } from 'drizzle-orm';
import { db, ensureSchemaAndSeed } from '../db/index';
import {
  opportunityUsage,
  plans,
  subscriptions,
} from '../db/schema';
import { calculateCycleEndDate } from './subscriptionLifecycle';

export interface OpportunityUsageStatus {
  providerProfileId: string;
  subscriptionId: string;
  planSlug: string;
  planName: string;
  used: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
  upgradeSuggested: boolean;
  profileBlocked: false; // Regra obrigatória: nunca bloquear o perfil imediatamente ao atingir o limite
  periodoInicio: Date;
  periodoFim: Date;
}

export class OpportunityLimitService {
  /**
   * Resolves the provider's active subscription (or auto-provisions a Gratuito subscription)
   * and returns the current cycle's opportunity_usage row and plan limit.
   */
  async getUsageStatus(
    providerProfileId: string,
    now = new Date()
  ): Promise<OpportunityUsageStatus> {
    await ensureSchemaAndSeed();

    const subs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.providerProfileId, providerProfileId))
      .orderBy(desc(subscriptions.criadoEm));

    let activeSub = subs.find(
      (s) =>
        s.status === 'ativa' ||
        s.status === 'trial' ||
        (s.status === 'inadimplente' &&
          s.toleranciaAte &&
          s.toleranciaAte > now) ||
        (s.status === 'cancelada' && s.fim > now)
    );

    const allPlans = await db.select().from(plans);
    const freePlan =
      allPlans.find((p) => p.slug === 'gratuito') || allPlans[0];

    if (!activeSub) {
      const end = calculateCycleEndDate(now, 'mensal');
      const [createdFreeSub] = await db
        .insert(subscriptions)
        .values({
          id: `sub-free-${providerProfileId}-${Date.now()}`,
          providerProfileId,
          planId: freePlan.id,
          status: 'ativa',
          ciclo: 'mensal',
          inicio: now,
          fim: end,
          proximaCobranca: end,
        })
        .returning();
      activeSub = createdFreeSub;
    }

    const plan =
      allPlans.find((p) => p.id === activeSub!.planId) || freePlan;

    // Find or create opportunity_usage row for this subscription cycle
    const usageRows = await db
      .select()
      .from(opportunityUsage)
      .where(eq(opportunityUsage.subscriptionId, activeSub.id))
      .orderBy(desc(opportunityUsage.criadoEm));

    let currentUsage = usageRows[0];

    // If no usage row exists or the billing cycle renewed ('now >= periodoFim'), start a fresh period counter
    if (!currentUsage || now >= currentUsage.periodoFim) {
      const periodoInicio = currentUsage ? now : activeSub.inicio;
      const periodoFim =
        activeSub.fim > now
          ? activeSub.fim
          : calculateCycleEndDate(now, 'mensal');

      const [createdUsage] = await db
        .insert(opportunityUsage)
        .values({
          id: `usage-${providerProfileId}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          providerProfileId,
          subscriptionId: activeSub.id,
          periodoInicio,
          periodoFim,
          oportunidadesUtilizadas: 0,
        })
        .returning();
      currentUsage = createdUsage;
    }

    const limit = plan.limiteOportunidadesMensal;
    const used = currentUsage.oportunidadesUtilizadas;
    const remaining = Math.max(0, limit - used);
    const limitReached = used >= limit;

    return {
      providerProfileId,
      subscriptionId: activeSub.id,
      planSlug: plan.slug,
      planName: plan.nome,
      used,
      limit,
      remaining,
      limitReached,
      upgradeSuggested: limitReached && plan.slug !== 'premium' && plan.slug !== 'padrinho',
      profileBlocked: false,
      periodoInicio: currentUsage.periodoInicio,
      periodoFim: currentUsage.periodoFim,
    };
  }

  /**
   * Attempts to dispatch an opportunity to the provider.
   * Records every opportunity sent regardless of provider response.
   * Blocks dispatching if the monthly limit has been reached, returning an upgrade prompt.
   */
  async recordOpportunitySent(
    providerProfileId: string,
    now = new Date()
  ): Promise<{
    allowed: boolean;
    status: OpportunityUsageStatus;
    reason?: string;
  }> {
    const currentStatus = await this.getUsageStatus(providerProfileId, now);

    if (currentStatus.limitReached) {
      return {
        allowed: false,
        status: currentStatus,
        reason: `Limite mensal de ${currentStatus.limit} oportunidades do plano ${currentStatus.planName} atingido. Faça upgrade para receber mais oportunidades neste ciclo.`,
      };
    }

    const usageRows = await db
      .select()
      .from(opportunityUsage)
      .where(eq(opportunityUsage.subscriptionId, currentStatus.subscriptionId))
      .orderBy(desc(opportunityUsage.criadoEm));

    const latestUsage = usageRows[0];
    const newUsed = latestUsage.oportunidadesUtilizadas + 1;

    await db
      .update(opportunityUsage)
      .set({
        oportunidadesUtilizadas: newUsed,
        atualizadoEm: now,
      })
      .where(eq(opportunityUsage.id, latestUsage.id));

    const updatedStatus: OpportunityUsageStatus = {
      ...currentStatus,
      used: newUsed,
      remaining: Math.max(0, currentStatus.limit - newUsed),
      limitReached: newUsed >= currentStatus.limit,
      upgradeSuggested:
        newUsed >= currentStatus.limit &&
        currentStatus.planSlug !== 'premium' &&
        currentStatus.planSlug !== 'padrinho',
    };

    return {
      allowed: true,
      status: updatedStatus,
    };
  }
}
