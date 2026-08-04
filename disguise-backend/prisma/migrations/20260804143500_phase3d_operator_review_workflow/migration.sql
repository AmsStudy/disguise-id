-- CreateEnum
CREATE TYPE "MlV2ReviewStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MlV2ReviewDecision" AS ENUM ('CONFIRMED', 'REJECTED', 'INCONCLUSIVE');

-- CreateTable
CREATE TABLE "ml_v2_operator_reviews" (
    "id" TEXT NOT NULL,
    "inference_result_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "reviewer_id" TEXT,
    "status" "MlV2ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "decision" "MlV2ReviewDecision",
    "reviewed_candidate_id" TEXT,
    "notes" TEXT,
    "claimed_at" TIMESTAMPTZ,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ml_v2_operator_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ml_v2_operator_reviews_inference_result_id_key" ON "ml_v2_operator_reviews"("inference_result_id");

-- CreateIndex
CREATE INDEX "idx_v2_review_org_status" ON "ml_v2_operator_reviews"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "idx_v2_review_reviewer_status" ON "ml_v2_operator_reviews"("reviewer_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "ml_v2_operator_reviews" ADD CONSTRAINT "ml_v2_operator_reviews_inference_result_id_fkey" FOREIGN KEY ("inference_result_id") REFERENCES "ml_v2_inference_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_operator_reviews" ADD CONSTRAINT "ml_v2_operator_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_operator_reviews" ADD CONSTRAINT "ml_v2_operator_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

