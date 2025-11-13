/*
  Warnings:

  - You are about to drop the column `bookedCount` on the `TimeSlot` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `TimeSlot` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."TimeSlot" DROP CONSTRAINT "TimeSlot_availabilityConfigId_fkey";

-- AlterTable
ALTER TABLE "AvailabilityConfig" ADD COLUMN     "breakPeriods" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "TimeSlot" DROP COLUMN "bookedCount",
DROP COLUMN "capacity",
ADD COLUMN     "availableCapacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "dayOfWeek" INTEGER,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "totalCapacity" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "date" DROP NOT NULL,
ALTER COLUMN "date" SET DATA TYPE DATE,
ALTER COLUMN "endTime" SET DATA TYPE TEXT,
ALTER COLUMN "startTime" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "TimeSlot_dayOfWeek_startTime_idx" ON "TimeSlot"("dayOfWeek", "startTime");

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_availabilityConfigId_fkey" FOREIGN KEY ("availabilityConfigId") REFERENCES "AvailabilityConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
