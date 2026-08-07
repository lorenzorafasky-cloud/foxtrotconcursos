import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { Public } from "../../security/public.decorator";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("checkout")
  checkout(@CurrentUser() user: AuthUser, @Body() body: { courseId?: string; unlimited?: boolean }) {
    return this.payments.checkout(user.id, body);
  }

  @Public()
  @Post("webhooks/stripe")
  stripeWebhook(@Body() body: { data?: { object?: { id?: string } }; type?: string }) {
    if (body.type === "checkout.session.completed" && body.data?.object?.id) {
      return this.payments.markPaid(body.data.object.id);
    }
    return { received: true };
  }
}
