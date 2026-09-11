-- AlterTable
ALTER TABLE "model_providers" ADD COLUMN     "defaultModel" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "badgePublic" BOOLEAN NOT NULL DEFAULT false;
