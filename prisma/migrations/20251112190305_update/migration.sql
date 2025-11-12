-- AlterTable
ALTER TABLE "AvailabilityConfig" ADD COLUMN     "date" DATE,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isException" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "dayOfWeek" DROP NOT NULL;
