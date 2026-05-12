-- CreateEnum
CREATE TYPE "ShareholderType" AS ENUM ('founding', 'nominee', 'investor', 'corporate', 'individual');

-- CreateEnum
CREATE TYPE "ShareholderLoanStatus" AS ENUM ('active', 'repaid', 'converted', 'written_off');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password" TEXT;

-- CreateTable
CREATE TABLE "shareholders" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "shareholderType" "ShareholderType" NOT NULL,
    "shareClass" TEXT NOT NULL DEFAULT 'Ordinary',
    "sharesHeld" INTEGER NOT NULL DEFAULT 0,
    "totalShares" INTEGER NOT NULL DEFAULT 0,
    "percentageOwned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "entityOwnerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appointmentDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shareholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shareholder_loans" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "shareholderId" TEXT NOT NULL,
    "principal" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interestRate" DOUBLE PRECISION,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3),
    "isConvertible" BOOLEAN NOT NULL DEFAULT false,
    "conversionTerms" TEXT,
    "status" "ShareholderLoanStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shareholder_loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shareholders_entityId_idx" ON "shareholders"("entityId");

-- CreateIndex
CREATE INDEX "shareholders_entityOwnerId_idx" ON "shareholders"("entityOwnerId");

-- CreateIndex
CREATE INDEX "shareholder_loans_entityId_idx" ON "shareholder_loans"("entityId");

-- CreateIndex
CREATE INDEX "shareholder_loans_shareholderId_idx" ON "shareholder_loans"("shareholderId");

-- AddForeignKey
ALTER TABLE "shareholders" ADD CONSTRAINT "shareholders_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shareholders" ADD CONSTRAINT "shareholders_entityOwnerId_fkey" FOREIGN KEY ("entityOwnerId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shareholder_loans" ADD CONSTRAINT "shareholder_loans_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shareholder_loans" ADD CONSTRAINT "shareholder_loans_shareholderId_fkey" FOREIGN KEY ("shareholderId") REFERENCES "shareholders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
