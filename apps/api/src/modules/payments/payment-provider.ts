export type CheckoutInput = {
  userId: string;
  courseId?: string;
  amountCents: number;
  description: string;
};

export type CheckoutResult = {
  provider: string;
  providerPaymentId: string;
  checkoutUrl: string;
};

export interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
}
