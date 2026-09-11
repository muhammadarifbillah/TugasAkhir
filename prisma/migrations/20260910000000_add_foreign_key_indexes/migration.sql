-- Add indexes for foreign key columns.
--
-- PostgreSQL does NOT create an index for a foreign key automatically. Without
-- these, every lookup by owner or parent (the app's hottest queries) degrades to
-- a sequential scan: projects by user, messages by chat, recommendations and
-- snapshots by stage, keys/models by user, audit rows by user.

-- projects(userId): dashboard listing, ownership checks on every project route.
CREATE INDEX "projects_userId_idx" ON "projects"("userId");

-- chats(userId) and chats(projectStageId)
CREATE INDEX "chats_userId_idx" ON "chats"("userId");
CREATE INDEX "chats_projectStageId_idx" ON "chats"("projectStageId");

-- messages(chatId, createdAt): the chat history query orders by createdAt desc.
CREATE INDEX "messages_chatId_createdAt_idx" ON "messages"("chatId", "createdAt");

-- ai_recommendations(projectStageId, originMessageId): read back after persist
-- and de-duplicated on reparse.
CREATE INDEX "ai_recommendations_projectStageId_originMessageId_idx"
  ON "ai_recommendations"("projectStageId", "originMessageId");

-- ai_recommendations(nistControlId)
CREATE INDEX "ai_recommendations_nistControlId_idx" ON "ai_recommendations"("nistControlId");

-- website_snapshots(projectStageId) and (revisionId)
CREATE INDEX "website_snapshots_projectStageId_idx" ON "website_snapshots"("projectStageId");
CREATE INDEX "website_snapshots_revisionId_idx" ON "website_snapshots"("revisionId");

-- project_revisions(projectId)
CREATE INDEX "project_revisions_projectId_idx" ON "project_revisions"("projectId");

-- project_stages(stageId)
CREATE INDEX "project_stages_stageId_idx" ON "project_stages"("stageId");

-- deliverables(projectId)
CREATE INDEX "deliverables_projectId_idx" ON "deliverables"("projectId");

-- user_api_keys(userId) and user_models(userId): settings page and model lookup.
CREATE INDEX "user_api_keys_userId_idx" ON "user_api_keys"("userId");
CREATE INDEX "user_models_userId_idx" ON "user_models"("userId");
CREATE INDEX "user_api_keys_providerCode_idx" ON "user_api_keys"("providerCode");
CREATE INDEX "user_models_providerCode_idx" ON "user_models"("providerCode");
CREATE INDEX "user_models_apiKeyId_idx" ON "user_models"("apiKeyId");

-- audit_logs(userId) and (createdAt): audit trail reads.
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
