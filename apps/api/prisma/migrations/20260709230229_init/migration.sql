-- AlterTable
ALTER TABLE "Arena" ADD COLUMN "cnpj" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "cpf" TEXT;

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
