import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "./core/prisma.service";
import { RequestIdMiddleware } from "./core/request-id.middleware";
import { SecureLogger } from "./core/secure-logger.service";
import { loadAppConfig } from "./config/env";
import { AuthController } from "./modules/auth/auth.controller";
import { AuthService } from "./modules/auth/auth.service";
import { MailerService } from "./modules/auth/mailer.service";
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
import { AiController } from "./modules/ai/ai.controller";
import { FutureController } from "./modules/future/future.controller";
import { HealthController } from "./modules/health.controller";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { ProfessorController } from "./modules/professor/professor.controller";
import { ProfessorService } from "./modules/professor/professor.service";
import { MediaService } from "./modules/media/media.service";
import { AuditInterceptor } from "./security/audit.interceptor";
import { GamificationController } from "./modules/gamification/gamification.controller";
import { GamificationService } from "./modules/gamification/gamification.service";
import { PrivacyController } from "./modules/privacy/privacy.controller";
import { PrivacyService } from "./modules/privacy/privacy.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const appConfig = loadAppConfig();
        return [{ ttl: appConfig.rateLimitTtlMs, limit: appConfig.rateLimitMax }];
      }
    }),
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
    GamificationController,
    AiController,
    PrivacyController,
    FutureController
  ],
  providers: [
    PrismaService,
    AuthService,
    MailerService,
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
    GamificationService,
    PrivacyService,
    SecureLogger,
    JwtAuthGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
