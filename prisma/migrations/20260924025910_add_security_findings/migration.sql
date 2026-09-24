-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'RUN_SCAN';

-- CreateTable
CREATE TABLE "security_findings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "ruleId" TEXT,
    "severity" "Severity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT,
    "line" INTEGER,
    "cwe" TEXT,
    "owasp" TEXT,
    "nistTask" TEXT,
    "isoControls" TEXT[],
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_findings_projectId_idx" ON "security_findings"("projectId");

-- CreateIndex
CREATE INDEX "security_findings_projectId_severity_idx" ON "security_findings"("projectId", "severity");

-- AddForeignKey
ALTER TABLE "security_findings" ADD CONSTRAINT "security_findings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
