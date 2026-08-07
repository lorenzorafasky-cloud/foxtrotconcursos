import argon2 from "argon2";
import { PrismaClient, RoleName, CourseStatus, FeatureFlagKey, QuestionKind, ChallengeStatus, BillingInterval, EntitlementType } from "@prisma/client";

const prisma = new PrismaClient();

const rolePermissions: Record<RoleName, string[]> = {
  ADMIN_MASTER: [
    "admin:impersonate",
    "admin:manage-users",
    "admin:manage-content",
    "admin:manage-ai",
    "admin:manage-payments",
    "teacher:answer-questions",
    "teacher:publish-lessons",
    "teacher:grade-essays",
    "student:access-courses",
    "student:access-questions",
    "student:use-focus",
    "student:use-planner",
    "student:use-gamification",
    "student:use-ai",
    "ai:generate-materials",
    "ai:review-materials"
  ],
  PROFESSOR: ["teacher:answer-questions", "teacher:publish-lessons", "teacher:grade-essays", "ai:generate-materials", "ai:review-materials"],
  ALUNO_ILIMITADO: [
    "student:access-courses",
    "student:access-questions",
    "student:use-focus",
    "student:use-planner",
    "student:use-gamification",
    "student:use-ai"
  ],
  ALUNO_CURSO_ESPECIFICO: [
    "student:access-courses",
    "student:access-questions",
    "student:use-focus",
    "student:use-planner",
    "student:use-gamification",
    "student:use-ai"
  ]
};

async function seedRoles() {
  const permissionKeys = [...new Set(Object.values(rolePermissions).flat())];

  for (const key of permissionKeys) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        description: `Permissao ${key}`
      }
    });
  }

  for (const [name, keys] of Object.entries(rolePermissions) as [RoleName, string[]][]) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `Perfil ${name}`
      }
    });

    for (const key of keys) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key } });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }
}

async function createUser(email: string, roleName: RoleName, fullName: string, nickname: string, options?: { twoFactorSecret?: string }) {
  // O login concatena PASSWORD_PEPPER a senha antes do argon2 — o seed precisa
  // hashear da mesma forma, senao as credenciais de exemplo nao funcionam.
  const passwordHash = await argon2.hash(`Foxtrot@123${process.env.PASSWORD_PEPPER ?? ""}`);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      fullName,
      nickname,
      emailVerifiedAt: new Date(),
      passwordHash,
      twoFactorEnabled: Boolean(options?.twoFactorSecret),
      twoFactorSecret: options?.twoFactorSecret
    }
  });

  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id }
  });

  return user;
}

async function seedCatalog() {
  const board = await prisma.board.upsert({
    where: { name: "CESPE / CEBRASPE" },
    update: {},
    create: { name: "CESPE / CEBRASPE" }
  });

  const career = await prisma.career.upsert({
    where: { name: "Policial" },
    update: {},
    create: { name: "Policial" }
  });

  const institution = await prisma.institution.upsert({
    where: { name: "Policia Federal" },
    update: {},
    create: { name: "Policia Federal" }
  });

  const position = await prisma.position.upsert({
    where: { name: "Agente de Policia Federal" },
    update: {},
    create: { name: "Agente de Policia Federal" }
  });

  const subject = await prisma.subject.upsert({
    where: { name: "Direito Constitucional" },
    update: {},
    create: { name: "Direito Constitucional" }
  });

  const topic = await prisma.topic.upsert({
    where: { subjectId_name: { subjectId: subject.id, name: "Direitos fundamentais" } },
    update: {},
    create: { subjectId: subject.id, name: "Direitos fundamentais" }
  });

  await prisma.exam.create({
    data: {
      name: "PF Agente 2027",
      careerId: career.id,
      boardId: board.id,
      examDate: new Date("2027-05-17T12:00:00.000Z")
    }
  }).catch(() => undefined);

  const course = await prisma.course.upsert({
    where: { slug: "operacao-pf-pos-edital" },
    update: {},
    create: {
      title: "Operacao PF - Pos-edital",
      slug: "operacao-pf-pos-edital",
      description: "Trilha completa para PF com aulas, questoes comentadas e foco diario.",
      status: CourseStatus.POS_EDITAL,
      careerId: career.id,
      boardId: board.id,
      area: "Carreiras policiais",
      coverImageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
      workloadMinutes: 4200,
      publishedAt: new Date()
    }
  });

  const module = await prisma.courseModule.upsert({
    where: { courseId_position: { courseId: course.id, position: 1 } },
    update: {},
    create: { courseId: course.id, title: "Fundamentos constitucionais", position: 1 }
  });

  const professor = await prisma.user.findUniqueOrThrow({ where: { email: "professor@foxtrot.local" } });
  await prisma.professorSubject.upsert({
    where: { userId_subjectId: { userId: professor.id, subjectId: subject.id } },
    update: {},
    create: { userId: professor.id, subjectId: subject.id }
  });

  const lesson = await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: module.id, slug: "direitos-fundamentais-em-operacao" } },
    update: {},
    create: {
      moduleId: module.id,
      subjectId: subject.id,
      topicId: topic.id,
      teacherId: professor.id,
      title: "Direitos fundamentais em operacao",
      slug: "direitos-fundamentais-em-operacao",
      description: "Aula tática sobre aplicacao pratica dos direitos fundamentais em provas policiais.",
      position: 1,
      streamVideoUid: "sample-stream-uid",
      durationSeconds: 2700,
      publishedAt: new Date()
    }
  });

  await prisma.lessonAsset.createMany({
    data: [
      {
        lessonId: lesson.id,
        type: "TRANSCRIPT",
        url: "r2://foxtrot-assets/transcripts/direitos-fundamentais.txt",
        metadata: { language: "pt-BR", synced: true }
      },
      {
        lessonId: lesson.id,
        type: "SUMMARY",
        url: "r2://foxtrot-assets/summaries/direitos-fundamentais.md",
        metadata: { provider: "anthropic" }
      },
      {
        lessonId: lesson.id,
        type: "SLIDE",
        url: "r2://foxtrot-assets/slides/direitos-fundamentais.pdf"
      }
    ],
    skipDuplicates: true
  });

  const question = await prisma.question.upsert({
    where: { code: "FOX-DCON-0001" },
    update: {},
    create: {
      code: "FOX-DCON-0001",
      kind: QuestionKind.MULTIPLE_CHOICE,
      statement: "A inviolabilidade domiciliar admite ingresso sem consentimento do morador em caso de flagrante delito.",
      alternatives: [
        { id: "C", text: "Certo" },
        { id: "E", text: "Errado" }
      ],
      correctAnswer: "C",
      year: 2025,
      boardId: board.id,
      careerId: career.id,
      subjectId: subject.id,
      topicId: topic.id,
      institutionId: institution.id,
      positionId: position.id,
      sourceExam: "Simulado Foxtrot",
      explanation: "A Constituicao admite excecoes como flagrante delito, desastre, socorro ou determinacao judicial durante o dia."
    }
  });

  await prisma.questionAiAnswer.upsert({
    where: { questionId: question.id },
    update: {},
    create: {
      questionId: question.id,
      body: "A assertiva esta correta. O ingresso sem consentimento e possivel nas hipoteses constitucionais expressas.",
      model: "seed"
    }
  });

  return { course };
}

async function seedGamification() {
  const achievements = [
    {
      key: "first-focus-session",
      title: "Primeira Area Foco",
      description: "Registrou a primeira sessao de foco.",
      icon: "timer",
      xpReward: 20,
      requirement: { metric: "focusSessions", target: 1 }
    },
    {
      key: "ten-correct-questions",
      title: "Mira calibrada",
      description: "Acertou 10 questoes.",
      icon: "target",
      xpReward: 50,
      requirement: { metric: "correctQuestions", target: 10 }
    },
    {
      key: "five-day-streak",
      title: "Consistencia operacional",
      description: "Manteve 5 dias ativos de estudo.",
      icon: "flame",
      xpReward: 80,
      requirement: { metric: "streakDays", target: 5 }
    },
    {
      key: "thousand-xp",
      title: "Subida de patente",
      description: "Alcancou 1000 XP acumulados.",
      icon: "trophy",
      xpReward: 120,
      requirement: { metric: "totalXp", target: 1000 }
    }
  ];

  for (const achievement of achievements) {
    await prisma.achievementDefinition.upsert({
      where: { key: achievement.key },
      update: achievement,
      create: achievement
    });
  }

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + 7);
  await prisma.challenge.upsert({
    where: { slug: "semana-operacional-300-min" },
    update: {
      title: "Semana operacional",
      description: "Complete 300 minutos liquidos de foco nesta semana.",
      status: ChallengeStatus.ACTIVE,
      metric: "weeklyNetMinutes",
      targetValue: 300,
      rewardXp: 150,
      startsAt: now,
      endsAt
    },
    create: {
      slug: "semana-operacional-300-min",
      title: "Semana operacional",
      description: "Complete 300 minutos liquidos de foco nesta semana.",
      status: ChallengeStatus.ACTIVE,
      metric: "weeklyNetMinutes",
      targetValue: 300,
      rewardXp: 150,
      startsAt: now,
      endsAt
    }
  });
}

async function seedBilling(courseId: string) {
  await prisma.plan.upsert({
    where: { code: "curso-avulso" },
    update: {
      name: "Curso avulso",
      description: "Acesso vitalicio ao curso selecionado.",
      interval: BillingInterval.ONE_TIME,
      amountCents: 9900,
      entitlementType: EntitlementType.COURSE,
      active: true
    },
    create: {
      code: "curso-avulso",
      name: "Curso avulso",
      description: "Acesso vitalicio ao curso selecionado.",
      interval: BillingInterval.ONE_TIME,
      amountCents: 9900,
      entitlementType: EntitlementType.COURSE,
      active: true
    }
  });

  await prisma.plan.upsert({
    where: { code: "ilimitado-mensal" },
    update: {
      name: "Foxtrot Ilimitado Mensal",
      description: "Acesso a cursos, questoes e produtividade enquanto a assinatura estiver ativa.",
      interval: BillingInterval.MONTHLY,
      amountCents: 12990,
      entitlementType: EntitlementType.UNLIMITED,
      active: true
    },
    create: {
      code: "ilimitado-mensal",
      name: "Foxtrot Ilimitado Mensal",
      description: "Acesso a cursos, questoes e produtividade enquanto a assinatura estiver ativa.",
      interval: BillingInterval.MONTHLY,
      amountCents: 12990,
      entitlementType: EntitlementType.UNLIMITED,
      active: true
    }
  });

  await prisma.plan.upsert({
    where: { code: "operacao-pf-anual" },
    update: {
      name: "Operacao PF Anual",
      description: "Assinatura anual do curso Operacao PF.",
      interval: BillingInterval.YEARLY,
      amountCents: 99900,
      entitlementType: EntitlementType.COURSE,
      courseId,
      active: true
    },
    create: {
      code: "operacao-pf-anual",
      name: "Operacao PF Anual",
      description: "Assinatura anual do curso Operacao PF.",
      interval: BillingInterval.YEARLY,
      amountCents: 99900,
      entitlementType: EntitlementType.COURSE,
      courseId,
      active: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: "FOXTROT10" },
    update: { percentOff: 10, active: true },
    create: {
      code: "FOXTROT10",
      description: "Desconto inicial para alunos Foxtrot.",
      percentOff: 10,
      maxRedemptions: 100,
      active: true
    }
  });
}

async function main() {
  await seedRoles();

  const admin = await createUser("admin@foxtrot.local", "ADMIN_MASTER", "Administrador Foxtrot", "comando");
  await createUser("professor@foxtrot.local", "PROFESSOR", "Professor Operacional", "instrutor");
  const student = await createUser("aluno@foxtrot.local", "ALUNO_ILIMITADO", "Aluno Foxtrot", "recruta01");

  // Usuario dedicado aos testes E2E autenticados (Playwright): 2FA habilitado
  // com segredo TOTP deterministico (sobrescrevivel via E2E_TOTP_SECRET).
  const e2eStudent = await createUser("e2e-aluno@foxtrot.local", "ALUNO_ILIMITADO", "Aluno E2E", "e2e-operador", {
    twoFactorSecret: process.env.E2E_TOTP_SECRET ?? "JBSWY3DPEHPK3PXP"
  });

  const { course } = await seedCatalog();
  await seedGamification();
  await seedBilling(course.id);

  await prisma.entitlement.upsert({
    where: { id: "seed-entitlement-unlimited" },
    update: {},
    create: {
      id: "seed-entitlement-unlimited",
      userId: student.id,
      type: "UNLIMITED",
      source: "seed"
    }
  });

  await prisma.entitlement.upsert({
    where: { id: "seed-entitlement-e2e" },
    update: {},
    create: {
      id: "seed-entitlement-e2e",
      userId: e2eStudent.id,
      type: "UNLIMITED",
      source: "seed-e2e"
    }
  });

  const targetExam = await prisma.exam.findFirst({ where: { name: "PF Agente 2027" } });
  if (targetExam) {
    await prisma.onboardingProfile.upsert({
      where: { userId: e2eStudent.id },
      update: { targetExamId: targetExam.id },
      create: {
        userId: e2eStudent.id,
        age: 27,
        studyExperience: "1-2 anos",
        careerGoal: "Policia Federal",
        targetExamId: targetExam.id,
        platformGoals: ["aprovacao-rapida"],
        dailyNetStudyGoalMins: 180,
        examDate: targetExam.examDate
      }
    });
    await prisma.user.update({ where: { id: e2eStudent.id }, data: { onboardingComplete: true } });
  }

  await prisma.payment.create({
    data: {
      userId: student.id,
      courseId: course.id,
      provider: "stripe",
      providerPaymentId: "seed-payment",
      amountCents: 9900,
      status: "PAID",
      metadata: { source: "seed" }
    }
  }).catch(() => undefined);

  await prisma.studyList.create({
    data: {
      userId: student.id,
      title: "Meu Dia",
      isMyDay: true,
      tasks: {
        create: [
          {
            title: "Resolver 30 questoes de Constitucional",
            priority: "STARRED",
            dueDate: new Date()
          },
          {
            title: "Revisar aula de direitos fundamentais",
            priority: "HIGH"
          }
        ]
      }
    }
  }).catch(() => undefined);

  await prisma.xpEvent.createMany({
    data: [
      { userId: student.id, source: "seed:question", points: 120 },
      { userId: student.id, source: "seed:focus", points: 180 },
      { userId: admin.id, source: "seed:admin", points: 10 }
    ],
    skipDuplicates: true
  });

  for (const key of Object.values(FeatureFlagKey)) {
    await prisma.featureFlag.upsert({
      where: { key },
      update: {},
      create: { key, enabled: false }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
