/*
  Warnings:

  - You are about to drop the column `isLegacyEntity` on the `entities` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "entities" DROP COLUMN "isLegacyEntity",
ADD COLUMN     "isIxarisEntity" BOOLEAN NOT NULL DEFAULT false;
