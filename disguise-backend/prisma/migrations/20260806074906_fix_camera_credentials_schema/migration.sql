-- CreateIndex
CREATE INDEX "idx_audit_org_date" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "idx_audit_user" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_events_org_date" ON "detection_events"("organization_id");

-- CreateIndex
CREATE INDEX "idx_events_source" ON "detection_events"("source_id");

-- RenameForeignKey
ALTER TABLE "ml_v2_candidate_mappings" RENAME CONSTRAINT "ml_v2_candidate_mappings_created_by_id_fkey" TO "ml_v2_candidate_mappings_proposed_by_id_fkey";
