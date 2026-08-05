-- CreateTable
CREATE TABLE "ml_v2_reviewed_alerts" (
    "id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "detection_event_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "promoted_candidate_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ml_v2_reviewed_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ml_v2_reviewed_alerts_promotion_id_key" ON "ml_v2_reviewed_alerts"("promotion_id");

-- CreateIndex
CREATE INDEX "idx_v2_reviewed_alert_org" ON "ml_v2_reviewed_alerts"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_v2_reviewed_alert_event" ON "ml_v2_reviewed_alerts"("detection_event_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_v2_reviewed_alert_candidate" ON "ml_v2_reviewed_alerts"("promoted_candidate_id", "created_at");

-- AddForeignKey
ALTER TABLE "ml_v2_reviewed_alerts" ADD CONSTRAINT "ml_v2_reviewed_alerts_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "ml_v2_reviewed_promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_reviewed_alerts" ADD CONSTRAINT "ml_v2_reviewed_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_reviewed_alerts" ADD CONSTRAINT "ml_v2_reviewed_alerts_detection_event_id_fkey" FOREIGN KEY ("detection_event_id") REFERENCES "detection_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_reviewed_alerts" ADD CONSTRAINT "ml_v2_reviewed_alerts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

