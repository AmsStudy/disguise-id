-- DropIndex
DROP INDEX IF EXISTS "idx_alerts_assigned";
-- CreateIndex
CREATE INDEX "idx_alerts_assigned" ON "alerts"("assigned_to");

-- DropIndex
DROP INDEX IF EXISTS "idx_cctv_org";
-- CreateIndex
CREATE INDEX "idx_cctv_org" ON "cctv_sources"("organization_id");

-- DropIndex
DROP INDEX IF EXISTS "idx_events_match";
-- CreateIndex
CREATE INDEX "idx_events_match" ON "detection_events"("best_match_id");

-- DropIndex
DROP INDEX IF EXISTS "idx_users_org";
-- CreateIndex
CREATE INDEX "idx_users_org" ON "users"("organization_id");

-- DropIndex
DROP INDEX IF EXISTS "idx_users_email";
-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- DropIndex
DROP INDEX IF EXISTS "idx_watchlist_org";
-- CreateIndex
CREATE INDEX "idx_watchlist_org" ON "watchlist_persons"("organization_id");
