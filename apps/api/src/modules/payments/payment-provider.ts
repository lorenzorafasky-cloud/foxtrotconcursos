export type CheckoutInput = {
  userId: string;
  planId: string;
  planCode: string;
  courseId?: string;
  amountCents: number;
  discountCents?: number;
  description: string;
  mode: "payment" | "subscription";
  interval: "ONE_TIME" | "MONTHLY" | "YEARLY";
  couponCode?: string;
  idempotencyKey?: string;
};

export type CheckoutResult = {
  provider: string;
  providerPaymentId: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  checkoutUrl: string;
};

export type ProviderWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

export interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<{ providerSubscriptionId: string; cancelAtPeriodEnd: boolean; canceledAt?: Date }>;
  constructWebhookEvent(payload: unknown, signature?: string): ProviderWebhookEvent;
}
