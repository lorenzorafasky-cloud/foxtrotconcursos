-- AlterTable
ALTER TABLE "Flashcard" ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StudyGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "targetNetSeconds" INTEGER NOT NULL DEFAULT 0,
    "targetQuestions" INTEGER NOT NULL DEFAULT 0,
    "targetFlashcards" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProductivityPreference" (
    "userId" TEXT NOT NULL,
    "focusMode" "FocusMode" NOT NULL DEFAULT 'POMODORO',
    "pomodoroSeconds" INTEGER NOT NULL DEFAULT 1500,
    "breakSeconds" INTEGER NOT NULL DEFAULT 300,
    "longBreakSeconds" INTEGER NOT NULL DEFAULT 900,
    "autoStartBreaks" BOOLEAN NOT NULL DEFAULT false,
    "soundSettings" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProductivityPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "StudyGoal_userId_startsAt_endsAt_idx" ON "StudyGoal"("userId", "startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "StudyGoal" ADD CONSTRAINT "StudyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProductivityPreference" ADD CONSTRAINT "UserProductivityPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
