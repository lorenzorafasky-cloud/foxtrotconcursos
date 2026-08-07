-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- AlterTable
ALTER TABLE "QuestionAttempt" ADD COLUMN "simulationId" TEXT;

-- CreateTable
CREATE TABLE "QuestionFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "SimulationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "filters" JSONB,
    "questionCount" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationQuestion" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "SimulationQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFavorite_userId_questionId_key" ON "QuestionFavorite"("userId", "questionId");

-- CreateIndex
CREATE INDEX "QuestionFavorite_userId_createdAt_idx" ON "QuestionFavorite"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Simulation_userId_status_createdAt_idx" ON "Simulation"("userId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationQuestion_simulationId_questionId_key" ON "SimulationQuestion"("simulationId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationQuestion_simulationId_position_key" ON "SimulationQuestion"("simulationId", "position");

-- CreateIndex
CREATE INDEX "SimulationQuestion_questionId_idx" ON "SimulationQuestion"("questionId");

-- CreateIndex
CREATE INDEX "QuestionAttempt_simulationId_questionId_idx" ON "QuestionAttempt"("simulationId", "questionId");

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionFavorite" ADD CONSTRAINT "QuestionFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionFavorite" ADD CONSTRAINT "QuestionFavorite_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationQuestion" ADD CONSTRAINT "SimulationQuestion_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationQuestion" ADD CONSTRAINT "SimulationQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
