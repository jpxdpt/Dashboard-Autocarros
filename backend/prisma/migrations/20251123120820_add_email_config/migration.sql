-- CreateTable
CREATE TABLE "email_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "smtpHost" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT NOT NULL,
    "smtpPassword" TEXT NOT NULL,
    "emailFrom" TEXT NOT NULL,
    "emailTo" TEXT NOT NULL,
    "alertDaysBefore" INTEGER NOT NULL DEFAULT 30,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "testEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "lastTestDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_configs_companyId_key" ON "email_configs"("companyId");

-- AddForeignKey
ALTER TABLE "email_configs" ADD CONSTRAINT "email_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
