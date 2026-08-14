-- CreateTable
CREATE TABLE "weekly_days_off" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_days_off_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "weekly_days_off_companyId_driverId_weekStart_dayOfWeek_key"
ON "weekly_days_off"("companyId", "driverId", "weekStart", "dayOfWeek");
CREATE INDEX "weekly_days_off_companyId_weekStart_idx" ON "weekly_days_off"("companyId", "weekStart");
CREATE INDEX "weekly_days_off_driverId_idx" ON "weekly_days_off"("driverId");

ALTER TABLE "weekly_days_off" ADD CONSTRAINT "weekly_days_off_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weekly_days_off" ADD CONSTRAINT "weekly_days_off_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
