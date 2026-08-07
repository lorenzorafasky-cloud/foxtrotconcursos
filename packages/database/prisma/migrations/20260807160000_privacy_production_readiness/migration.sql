CREATE TYPE "DataSubjectRequestType" AS ENUM (
  'ACCESS',
  'CORRECTION',
  'DELETION',
  'PORTABILITY',
  'ANONYMIZATION',
  'CONSENT_WITHDRAWAL',
  'AUTOMATED_DECISION_REVIEW'
);

CREATE TYPE "DataSubjectRequestStatus" AS ENUM (
  'OPEN',
  'IN_REVIEW',
  'COMPLETED',
  'REJECTED'
);

CREATE TABLE "PrivacyConsent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "subject" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "accepted" BOOLEAN NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PrivacyConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataSubjectRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "DataSubjectRequestType" NOT NULL,
  "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'OPEN',
  "description" TEXT,
  "response" TEXT,
  "metadata" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivacyConsent_userId_subject_createdAt_idx" ON "PrivacyConsent"("userId", "subject", "createdAt");
CREATE INDEX "PrivacyConsent_subject_version_createdAt_idx" ON "PrivacyConsent"("subject", "version", "createdAt");
CREATE INDEX "DataSubjectRequest_userId_status_createdAt_idx" ON "DataSubjectRequest"("userId", "status", "createdAt");
CREATE INDEX "DataSubjectRequest_type_status_createdAt_idx" ON "DataSubjectRequest"("type", "status", "createdAt");

ALTER TABLE "PrivacyConsent"
  ADD CONSTRAINT "PrivacyConsent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DataSubjectRequest"
  ADD CONSTRAINT "DataSubjectRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
