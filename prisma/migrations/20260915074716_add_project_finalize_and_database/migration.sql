-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "database" JSONB,
ADD COLUMN     "finalizedAt" TIMESTAMP(3);
