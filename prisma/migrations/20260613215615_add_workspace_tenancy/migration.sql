-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Competitor" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "KeywordHistory" ADD COLUMN     "workspaceId" TEXT;

-- CreateIndex
CREATE INDEX "Channel_workspaceId_idx" ON "Channel"("workspaceId");

-- CreateIndex
CREATE INDEX "Competitor_workspaceId_idx" ON "Competitor"("workspaceId");

-- CreateIndex
CREATE INDEX "KeywordHistory_workspaceId_idx" ON "KeywordHistory"("workspaceId");
