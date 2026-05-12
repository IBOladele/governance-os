-- CreateTable
CREATE TABLE "key_dates" (
    "id" TEXT NOT NULL,
    "entityId" TEXT,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "description" TEXT,
    "recurrence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "key_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "key_dates_date_idx" ON "key_dates"("date");

-- CreateIndex
CREATE INDEX "key_dates_entityId_idx" ON "key_dates"("entityId");

-- CreateIndex
CREATE INDEX "key_dates_status_idx" ON "key_dates"("status");

-- AddForeignKey
ALTER TABLE "key_dates" ADD CONSTRAINT "key_dates_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
