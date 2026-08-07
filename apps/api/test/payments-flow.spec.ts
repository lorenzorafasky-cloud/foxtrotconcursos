import { ConflictException } from "@nestjs/common";
import { BillingInterval, EntitlementType, PaymentStatus, SubscriptionStatus } from "@foxtrot/database";
import { describe, expect, it, vi } from "vitest";
import { PaymentsService } from "../src/modules/payments/payments.service";

describe("PaymentsService billing flows", () => {
  it("creates a subscription checkout with coupon redemption and idempotency key", async () => {
    const prisma = makePrismaMock();
    const provider = makeProvider();
    const service = new PaymentsService(prisma as never, provider as never);

    await expect(
      service.checkout("student-1", { planCode: "ilimitado-mensal", couponCode: "FOXTROT10", idempotencyKey: "checkout-1" })
    ).resolves.toMatchObject({
      checkoutUrl: "https://checkout.example/session"
    });
    expect(provider.createCheckout).toHaveBeenCalledWith(expect.objectContaining({
      mode: "subscription",
      amountCents: 12990,
      discountCents: 1299,
      idempotencyKey: "checkout-1"
    }));
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amountCents: 11691,
        discountCents: 1299,
        status: PaymentStatus.PENDING,
        idempotencyKey: "checkout-1"
      })
    });
    expect(prisma.couponRedemption.create).toHaveBeenCalledWith({
      data: { couponId: "coupon-1", userId: "student-1", paymentId: "payment-1", amountCents: 1299 }
    });
  });

  it("returns the existing checkout for duplicated idempotency keys", async () => {
    const prisma = makePrismaMock({
      existingPayment: { id: "payment-1", metadata: { checkoutUrl: "https://checkout.example/existing" } }
    });
    const provider = makeProvider();
    const service = new PaymentsService(prisma as never, provider as never);

    await expect(service.checkout("student-1", { planCode: "ilimitado-mensal", idempotencyKey: "checkout-1" })).resolves.toMatchObject({
      checkoutUrl: "https://checkout.example/existing"
    });
    expect(provider.createCheckout).not.toHaveBeenCalled();
  });

  it("rejects exhausted coupons before checkout", async () => {
    const prisma = makePrismaMock({
      coupon: { id: "coupon-1", code: "FOXTROT10", active: true, startsAt: past(), endsAt: null, percentOff: 10, amountOffCents: null, maxRedemptions: 1, redeemedCount: 1 }
    });
    const service = new PaymentsService(prisma as never, makeProvider() as never);

    await expect(service.checkout("student-1", { planCode: "ilimitado-mensal", couponCode: "FOXTROT10" })).rejects.toBeInstanceOf(ConflictException);
  });

  it("processes checkout completion once and grants access", async () => {
    const prisma = makePrismaMock();
    const provider = makeProvider({
      event: {
        id: "evt-1",
        type: "checkout.session.completed",
        data: { object: { id: "cs_1", payment_status: "paid", subscription: "sub_1", customer: "cus_1" } }
      }
    });
    const service = new PaymentsService(prisma as never, provider as never);

    await expect(service.handleStripeWebhook({ id: "evt-1" }, "sig")).resolves.toMatchObject({ received: true, processed: true });
    expect(prisma.paymentWebhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ provider: "stripe", eventId: "evt-1", type: "checkout.session.completed" })
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: expect.objectContaining({ status: PaymentStatus.PAID, providerSubscriptionId: "sub_1", providerCustomerId: "cus_1" }),
      include: { plan: true, subscription: true }
    });
    expect(prisma.entitlement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "student-1", type: EntitlementType.UNLIMITED, subscriptionId: "subscription-1" })
    });
  });

  it("ignores duplicated already processed webhooks", async () => {
    const prisma = makePrismaMock({
      existingWebhook: { id: "webhook-1", processedAt: new Date() }
    });
    const service = new PaymentsService(prisma as never, makeProvider() as never);

    await expect(service.handleStripeWebhook({ id: "evt-1" }, "sig")).resolves.toMatchObject({ duplicate: true });
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it("marks failed invoice and subscription as past due", async () => {
    const prisma = makePrismaMock();
    const provider = makeProvider({
      event: {
        id: "evt-fail",
        type: "invoice.payment_failed",
        data: { object: { id: "in_1", subscription: "sub_1" } }
      }
    });
    const service = new PaymentsService(prisma as never, provider as never);

    await expect(service.handleStripeWebhook({ id: "evt-fail" }, "sig")).resolves.toMatchObject({ processed: true });
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { providerSubscriptionId: "sub_1" },
      data: { status: SubscriptionStatus.PAST_DUE }
    });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { providerPaymentId: "in_1" },
      data: { status: PaymentStatus.FAILED, failedAt: expect.any(Date) }
    });
  });

  it("cancels an active subscription at the provider", async () => {
    const prisma = makePrismaMock();
    const provider = makeProvider();
    const service = new PaymentsService(prisma as never, provider as never);

    await expect(service.cancelSubscription("student-1", "subscription-1")).resolves.toMatchObject({ id: "subscription-1" });
    expect(provider.cancelSubscription).toHaveBeenCalledWith("sub_1");
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "subscription-1" },
      data: expect.objectContaining({ cancelAtPeriodEnd: true, canceledAt: expect.any(Date) })
    });
  });
});

function makeProvider({
  event = {
    id: "evt-1",
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_status: "paid", subscription: "sub_1", customer: "cus_1" } }
  }
}: { event?: Record<string, unknown> } = {}) {
  return {
    createCheckout: vi.fn().mockResolvedValue({
      provider: "stripe",
      providerPaymentId: "cs_1",
      checkoutUrl: "https://checkout.example/session"
    }),
    constructWebhookEvent: vi.fn().mockReturnValue(event),
    cancelSubscription: vi.fn().mockResolvedValue({
      providerSubscriptionId: "sub_1",
      cancelAtPeriodEnd: true,
      canceledAt: new Date()
    })
  };
}

function makePrismaMock({
  existingPayment = null,
  existingWebhook = null,
  coupon = { id: "coupon-1", code: "FOXTROT10", active: true, startsAt: past(), endsAt: null, percentOff: 10, amountOffCents: null, maxRedemptions: 100, redeemedCount: 0 }
}: {
  existingPayment?: Record<string, unknown> | null;
  existingWebhook?: Record<string, unknown> | null;
  coupon?: Record<string, unknown> | null;
} = {}) {
  const plan = {
    id: "plan-1",
    code: "ilimitado-mensal",
    name: "Foxtrot Ilimitado Mensal",
    description: "Acesso total",
    interval: BillingInterval.MONTHLY,
    amountCents: 12990,
    currency: "BRL",
    entitlementType: EntitlementType.UNLIMITED,
    courseId: null,
    provider: "stripe"
  };
  const subscription = {
    id: "subscription-1",
    userId: "student-1",
    planId: "plan-1",
    provider: "stripe",
    providerSubscriptionId: "sub_1",
    status: SubscriptionStatus.ACTIVE,
    plan
  };
  const payment = {
    id: "payment-1",
    userId: "student-1",
    courseId: null,
    planId: "plan-1",
    subscriptionId: "subscription-1",
    provider: "stripe",
    providerPaymentId: "cs_1",
    providerCustomerId: null,
    providerSubscriptionId: null,
    amountCents: 12990,
    discountCents: 0,
    currency: "BRL",
    status: PaymentStatus.PENDING,
    metadata: { planInterval: BillingInterval.MONTHLY, checkoutUrl: "https://checkout.example/session" },
    plan,
    subscription
  };
  return {
    plan: {
      findMany: vi.fn().mockResolvedValue([plan]),
      findFirst: vi.fn().mockResolvedValue(plan)
    },
    payment: {
      findUnique: vi.fn(({ where }) => {
        if ("idempotencyKey" in where) return Promise.resolve(existingPayment);
        return Promise.resolve(payment);
      }),
      findMany: vi.fn().mockResolvedValue([payment]),
      create: vi.fn().mockResolvedValue({ id: "payment-1", metadata: { checkoutUrl: "https://checkout.example/session" } }),
      update: vi.fn(({ data, include }) => Promise.resolve({ ...payment, ...data, ...(include ? { plan, subscription } : {}) })),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn(({ create }) => Promise.resolve({ id: "payment-renewal", ...create }))
    },
    coupon: {
      findUnique: vi.fn().mockResolvedValue(coupon),
      update: vi.fn().mockResolvedValue(coupon)
    },
    couponRedemption: {
      create: vi.fn().mockResolvedValue({ id: "redemption-1" })
    },
    subscription: {
      create: vi.fn().mockResolvedValue({ id: "subscription-1" }),
      findFirst: vi.fn().mockResolvedValue(subscription),
      findMany: vi.fn().mockResolvedValue([subscription]),
      findUnique: vi.fn().mockResolvedValue(subscription),
      update: vi.fn(({ where, data }) => Promise.resolve({ ...subscription, ...data, id: where.id ?? "subscription-1" })),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    paymentWebhookEvent: {
      findUnique: vi.fn().mockResolvedValue(existingWebhook),
      create: vi.fn().mockResolvedValue({ id: "webhook-1" }),
      update: vi.fn().mockResolvedValue({ id: "webhook-1" })
    },
    entitlement: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "entitlement-1" }),
      update: vi.fn().mockResolvedValue({ id: "entitlement-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    }
  };
}

function past() {
  return new Date(Date.now() - 60_000);
}
