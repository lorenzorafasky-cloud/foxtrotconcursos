import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { AuditAction } from "../../security/audit.decorator";
import { Public } from "../../security/public.decorator";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get("plans")
  plans() {
    return this.payments.plans();
  }

  @AuditAction("payments.checkout.create")
  @Post("checkout")
  checkout(
    @CurrentUser() user: AuthUser,
    @Body() body: { planId?: string; planCode?: string; courseId?: string; unlimited?: boolean; couponCode?: string; idempotencyKey?: string }
  ) {
    return this.payments.checkout(user.id, body);
  }

  @Get("access")
  access(@CurrentUser() user: AuthUser) {
    return this.payments.accessStatus(user.id);
  }

  @Get("history")
  history(@CurrentUser() user: AuthUser) {
    return this.payments.history(user.id);
  }

  @Get("subscriptions")
  subscriptions(@CurrentUser() user: AuthUser) {
    return this.payments.subscriptions(user.id);
  }

  @AuditAction("payments.subscription.cancel")
  @Post("subscriptions/:id/cancel")
  cancelSubscription(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.payments.cancelSubscription(user.id, id);
  }

  @Public()
  @Post("webhooks/stripe")
  stripeWebhook(@Body() body: unknown, @Headers("stripe-signature") signature?: string) {
    return this.payments.handleStripeWebhook(body, signature);
  }
}
