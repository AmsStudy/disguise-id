-- Rename columns safely
ALTER TABLE "ml_v2_candidate_mappings" RENAME COLUMN "created_by_id" TO "proposed_by_id";
ALTER TABLE "ml_v2_candidate_mappings" RENAME COLUMN "created_at" TO "proposed_at";
ALTER TABLE "ml_v2_candidate_mappings" RENAME COLUMN "reason" TO "proposal_reason";

-- Add missing Maker-Checker historical fields
ALTER TABLE "ml_v2_candidate_mappings" ADD COLUMN "approved_at" TIMESTAMPTZ;
ALTER TABLE "ml_v2_candidate_mappings" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "ml_v2_candidate_mappings" ADD COLUMN "revocation_reason" TEXT;

-- Enforce mapping concurrency invariant
CREATE UNIQUE INDEX "ml_v2_mapping_active_pending_candidate_idx" ON "ml_v2_candidate_mappings"("organization_id", "gallery_candidate_id") WHERE "status" IN ('PENDING', 'ACTIVE');
