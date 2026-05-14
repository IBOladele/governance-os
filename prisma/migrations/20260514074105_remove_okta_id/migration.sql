/*
  Warnings:

  - You are about to drop the column `oktaId` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_oktaId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "oktaId";
