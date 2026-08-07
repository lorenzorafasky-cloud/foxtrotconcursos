import { apiRequest } from "./api";

export type BillingInterval = "ONE_TIME" | "MONTHLY" | "YEARLY";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELED";
export type SubscriptionStatus = "INCOMPLETE" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";

export type Plan = {
  id: string;
  code: string;
  name: string;
  description: string;
  interval: BillingInterval;
  amountCents: number;
  currency: string;
  entitlementType: "UNLIMITED" | "COURSE" | "QUESTIONS";
  courseId?: string | null;
};

export type Payment = {
  id: string;
  amountCents: number;
  discountCents: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  paidAt?: string | null;
  canceledAt?: string | null;
  failedAt?: string | null;
  plan?: Plan | null;
  coupon?: { code: string } | null;
};

export type Subscription = {
  id: string;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string | null;
  canceledAt?: string | null;
  plan: Plan;
};

export type AccessStatus = {
  active: boolean;
  unlimited: boolean;
  courseIds: Array<string | null>;
  entitlements: Array<{ id: string; type: string; courseId?: string | null; endsAt?: string | null }>;
};

export type FinancialHistory = {
  payments: Payment[];
  subscriptions: Subscription[];
  access: AccessStatus;
};

export function fetchPlans() {
  return apiRequest<Plan[]>("/payments/plans");
}

export function createCheckout(body: { planId?: string; planCode?: string; courseId?: string; couponCode?: string; idempotencyKey?: string }) {
  return apiRequest<{ payment: Payment; checkoutUrl: string }>("/payments/checkout", { method: "POST", body: JSON.stringify(body) });
}

export function fetchFinancialHistory() {
  return apiRequest<FinancialHistory>("/payments/history");
}

export function fetchAccessStatus() {
  return apiRequest<AccessStatus>("/payments/access");
}

export function cancelSubscription(id: string) {
  return apiRequest<Subscription>(`/payments/subscriptions/${id}/cancel`, { method: "POST" });
}

export function formatMoney(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

export function intervalLabel(interval: BillingInterval) {
  if (interval === "MONTHLY") return "mensal";
  if (interval === "YEARLY") return "anual";
  return "pagamento unico";
}
