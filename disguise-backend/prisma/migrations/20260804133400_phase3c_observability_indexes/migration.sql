-- CreateIndex
CREATE INDEX "ml_v2_inference_results_created_at_idx" ON "ml_v2_inference_results"("created_at");

-- CreateIndex
CREATE INDEX "ml_v2_inference_results_status_created_at_idx" ON "ml_v2_inference_results"("status", "created_at");

-- CreateIndex
CREATE INDEX "ml_v2_inference_results_frame_decision_created_at_idx" ON "ml_v2_inference_results"("frame_decision", "created_at");

