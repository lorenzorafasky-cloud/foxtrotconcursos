import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { StripePaymentProvider } from "./stripe.provider";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripePaymentProvider
  ) {}

  async checkout(userId: string, data: { courseId?: string; unlimited?: boolean }) {
    const course = data.courseId ? await this.prisma.course.findUnique({ where: { id: data.courseId } }) : null;
    if (data.courseId && !course) throw new NotFoundException("Curso nao encontrado.");
    const amountCents = data.unlimited ? 12990 : 9900;
    const description = data.unlimited ? "Foxtrot Ilimitado" : `Curso Foxtrot - ${course?.title}`;
    const checkout = await this.stripe.createCheckout({ userId, courseId: data.courseId, amountCents, description });
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        courseId: data.courseId,
        provider: checkout.provider,
        providerPaymentId: checkout.providerPaymentId,
        amountCents,
        status: "PENDING"
      }
    });
    return { payment, checkoutUrl: checkout.checkoutUrl };
  }

  async markPaid(providerPaymentId: string) {
    const payment = await this.prisma.payment.update({
      where: { providerPaymentId },
      data: { status: "PAID" }
    });
    await this.prisma.entitlement.create({
      data: {
        userId: payment.userId,
        courseId: payment.courseId,
        type: payment.courseId ? "COURSE" : "UNLIMITED",
        source: payment.provider
      }
    });
    return payment;
  }
}
