-- AlterTable
ALTER TABLE "ai_recommendations" ADD COLUMN     "requirementIds" TEXT[];

-- CreateTable
CREATE TABLE "security_requirements" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reqId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "nistControlId" INTEGER,
    "isoControls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_links" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "filePath" TEXT,
    "stageCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recommended',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_requirements_projectId_idx" ON "security_requirements"("projectId");

-- CreateIndex
CREATE INDEX "security_requirements_nistControlId_idx" ON "security_requirements"("nistControlId");

-- CreateIndex
CREATE UNIQUE INDEX "security_requirements_projectId_reqId_key" ON "security_requirements"("projectId", "reqId");

-- CreateIndex
CREATE INDEX "requirement_links_requirementId_idx" ON "requirement_links"("requirementId");

-- CreateIndex
CREATE INDEX "requirement_links_recommendationId_idx" ON "requirement_links"("recommendationId");

-- AddForeignKey
ALTER TABLE "security_requirements" ADD CONSTRAINT "security_requirements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_requirements" ADD CONSTRAINT "security_requirements_nistControlId_fkey" FOREIGN KEY ("nistControlId") REFERENCES "nist_ssdf_controls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_links" ADD CONSTRAINT "requirement_links_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "security_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_links" ADD CONSTRAINT "requirement_links_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ai_recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
