/*
  Warnings:

  - You are about to drop the column `embedding` on the `detection_events` table. All the data in the column will be lost.
  - You are about to drop the column `embedding` on the `watchlist_persons` table. All the data in the column will be lost.
  - You are about to drop the column `embedding` on the `watchlist_photos` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_alerts_org_status";

-- DropIndex
DROP INDEX "idx_audit_org_date";

-- DropIndex
DROP INDEX "idx_audit_user";

-- DropIndex
DROP INDEX "idx_events_org_date";

-- DropIndex
DROP INDEX "idx_events_source";

-- AlterTable
ALTER TABLE "cctv_sources" ADD COLUMN     "ip_address" VARCHAR(255),
ADD COLUMN     "password" VARCHAR(255),
ADD COLUMN     "username" VARCHAR(255);

-- AlterTable
ALTER TABLE "detection_events" DROP COLUMN "embedding";

-- AlterTable
ALTER TABLE "watchlist_persons" DROP COLUMN "embedding";

-- AlterTable
ALTER TABLE "watchlist_photos" DROP COLUMN "embedding";

-- CreateIndex
CREATE INDEX "idx_alerts_org_status" ON "alerts"("organization_id");

-- CreateIndex
CREATE INDEX "idx_alerts_assigned" ON "alerts"("assigned_to");

-- CreateIndex
CREATE INDEX "idx_audit_org_date" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "idx_audit_user" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_cctv_org" ON "cctv_sources"("organization_id");

-- CreateIndex
CREATE INDEX "idx_events_org_date" ON "detection_events"("organization_id");

-- CreateIndex
CREATE INDEX "idx_events_source" ON "detection_events"("source_id");

-- CreateIndex
CREATE INDEX "idx_events_match" ON "detection_events"("best_match_id");

-- CreateIndex
CREATE INDEX "idx_users_org" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_watchlist_org" ON "watchlist_persons"("organization_id");
