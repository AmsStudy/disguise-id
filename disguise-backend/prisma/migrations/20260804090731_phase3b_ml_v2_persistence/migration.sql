-- CreateTable
CREATE TABLE "ml_v2_inference_results" (
    "id" TEXT NOT NULL,
    "detection_event_id" TEXT NOT NULL,
    "job_id" TEXT,
    "request_id" TEXT,
    "camera_session_id" TEXT,
    "track_id" TEXT,
    "status" VARCHAR(50) NOT NULL,
    "error_code" VARCHAR(50),
    "model_version" VARCHAR(50),
    "gallery_version" VARCHAR(100),
    "original_valid" BOOLEAN,
    "original_candidate_id" TEXT,
    "original_score" DOUBLE PRECISION,
    "original_second_score" DOUBLE PRECISION,
    "original_margin" DOUBLE PRECISION,
    "reconstructed_valid" BOOLEAN,
    "reconstructed_candidate_id" TEXT,
    "reconstructed_score" DOUBLE PRECISION,
    "reconstructed_second_score" DOUBLE PRECISION,
    "reconstructed_margin" DOUBLE PRECISION,
    "selected_branch" VARCHAR(50),
    "candidate_id" TEXT,
    "score" DOUBLE PRECISION,
    "margin" DOUBLE PRECISION,
    "frame_decision" VARCHAR(100),
    "service_processing_ms" INTEGER,
    "round_trip_latency_ms" INTEGER,
    "requires_operator_verification" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_v2_inference_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ml_v2_inference_results_detection_event_id_key" ON "ml_v2_inference_results"("detection_event_id");

-- AddForeignKey
ALTER TABLE "ml_v2_inference_results" ADD CONSTRAINT "ml_v2_inference_results_detection_event_id_fkey" FOREIGN KEY ("detection_event_id") REFERENCES "detection_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
