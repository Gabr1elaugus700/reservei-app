/*
  Warnings:

  - A unique constraint covering the columns `[date,startTime]` on the table `TimeSlot` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TimeSlot_date_startTime_key" ON "TimeSlot"("date", "startTime");
