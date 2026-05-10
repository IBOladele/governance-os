-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('bug', 'feature');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('open', 'in_review', 'approved', 'implementing', 'done', 'rejected');

-- AlterTable
ALTER TABLE "directors" ADD COLUMN     "guideUrl" TEXT,
ADD COLUMN     "remuneration" TEXT,
ADD COLUMN     "responsibilities" TEXT;

-- AlterTable
ALTER TABLE "entities" ADD COLUMN     "formerName" TEXT,
ADD COLUMN     "healthScore" INTEGER,
ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "regulatorUrl" TEXT;

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "type" "SubmissionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pageUrl" TEXT,
    "component" TEXT,
    "severity" TEXT,
    "area" TEXT,
    "priority" TEXT,
    "submittedBy" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'open',
    "prdContent" TEXT,
    "prdGeneratedAt" TIMESTAMP(3),
    "slackMessageTs" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "implementedAt" TIMESTAMP(3),
    "implementationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "submissions_type_idx" ON "submissions"("type");

-- CreateIndex
CREATE INDEX "submissions_submittedBy_idx" ON "submissions"("submittedBy");
