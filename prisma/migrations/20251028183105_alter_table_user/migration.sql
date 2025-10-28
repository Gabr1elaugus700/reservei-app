-- DropForeignKey
ALTER TABLE "public"."user" DROP CONSTRAINT "user_tenantId_fkey";

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "tenantId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
