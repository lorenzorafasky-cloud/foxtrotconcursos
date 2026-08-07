import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { BillingInterval, EntitlementType, PaymentStatus, Prisma, SubscriptionStatus } from "@foxtrot/database";
import { PrismaService } from "../../core/prisma.service";
import { StripePaymentProvider } from "./stripe.provider";

type CheckoutInput = {
  planId?: string;
  planCode?: string;
  courseId?: string;
  unlimited?: boolean;
  couponCode?: string;
  idempotencyKey?: string;
};

type StripeObject = Record<string, unknown> & {
  id?: string;
  customer?: string;
  subscription?: string;
  payment_status?: string;
  metadata?: Record<string, string | undefined>;
  amount_paid?: number;
  amount_due?: number;
  currency?: string;
  status?: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  canceled_at?: number;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripePaymentProvider
  ) {}

  plans() {
    return this.prisma.plan.findMany({ where: { active: true }, orderBy: [{ interval: "asc" }, { amountCents: "asc" }] });
  }

  async checkout(userId: string, data: CheckoutInput) {
    if (data.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
      if (existing) return { payment: existing, checkoutUrl: checkoutUrlFrom(existing.metadata) };
    }

    const plan = await this.resolvePlan(data);
    const courseId = plan.courseId ?? data.courseId;
    if (plan.entitlementType === EntitlementType.COURSE && !courseId) {
      throw new BadRequestException("Plano de curso exige um curso.");
    }
    if (courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new NotFoundException("Curso nao encontrado.");
    }
    const coupon = data.couponCode ? await this.validateCoupon(data.couponCode) : null;
    const discountCents = this.discountFor(plan.amountCents, coupon);
    const amountDue = Math.max(0, plan.amountCents - discountCents);
    const subscription = plan.interval === BillingInterval.ONE_TIME
      ? null
      : await this.prisma.subscription.create({
          data: {
            userId,
            planId: plan.id,
            provider: plan.provider,
            status: SubscriptionStatus.INCOMPLETE,
            metadata: { checkout: true }
          }
        });
    const description = plan.name;
    const checkout = await this.stripe.createCheckout({
      userId,
      planId: plan.id,
      planCode: plan.code,
      courseId,
      amountCents: plan.amountCents,
      discountCents,
      description,
      mode: plan.interval === BillingInterval.ONE_TIME ? "payment" : "subscription",
      interval: plan.interval,
      couponCode: coupon?.code,
      idempotencyKey: data.idempotencyKey
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        courseId,
        planId: plan.id,
        subscriptionId: subscription?.id,
        couponId: coupon?.id,
        provider: checkout.provider,
        providerPaymentId: checkout.providerPaymentId,
        providerCustomerId: checkout.providerCustomerId,
        providerSubscriptionId: checkout.providerSubscriptionId,
        idempotencyKey: data.idempotencyKey,
        amountCents: amountDue,
        discountCents,
        currency: plan.currency,
        status: PaymentStatus.PENDING,
        metadata: {
          checkoutUrl: checkout.checkoutUrl,
          planCode: plan.code,
          planInterval: plan.interval,
          grossAmountCents: plan.amountCents,
          couponCode: coupon?.code
        }
      }
    });

    if (coupon && discountCents > 0) {
      await this.prisma.couponRedemption.create({
        data: { couponId: coupon.id, userId, paymentId: payment.id, amountCents: discountCents }
      });
    }

    return { payment, checkoutUrl: checkout.checkoutUrl };
  }

  async handleStripeWebhook(payload: unknown, signature?: string) {
    const event = this.stripe.constructWebhookEvent(payload, signature);
    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: { provider_eventId: { provider: "stripe", eventId: event.id } }
    });
    if (existing?.processedAt) return { received: true, duplicate: true };

    const webhookEvent = existing ?? await this.prisma.paymentWebhookEvent.create({
      data: { provider: "stripe", eventId: event.id, type: event.type, payload: event as unknown as Prisma.InputJsonValue }
    });

    try {
      const result = await this.processStripeEvent(event.type, event.data.object as StripeObject);
      await this.prisma.paymentWebhookEvent.update({ where: { id: webhookEvent.id }, data: { processedAt: new Date(), error: null } });
      return { received: true, processed: true, result };
    } catch (error) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: { error: error instanceof Error ? error.message : "unknown" }
      });
      throw error;
    }
  }

  async subscriptions(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async cancelSubscription(userId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findFirst({ where: { id: subscriptionId, userId }, include: { plan: true } });
    if (!subscription) throw new NotFoundException("Assinatura nao encontrada.");
    if (subscription.status === SubscriptionStatus.CANCELED) return subscription;
    if (!subscription.providerSubscriptionId) {
      return this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.CANCELED, canceledAt: new Date(), cancelAtPeriodEnd: false }
      });
    }
    const canceled = await this.stripe.cancelSubscription(subscription.providerSubscriptionId);
    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: canceled.cancelAtPeriodEnd,
        canceledAt: canceled.canceledAt ?? new Date(),
        status: canceled.cancelAtPeriodEnd ? subscription.status : SubscriptionStatus.CANCELED
      }
    });
  }

  async history(userId: string) {
    const [payments, subscriptions, entitlements] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        include: { plan: true, coupon: true, subscription: true, course: true },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      this.subscriptions(userId),
      this.accessStatus(userId)
    ]);
    return { payments, subscriptions, access: entitlements };
  }

  async accessStatus(userId: string) {
    const now = new Date();
    const entitlements = await this.prisma.entitlement.findMany({
      where: { userId, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      include: { course: true, subscription: { include: { plan: true } } },
      orderBy: { startsAt: "desc" }
    });
    return {
      active: entitlements.length > 0,
      entitlements,
      unlimited: entitlements.some((item) => item.type === EntitlementType.UNLIMITED),
      courseIds: entitlements.filter((item) => item.courseId).map((item) => item.courseId)
    };
  }

  async markPaid(providerPaymentId: string) {
    return this.completeCheckout({ id: providerPaymentId, payment_status: "paid" });
  }

  private async processStripeEvent(type: string, object: StripeObject) {
    if (type === "checkout.session.completed") return this.completeCheckout(object);
    if (type === "checkout.session.expired") return this.markCheckoutStatus(object, PaymentStatus.CANCELED);
    if (type === "payment_intent.payment_failed" || type === "invoice.payment_failed") return this.markPaymentFailed(object);
    if (type === "invoice.payment_succeeded") return this.renewSubscription(object);
    if (type === "customer.subscription.updated") return this.updateSubscription(object);
    if (type === "customer.subscription.deleted") return this.cancelFromProvider(object);
    return { ignored: true, type };
  }

  private async completeCheckout(object: StripeObject) {
    const payment = await this.findPaymentFromStripeObject(object);
    if (payment.status === PaymentStatus.PAID) return payment;
    const providerSubscriptionId = stringValue(object.subscription) ?? payment.providerSubscriptionId ?? undefined;
    const providerCustomerId = stringValue(object.customer) ?? payment.providerCustomerId ?? undefined;
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        providerSubscriptionId,
        providerCustomerId
      },
      include: { plan: true, subscription: true }
    });
    if (updated.couponId && updated.discountCents > 0) {
      await this.prisma.coupon.update({ where: { id: updated.couponId }, data: { redeemedCount: { increment: 1 } } });
    }
    const subscription = await this.activateSubscription(updated, providerSubscriptionId, providerCustomerId);
    await this.grantEntitlement(updated.userId, updated.plan?.entitlementType ?? (updated.courseId ? EntitlementType.COURSE : EntitlementType.UNLIMITED), updated.courseId, {
      source: subscription ? `subscription:${subscription.id}` : `payment:${updated.id}`,
      subscriptionId: subscription?.id,
      endsAt: subscription?.currentPeriodEnd ?? null
    });
    return updated;
  }

  private async activateSubscription(
    payment: { subscriptionId: string | null; planId: string | null; provider: string; userId: string; metadata: Prisma.JsonValue },
    providerSubscriptionId?: string,
    providerCustomerId?: string
  ) {
    if (!payment.subscriptionId || !payment.planId) return null;
    const periodEnd = addBillingPeriod(new Date(), metadataInterval(payment.metadata));
    return this.prisma.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        providerSubscriptionId,
        providerCustomerId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd
      }
    });
  }

  private async renewSubscription(object: StripeObject) {
    const providerSubscriptionId = stringValue(object.subscription);
    if (!providerSubscriptionId) return { ignored: true, reason: "missing-subscription" };
    const subscription = await this.prisma.subscription.findUnique({ where: { providerSubscriptionId }, include: { plan: true } });
    if (!subscription) return { ignored: true, reason: "unknown-subscription" };
    const periodStart = unixDate(object.current_period_start) ?? new Date();
    const periodEnd = unixDate(object.current_period_end) ?? addBillingPeriod(periodStart, subscription.plan.interval);
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.ACTIVE, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd }
    });
    await this.prisma.payment.upsert({
      where: { providerPaymentId: object.id },
      update: { status: PaymentStatus.PAID, paidAt: new Date() },
      create: {
        userId: subscription.userId,
        planId: subscription.planId,
        subscriptionId: subscription.id,
        provider: "stripe",
        providerPaymentId: object.id,
        providerCustomerId: stringValue(object.customer),
        providerSubscriptionId,
        amountCents: Number(object.amount_paid ?? object.amount_due ?? subscription.plan.amountCents),
        currency: String(object.currency ?? subscription.plan.currency).toUpperCase(),
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        metadata: { renewal: true }
      }
    });
    await this.grantEntitlement(subscription.userId, subscription.plan.entitlementType, subscription.plan.courseId, {
      source: `subscription:${subscription.id}`,
      subscriptionId: subscription.id,
      endsAt: periodEnd
    });
    return subscription;
  }

  private async updateSubscription(object: StripeObject) {
    const providerSubscriptionId = object.id;
    if (!providerSubscriptionId) return { ignored: true, reason: "missing-subscription" };
    return this.prisma.subscription.update({
      where: { providerSubscriptionId },
      data: {
        status: stripeSubscriptionStatus(object.status),
        cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
        canceledAt: unixDate(object.canceled_at),
        currentPeriodStart: unixDate(object.current_period_start),
        currentPeriodEnd: unixDate(object.current_period_end)
      }
    });
  }

  private async cancelFromProvider(object: StripeObject) {
    const providerSubscriptionId = object.id;
    if (!providerSubscriptionId) return { ignored: true, reason: "missing-subscription" };
    const subscription = await this.prisma.subscription.update({
      where: { providerSubscriptionId },
      data: { status: SubscriptionStatus.CANCELED, canceledAt: unixDate(object.canceled_at) ?? new Date(), cancelAtPeriodEnd: false }
    });
    await this.prisma.entitlement.updateMany({
      where: { subscriptionId: subscription.id, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
      data: { endsAt: new Date() }
    });
    return subscription;
  }

  private async markCheckoutStatus(object: StripeObject, status: PaymentStatus) {
    const payment = await this.findPaymentFromStripeObject(object);
    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        canceledAt: status === PaymentStatus.CANCELED ? new Date() : undefined,
        failedAt: status === PaymentStatus.FAILED ? new Date() : undefined
      }
    });
  }

  private async markPaymentFailed(object: StripeObject) {
    const providerSubscriptionId = stringValue(object.subscription);
    if (providerSubscriptionId) {
      await this.prisma.subscription.updateMany({ where: { providerSubscriptionId }, data: { status: SubscriptionStatus.PAST_DUE } });
    }
    const providerPaymentId = object.id;
    if (!providerPaymentId) return { ignored: true, reason: "missing-payment" };
    return this.prisma.payment.updateMany({
      where: { providerPaymentId },
      data: { status: PaymentStatus.FAILED, failedAt: new Date() }
    });
  }

  private async findPaymentFromStripeObject(object: StripeObject) {
    const providerPaymentId = object.id;
    if (!providerPaymentId) throw new BadRequestException("Evento sem identificador de pagamento.");
    const payment = await this.prisma.payment.findUnique({ where: { providerPaymentId }, include: { plan: true, subscription: true } });
    if (!payment) throw new NotFoundException("Pagamento nao encontrado para o evento.");
    return payment;
  }

  private async resolvePlan(data: CheckoutInput) {
    if (data.planId) {
      const plan = await this.prisma.plan.findFirst({ where: { id: data.planId, active: true } });
      if (!plan) throw new NotFoundException("Plano nao encontrado.");
      return plan;
    }
    if (data.planCode) {
      const plan = await this.prisma.plan.findFirst({ where: { code: data.planCode, active: true } });
      if (!plan) throw new NotFoundException("Plano nao encontrado.");
      return plan;
    }
    if (data.unlimited) {
      const plan = await this.prisma.plan.findFirst({ where: { code: "ilimitado-mensal", active: true } });
      if (!plan) throw new NotFoundException("Plano ilimitado nao configurado.");
      return plan;
    }
    if (data.courseId) {
      const plan = await this.prisma.plan.findFirst({ where: { code: "curso-avulso", active: true } });
      if (!plan) throw new NotFoundException("Plano de curso avulso nao configurado.");
      return plan;
    }
    throw new BadRequestException("Informe um plano para checkout.");
  }

  private async validateCoupon(code: string) {
    const normalized = code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({ where: { code: normalized } });
    const now = new Date();
    if (!coupon || !coupon.active || coupon.startsAt > now || (coupon.endsAt && coupon.endsAt < now)) {
      throw new NotFoundException("Cupom invalido.");
    }
    if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
      throw new ConflictException("Cupom esgotado.");
    }
    return coupon;
  }

  private discountFor(amountCents: number, coupon: { percentOff: number | null; amountOffCents: number | null } | null) {
    if (!coupon) return 0;
    const percent = coupon.percentOff ? Math.floor((amountCents * coupon.percentOff) / 100) : 0;
    const fixed = coupon.amountOffCents ?? 0;
    return Math.min(amountCents, Math.max(percent, fixed));
  }

  private async grantEntitlement(
    userId: string,
    type: EntitlementType,
    courseId: string | null,
    data: { source: string; subscriptionId?: string | null; endsAt?: Date | null }
  ) {
    const existing = await this.prisma.entitlement.findFirst({
      where: { userId, type, courseId, source: data.source }
    });
    if (existing) {
      return this.prisma.entitlement.update({ where: { id: existing.id }, data: { endsAt: data.endsAt ?? null, subscriptionId: data.subscriptionId } });
    }
    return this.prisma.entitlement.create({
      data: {
        userId,
        type,
        courseId,
        source: data.source,
        subscriptionId: data.subscriptionId,
        endsAt: data.endsAt ?? null
      }
    });
  }
}

function checkoutUrlFrom(metadata: Prisma.JsonValue) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && "checkoutUrl" in metadata) {
    return String(metadata.checkoutUrl ?? "");
  }
  return "";
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function unixDate(value: unknown) {
  return typeof value === "number" ? new Date(value * 1000) : undefined;
}

function stripeSubscriptionStatus(status: unknown) {
  if (status === "active" || status === "trialing") return SubscriptionStatus.ACTIVE;
  if (status === "past_due" || status === "unpaid") return SubscriptionStatus.PAST_DUE;
  if (status === "canceled") return SubscriptionStatus.CANCELED;
  if (status === "incomplete" || status === "incomplete_expired") return SubscriptionStatus.INCOMPLETE;
  return SubscriptionStatus.ACTIVE;
}

function metadataInterval(metadata: Prisma.JsonValue) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && metadata.planInterval) {
    return metadata.planInterval as BillingInterval;
  }
  return BillingInterval.MONTHLY;
}

function addBillingPeriod(start: Date, interval: BillingInterval) {
  const next = new Date(start);
  if (interval === BillingInterval.YEARLY) next.setFullYear(next.getFullYear() + 1);
  else if (interval === BillingInterval.MONTHLY) next.setMonth(next.getMonth() + 1);
  return next;
}
