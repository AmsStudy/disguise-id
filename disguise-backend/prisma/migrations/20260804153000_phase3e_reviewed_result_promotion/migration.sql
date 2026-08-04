-- CreateTable
CREATE TABLE "ml_v2_reviewed_promotions" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "promoted_by_id" TEXT NOT NULL,
    "promoted_candidate_id" TEXT NOT NULL,
    "notes" TEXT,
    "promoted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ml_v2_reviewed_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ml_v2_reviewed_promotions_review_id_key" ON "ml_v2_reviewed_promotions"("review_id");

-- CreateIndex
CREATE INDEX "idx_v2_promotion_org" ON "ml_v2_reviewed_promotions"("organization_id", "promoted_at");

-- CreateIndex
CREATE INDEX "idx_v2_promotion_user" ON "ml_v2_reviewed_promotions"("promoted_by_id", "promoted_at");

-- CreateIndex
CREATE INDEX "idx_v2_promotion_candidate" ON "ml_v2_reviewed_promotions"("promoted_candidate_id", "promoted_at");

-- AddForeignKey
ALTER TABLE "ml_v2_reviewed_promotions" ADD CONSTRAINT "ml_v2_reviewed_promotions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "ml_v2_operator_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_reviewed_promotions" ADD CONSTRAINT "ml_v2_reviewed_promotions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_reviewed_promotions" ADD CONSTRAINT "ml_v2_reviewed_promotions_promoted_by_id_fkey" FOREIGN KEY ("promoted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

