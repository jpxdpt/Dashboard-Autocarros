-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('EXTINTORES', 'PNEUS', 'REVISOES', 'LICENCAS_TCC', 'LICENCAS_COMUNITARIAS', 'INSPECOES');

-- CreateTable
CREATE TABLE "buses" (
    "id" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "lastInspectionDate" TIMESTAMP(3) NOT NULL,
    "nextInspectionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_alerts" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "inspectionType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buses_matricula_key" ON "buses"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_busId_type_key" ON "inspections"("busId", "type");

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_busId_fkey" FOREIGN KEY ("busId") REFERENCES "buses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_alerts" ADD CONSTRAINT "email_alerts_busId_fkey" FOREIGN KEY ("busId") REFERENCES "buses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
