import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@foxtrot/database";
import { PrismaService } from "../../core/prisma.service";
import {
  CreateDataSubjectRequestDto,
  DataSubjectRequestStatusValue,
  RecordConsentDto,
  ResolveDataSubjectRequestDto
} from "./privacy.dto";

type PrivacyDb = PrismaService & {
  privacyConsent: {
    create(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown>;
  };
  dataSubjectRequest: {
    create(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<unknown | null>;
    update(args: unknown): Promise<unknown>;
  };
  aiUsageEvent: {
    findMany(args: unknown): Promise<unknown>;
  };
};

@Injectable()
export class PrivacyService {
  private readonly privacyDb: PrivacyDb;

  constructor(private readonly prisma: PrismaService) {
    this.privacyDb = prisma as PrivacyDb;
  }

  async recordConsent(
    userId: string,
    body: RecordConsentDto,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ) {
    return this.privacyDb.privacyConsent.create({
      data: {
        userId,
        subject: body.subject,
        version: body.version,
        accepted: body.accepted,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { requestId: context.requestId ?? null } satisfies Prisma.InputJsonValue
      }
    });
  }

  async listConsents(userId: string) {
    return this.privacyDb.privacyConsent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  async createRequest(
    userId: string,
    body: CreateDataSubjectRequestDto,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ) {
    return this.privacyDb.dataSubjectRequest.create({
      data: {
        userId,
        type: body.type,
        description: body.description,
        metadata: {
          requestId: context.requestId ?? null,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null
        } satisfies Prisma.InputJsonValue
      }
    });
  }

  async listMyRequests(userId: string) {
    return this.privacyDb.dataSubjectRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  async listRequests(status?: DataSubjectRequestStatusValue) {
    return this.privacyDb.dataSubjectRequest.findMany({
      where: status ? { status } : undefined,
      include: { user: { select: { id: true, email: true, fullName: true, nickname: true } } },
      orderBy: { createdAt: "desc" },
      take: 200
    });
  }

  async resolveRequest(id: string, body: ResolveDataSubjectRequestDto) {
    const existing = await this.privacyDb.dataSubjectRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Solicitacao LGPD nao encontrada.");

    return this.privacyDb.dataSubjectRequest.update({
      where: { id },
      data: {
        status: body.status,
        response: body.response,
        completedAt: body.status === "COMPLETED" || body.status === "REJECTED" ? new Date() : null
      }
    });
  }

  async exportMyData(userId: string) {
    const [
      user,
      onboarding,
      enrollments,
      lessonProgress,
      lessonRatings,
      questionAttempts,
      questionFavorites,
      simulations,
      notes,
      studyGoals,
      focusSessions,
      flashcards,
      payments,
      subscriptions,
      aiUsageEvents,
      consents,
      requests
    ] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          nickname: true,
          avatarUrl: true,
          emailVerifiedAt: true,
          twoFactorEnabled: true,
          onboardingComplete: true,
          createdAt: true,
          updatedAt: true,
          roles: { select: { role: { select: { name: true } } } },
          permissions: { select: { permission: { select: { key: true } }, granted: true } }
        }
      }),
      this.prisma.onboardingProfile.findUnique({ where: { userId } }),
      this.prisma.courseEnrollment.findMany({
        where: { userId },
        include: { course: { select: { id: true, title: true, slug: true } } }
      }),
      this.prisma.lessonProgress.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
      this.prisma.lessonRating.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      this.prisma.questionAttempt.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 1000 }),
      this.prisma.questionFavorite.findMany({ where: { userId } }),
      this.prisma.simulation.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 200 }),
      this.prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 500 }),
      this.prisma.studyGoal.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 }),
      this.prisma.focusSession.findMany({ where: { userId }, orderBy: { startedAt: "desc" }, take: 1000 }),
      this.prisma.flashcard.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 1000 }),
      this.prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 200 }),
      this.prisma.subscription.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 200 }),
      this.privacyDb.aiUsageEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 }),
      this.listConsents(userId),
      this.listMyRequests(userId)
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user,
      onboarding,
      enrollments,
      lessonProgress,
      lessonRatings,
      questionAttempts,
      questionFavorites,
      simulations,
      notes,
      studyGoals,
      focusSessions,
      flashcards,
      payments,
      subscriptions,
      aiUsageEvents,
      privacy: {
        consents,
        requests
      }
    };
  }
}
