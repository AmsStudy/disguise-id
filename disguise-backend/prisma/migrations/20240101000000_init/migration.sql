-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "plan" VARCHAR(50) NOT NULL DEFAULT 'basic',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "avatar_url" TEXT,
    "last_login_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cctv_sources" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "location_name" VARCHAR(255),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "stream_url" TEXT,
    "api_key_hash" VARCHAR(255),
    "model_version" VARCHAR(50) NOT NULL DEFAULT 'v1',
    "threshold" DECIMAL(4,3) NOT NULL DEFAULT 0.570,
    "status" VARCHAR(50) NOT NULL DEFAULT 'offline',
    "last_seen_at" TIMESTAMPTZ,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "cctv_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_persons" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "alias" TEXT[],
    "id_number" VARCHAR(100),
    "date_of_birth" DATE,
    "gender" VARCHAR(20),
    "nationality" VARCHAR(100) DEFAULT 'Indonesia',
    "description" TEXT,
    "danger_level" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "case_reference" VARCHAR(255),
    "photo_url" TEXT,
    "embedding" vector(128),
    "embedding_model" VARCHAR(50) NOT NULL DEFAULT 'v1',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "added_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "watchlist_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_photos" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "embedding" vector(128),
    "embedding_model" VARCHAR(50) NOT NULL DEFAULT 'v1',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "source" VARCHAR(100),
    "captured_at" TIMESTAMPTZ,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detection_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "frame_url" TEXT,
    "face_crop_url" TEXT,
    "embedding" vector(128),
    "best_match_id" TEXT,
    "best_match_sim" DECIMAL(6,5),
    "is_match" BOOLEAN NOT NULL DEFAULT false,
    "processing_ms" INTEGER,
    "model_version" VARCHAR(50) NOT NULL DEFAULT 'v1',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detection_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "detection_event_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "similarity_score" DECIMAL(6,5) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "assigned_to" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "review_notes" TEXT,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "case_number" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "lead_investigator_id" TEXT,
    "created_by" TEXT,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_alerts" (
    "case_id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" TEXT,

    CONSTRAINT "case_alerts_pkey" PRIMARY KEY ("case_id","alert_id")
);

-- CreateTable
CREATE TABLE "case_notes" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(100),
    "resource_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" TEXT NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "model_path" TEXT NOT NULL,
    "threshold" DECIMAL(4,3) NOT NULL,
    "roc_auc" DECIMAL(6,5),
    "tpr" DECIMAL(6,5),
    "fpr" DECIMAL(6,5),
    "accuracy" DECIMAL(6,5),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "deployed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "idx_users_org" ON "users"("organization_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_users_email" ON "users"("email") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_cctv_org" ON "cctv_sources"("organization_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_watchlist_org" ON "watchlist_persons"("organization_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_watchlist_embedding" ON "watchlist_persons" USING hnsw ("embedding" vector_l2_ops) WITH (m = 16, ef_construction = 64) WHERE "deleted_at" IS NULL AND "is_active" = true;
CREATE INDEX "idx_photos_person" ON "watchlist_photos"("person_id");
CREATE INDEX "idx_events_org_date" ON "detection_events"("organization_id", "detected_at" DESC);
CREATE INDEX "idx_events_source" ON "detection_events"("source_id", "detected_at" DESC);
CREATE INDEX "idx_events_match" ON "detection_events"("best_match_id") WHERE "is_match" = true;
CREATE INDEX "idx_alerts_org_status" ON "alerts"("organization_id", "status", "created_at" DESC);
CREATE INDEX "idx_alerts_assigned" ON "alerts"("assigned_to") WHERE "status" = 'pending';
CREATE UNIQUE INDEX "cases_case_number_key" ON "cases"("case_number");
CREATE INDEX "idx_audit_org_date" ON "audit_logs"("organization_id", "created_at" DESC);
CREATE INDEX "idx_audit_user" ON "audit_logs"("user_id", "created_at" DESC);
CREATE UNIQUE INDEX "model_versions_version_key" ON "model_versions"("version");

-- AddForeignKey constraints
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cctv_sources" ADD CONSTRAINT "cctv_sources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "watchlist_persons" ADD CONSTRAINT "watchlist_persons_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "watchlist_persons" ADD CONSTRAINT "watchlist_persons_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "watchlist_photos" ADD CONSTRAINT "watchlist_photos_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "watchlist_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watchlist_photos" ADD CONSTRAINT "watchlist_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "detection_events" ADD CONSTRAINT "detection_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "detection_events" ADD CONSTRAINT "detection_events_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "cctv_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "detection_events" ADD CONSTRAINT "detection_events_best_match_id_fkey" FOREIGN KEY ("best_match_id") REFERENCES "watchlist_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_detection_event_id_fkey" FOREIGN KEY ("detection_event_id") REFERENCES "detection_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "watchlist_persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_lead_investigator_id_fkey" FOREIGN KEY ("lead_investigator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_alerts" ADD CONSTRAINT "case_alerts_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_alerts" ADD CONSTRAINT "case_alerts_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_alerts" ADD CONSTRAINT "case_alerts_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed initial data
INSERT INTO "model_versions" ("id", "version", "description", "model_path", "threshold", "roc_auc", "tpr", "fpr", "accuracy", "is_active", "deployed_at")
VALUES (
    gen_random_uuid()::text,
    'v1',
    'InceptionResnetV1 VGGFace2 finetuned, batch-hard triplet loss',
    'ml-models/v1/model.pt',
    0.5703,
    0.9927,
    0.9549,
    0.0243,
    0.9653,
    true,
    CURRENT_TIMESTAMP
);
