/*
  Warnings:

  - You are about to drop the `BlockedTimeSlot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScheduleConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Slot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SpecialDateCapacity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SpecialDateSchedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeeklyCapacity` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `timeSlotId` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Slot" DROP CONSTRAINT "Slot_scheduleConfigId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Slot" DROP CONSTRAINT "Slot_specialDateScheduleId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "timeSlotId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."BlockedTimeSlot";

-- DropTable
DROP TABLE "public"."ScheduleConfig";

-- DropTable
DROP TABLE "public"."Slot";

-- DropTable
DROP TABLE "public"."SpecialDateCapacity";

-- DropTable
DROP TABLE "public"."SpecialDateSchedule";

-- DropTable
DROP TABLE "public"."WeeklyCapacity";

-- CreateTable
CREATE TABLE "DaySchedule" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT NOT NULL DEFAULT '09:00',
    "endTime" TEXT NOT NULL DEFAULT '18:00',
    "maxCapacity" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DaySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialDate" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT,
    "endTime" TEXT,
    "maxCapacity" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "maxCapacity" INTEGER NOT NULL DEFAULT 20,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DaySchedule_dayOfWeek_key" ON "DaySchedule"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialDate_date_key" ON "SpecialDate"("date");

-- CreateIndex
CREATE INDEX "SpecialDate_date_idx" ON "SpecialDate"("date");

-- CreateIndex
CREATE INDEX "TimeSlot_date_idx" ON "TimeSlot"("date");

-- CreateIndex
CREATE INDEX "TimeSlot_date_isAvailable_idx" ON "TimeSlot"("date", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlot_date_time_key" ON "TimeSlot"("date", "time");

-- CreateIndex
CREATE INDEX "Booking_timeSlotId_idx" ON "Booking"("timeSlotId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
