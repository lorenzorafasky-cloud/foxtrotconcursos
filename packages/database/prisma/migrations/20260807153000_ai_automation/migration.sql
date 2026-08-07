-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "AiReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAutomationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAutomationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiReviewItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "status" "AiReviewStatus" NOT NULL DEFAULT 'PENDING',
    "content" JSONB NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageEvent_userId_feature_createdAt_idx" ON "AiUsageEvent"("userId", "feature", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_provider_model_createdAt_idx" ON "AiUsageEvent"("provider", "model", "createdAt");

-- CreateIndex
CREATE INDEX "AiAutomationJob_status_createdAt_idx" ON "AiAutomationJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AiAutomationJob_userId_createdAt_idx" ON "AiAutomationJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiReviewItem_status_type_createdAt_idx" ON "AiReviewItem"("status", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AiReviewItem_entityType_entityId_idx" ON "AiReviewItem"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAutomationJob" ADD CONSTRAINT "AiAutomationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReviewItem" ADD CONSTRAINT "AiReviewItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
