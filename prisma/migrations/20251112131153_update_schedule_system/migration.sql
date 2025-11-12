/*
  Warnings:

  - You are about to drop the column `isAvailable` on the `TimeSlot` table. All the data in the column will be lost.
  - You are about to drop the column `maxCapacity` on the `TimeSlot` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `TimeSlot` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `TimeSlot` table. All the data in the column will be lost.
  - You are about to drop the `DaySchedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SpecialDate` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `endTime` to the `TimeSlot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `TimeSlot` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_timeSlotId_fkey";

-- DropIndex
DROP INDEX "public"."Booking_timeSlotId_idx";

-- DropIndex
DROP INDEX "public"."TimeSlot_date_idx";

-- DropIndex
DROP INDEX "public"."TimeSlot_date_isAvailable_idx";

-- DropIndex
DROP INDEX "public"."TimeSlot_date_time_key";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "timeSlotId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TimeSlot" DROP COLUMN "isAvailable",
DROP COLUMN "maxCapacity",
DROP COLUMN "reason",
DROP COLUMN "time",
ADD COLUMN     "availabilityConfigId" TEXT,
ADD COLUMN     "bookedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "public"."DaySchedule";

-- DropTable
DROP TABLE "public"."SpecialDate";

-- CreateTable
CREATE TABLE "WeeklyCapacity" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialDateCapacity" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "limit" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialDateCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityConfig" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "capacityPerSlot" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyCapacity_dayOfWeek_key" ON "WeeklyCapacity"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialDateCapacity_date_key" ON "SpecialDateCapacity"("date");

-- CreateIndex
CREATE INDEX "TimeSlot_date_startTime_idx" ON "TimeSlot"("date", "startTime");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_availabilityConfigId_fkey" FOREIGN KEY ("availabilityConfigId") REFERENCES "AvailabilityConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
