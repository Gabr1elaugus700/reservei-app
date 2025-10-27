-- CreateTable
CREATE TABLE "WeeklyCapacity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
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
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "limit" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialDateCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyCapacity_tenantId_dayOfWeek_key" ON "WeeklyCapacity"("tenantId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialDateCapacity_tenantId_date_key" ON "SpecialDateCapacity"("tenantId", "date");

-- AddForeignKey
ALTER TABLE "WeeklyCapacity" ADD CONSTRAINT "WeeklyCapacity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDateCapacity" ADD CONSTRAINT "SpecialDateCapacity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
