/*
  Warnings:

  - You are about to drop the column `emailVerificationToken` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `passwordResetToken` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `passwordResetTokenExpiry` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "emailVerificationToken",
DROP COLUMN "password",
DROP COLUMN "passwordResetToken",
DROP COLUMN "passwordResetTokenExpiry";
