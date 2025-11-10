/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ScheduleConfig` table. All the data in the column will be lost.
  - You are about to drop the column `isOpen` on the `ScheduleConfig` table. All the data in the column will be lost.
  - You are about to drop the column `maxCapacity` on the `ScheduleConfig` table. All the data in the column will be lost.
  - You are about to drop the column `slotInterval` on the `ScheduleConfig` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ScheduleConfig` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SpecialDateSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `isOpen` on the `SpecialDateSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `maxCapacity` on the `SpecialDateSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `SpecialDateSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `slotInterval` on the `SpecialDateSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `SpecialDateSchedule` table. All the data in the column will be lost.
  - Added the required column `interval` to the `ScheduleConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `interval` to the `SpecialDateSchedule` table without a default value. This is not possible if the table is not empty.
  - Made the column `startTime` on table `SpecialDateSchedule` required. This step will fail if there are existing NULL values in that column.
  - Made the column `endTime` on table `SpecialDateSchedule` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."ScheduleConfig_dayOfWeek_key";

-- AlterTable
ALTER TABLE "ScheduleConfig" DROP COLUMN "createdAt",
DROP COLUMN "isOpen",
DROP COLUMN "maxCapacity",
DROP COLUMN "slotInterval",
DROP COLUMN "updatedAt",
ADD COLUMN     "interval" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SpecialDateSchedule" DROP COLUMN "createdAt",
DROP COLUMN "isOpen",
DROP COLUMN "maxCapacity",
DROP COLUMN "reason",
DROP COLUMN "slotInterval",
DROP COLUMN "updatedAt",
ADD COLUMN     "interval" INTEGER NOT NULL,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "startTime" SET NOT NULL,
ALTER COLUMN "endTime" SET NOT NULL;

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL,
    "reason" TEXT,
    "scheduleConfigId" TEXT,
    "specialDateScheduleId" TEXT,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedTimeSlot" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "BlockedTimeSlot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_scheduleConfigId_fkey" FOREIGN KEY ("scheduleConfigId") REFERENCES "ScheduleConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_specialDateScheduleId_fkey" FOREIGN KEY ("specialDateScheduleId") REFERENCES "SpecialDateSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
