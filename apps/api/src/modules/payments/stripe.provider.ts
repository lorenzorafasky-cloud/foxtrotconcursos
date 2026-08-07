import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { CheckoutInput, CheckoutResult, PaymentProvider } from "./payment-provider";

@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new ServiceUnavailableException("STRIPE_SECRET_KEY nao configurada.");
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        mode: "payment",
        success_url: `${process.env.APP_URL ?? "http://localhost:3000"}/pagamento/sucesso`,
        cancel_url: `${process.env.APP_URL ?? "http://localhost:3000"}/pagamento/cancelado`,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "brl",
        "line_items[0][price_data][unit_amount]": String(input.amountCents),
        "line_items[0][price_data][product_data][name]": input.description,
        "metadata[userId]": input.userId,
        "metadata[courseId]": input.courseId ?? ""
      })
    });
    if (!response.ok) throw new ServiceUnavailableException("Falha ao criar checkout no Stripe.");
    const payload = (await response.json()) as { id: string; url: string };
    return { provider: "stripe", providerPaymentId: payload.id, checkoutUrl: payload.url };
  }
}
