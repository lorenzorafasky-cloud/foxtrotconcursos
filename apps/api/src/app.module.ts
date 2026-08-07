import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "./core/prisma.service";
import { AuthController } from "./modules/auth/auth.controller";
import { AuthService } from "./modules/auth/auth.service";
import { CoursesController } from "./modules/courses/courses.controller";
import { CoursesService } from "./modules/courses/courses.service";
import { QuestionsController } from "./modules/questions/questions.controller";
import { QuestionsService } from "./modules/questions/questions.service";
import { PlannerController } from "./modules/planner/planner.controller";
import { PlannerService } from "./modules/planner/planner.service";
import { FocusController } from "./modules/focus/focus.controller";
import { FocusService } from "./modules/focus/focus.service";
import { AdminController } from "./modules/admin/admin.controller";
import { AdminService } from "./modules/admin/admin.service";
import { PaymentsController } from "./modules/payments/payments.controller";
import { PaymentsService } from "./modules/payments/payments.service";
import { StripePaymentProvider } from "./modules/payments/stripe.provider";
import { AiService } from "./modules/ai/ai.service";
import { FutureController } from "./modules/future/future.controller";
import { HealthController } from "./modules/health.controller";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { ProfessorController } from "./modules/professor/professor.controller";
import { ProfessorService } from "./modules/professor/professor.service";
import { MediaService } from "./modules/media/media.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 90 }]),
    JwtModule.register({})
  ],
  controllers: [
    HealthController,
    AuthController,
    CoursesController,
    QuestionsController,
    PlannerController,
    FocusController,
    PaymentsController,
    AdminController,
    ProfessorController,
    FutureController
  ],
  providers: [
    PrismaService,
    AuthService,
    CoursesService,
    QuestionsService,
    PlannerService,
    FocusService,
    PaymentsService,
    StripePaymentProvider,
    AiService,
    AdminService,
    ProfessorService,
    MediaService,
    JwtAuthGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard }
  ]
})
export class AppModule {}
