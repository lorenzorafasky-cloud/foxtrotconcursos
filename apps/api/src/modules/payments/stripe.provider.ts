import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { CheckoutInput, CheckoutResult, PaymentProvider, ProviderWebhookEvent } from "./payment-provider";

@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new ServiceUnavailableException("STRIPE_SECRET_KEY nao configurada.");
    const amountCents = Math.max(0, input.amountCents - (input.discountCents ?? 0));
    const body = new URLSearchParams({
      mode: input.mode,
      success_url: `${process.env.APP_URL ?? "http://localhost:3000"}/pagamento/sucesso`,
      cancel_url: `${process.env.APP_URL ?? "http://localhost:3000"}/pagamento/cancelado`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "brl",
      "line_items[0][price_data][unit_amount]": String(amountCents),
      "line_items[0][price_data][product_data][name]": input.description,
      "metadata[userId]": input.userId,
      "metadata[planId]": input.planId,
      "metadata[planCode]": input.planCode,
      "metadata[courseId]": input.courseId ?? ""
    });
    if (input.mode === "subscription") {
      body.set("line_items[0][price_data][recurring][interval]", input.interval === "YEARLY" ? "year" : "month");
    }
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/x-www-form-urlencoded",
        ...(input.idempotencyKey ? { "idempotency-key": input.idempotencyKey } : {})
      },
      body
    });
    if (!response.ok) throw new ServiceUnavailableException("Falha ao criar checkout no Stripe.");
    const payload = (await response.json()) as { id: string; url: string; customer?: string; subscription?: string };
    return {
      provider: "stripe",
      providerPaymentId: payload.id,
      providerCustomerId: payload.customer,
      providerSubscriptionId: payload.subscription,
      checkoutUrl: payload.url
    };
  }

  async cancelSubscription(providerSubscriptionId: string) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new ServiceUnavailableException("STRIPE_SECRET_KEY nao configurada.");
    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${providerSubscriptionId}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ cancel_at_period_end: "true" })
    });
    if (!response.ok) throw new ServiceUnavailableException("Falha ao cancelar assinatura no Stripe.");
    const payload = (await response.json()) as { id: string; cancel_at_period_end?: boolean; canceled_at?: number };
    return {
      providerSubscriptionId: payload.id,
      cancelAtPeriodEnd: Boolean(payload.cancel_at_period_end),
      canceledAt: payload.canceled_at ? new Date(payload.canceled_at * 1000) : undefined
    };
  }

  constructWebhookEvent(payload: unknown, signature?: string): ProviderWebhookEvent {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
    if (secret) this.verifySignature(serialized, signature, secret);
    const event = typeof payload === "string" ? JSON.parse(payload) as ProviderWebhookEvent : payload as ProviderWebhookEvent;
    if (!event?.id || !event.type || !event.data?.object) {
      throw new ServiceUnavailableException("Evento Stripe invalido.");
    }
    return event;
  }

  private verifySignature(payload: string, signature: string | undefined, secret: string) {
    if (!signature) throw new ServiceUnavailableException("Assinatura Stripe ausente.");
    const timestamp = signature.split(",").find((part) => part.startsWith("t="))?.slice(2);
    const expected = signature.split(",").find((part) => part.startsWith("v1="))?.slice(3);
    if (!timestamp || !expected) throw new ServiceUnavailableException("Assinatura Stripe invalida.");
    const signedPayload = `${timestamp}.${payload}`;
    const digest = createHmac("sha256", secret).update(signedPayload).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const digestBuffer = Buffer.from(digest, "hex");
    if (expectedBuffer.length !== digestBuffer.length || !timingSafeEqual(expectedBuffer, digestBuffer)) {
      throw new ServiceUnavailableException("Assinatura Stripe rejeitada.");
    }
  }
}
