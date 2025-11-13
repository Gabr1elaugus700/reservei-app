-- CreateTable
CREATE TABLE "LastConfigSync" (
    "id" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LastConfigSync_pkey" PRIMARY KEY ("id")
);
