-- RAG por aula (pgvector), votos de resposta e streak freeze.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "User" ADD COLUMN "streakFreezes" INTEGER NOT NULL DEFAULT 1;
-- Opt-out de e-mails transacionais de notificacao (LGPD / Secao 15).
ALTER TABLE "User" ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "QuestionAnswerVote" (
    "answerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionAnswerVote_pkey" PRIMARY KEY ("answerId", "userId"),
    CONSTRAINT "QuestionAnswerVote_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "QuestionAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestionAnswerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LessonChunk" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonChunk_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LessonChunk_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LessonChunk_lessonId_position_key" ON "LessonChunk"("lessonId", "position");
CREATE INDEX "LessonChunk_lessonId_idx" ON "LessonChunk"("lessonId");
-- HNSW para busca por similaridade de cosseno (Neon suporta pgvector >= 0.5).
CREATE INDEX "LessonChunk_embedding_idx" ON "LessonChunk" USING hnsw ("embedding" vector_cosine_ops);

CREATE TABLE "StreakFreezeUse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreakFreezeUse_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StreakFreezeUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StreakFreezeUse_userId_date_key" ON "StreakFreezeUse"("userId", "date");
