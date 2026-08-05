-- CreateEnum
CREATE TYPE "MlV2GalleryCandidateStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TOMBSTONED');

-- CreateEnum
CREATE TYPE "MlV2GalleryVersionStatus" AS ENUM ('BUILDING', 'VALIDATED', 'READY', 'ACTIVE', 'FAILED', 'RETIRED');

-- CreateEnum
CREATE TYPE "MlV2CandidateMappingStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED');

-- CreateTable
CREATE TABLE "ml_v2_gallery_candidates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "gallery_candidate_id" TEXT NOT NULL,
    "source_person_id" TEXT,
    "status" "MlV2GalleryCandidateStatus" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivated_at" TIMESTAMPTZ,

    CONSTRAINT "ml_v2_gallery_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_v2_gallery_versions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "version" VARCHAR(100) NOT NULL,
    "checksum" VARCHAR(100) NOT NULL,
    "model_version" VARCHAR(50) NOT NULL,
    "preprocessing_version" VARCHAR(50) NOT NULL,
    "status" "MlV2GalleryVersionStatus" NOT NULL,
    "parent_version_id" TEXT,
    "created_by_id" TEXT,
    "activated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_v2_gallery_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_v2_gallery_version_candidates" (
    "id" TEXT NOT NULL,
    "gallery_version_id" TEXT NOT NULL,
    "gallery_candidate_id" TEXT NOT NULL,
    "source_object_key" TEXT NOT NULL,
    "source_checksum" TEXT NOT NULL,
    "embedding_artifact_key" TEXT,

    CONSTRAINT "ml_v2_gallery_version_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_v2_candidate_mappings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "gallery_candidate_id" TEXT NOT NULL,
    "watchlist_person_id" TEXT NOT NULL,
    "status" "MlV2CandidateMappingStatus" NOT NULL DEFAULT 'PENDING',
    "created_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejected_by_id" TEXT,
    "rejected_at" TIMESTAMPTZ,
    "revoked_by_id" TEXT,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "ml_v2_candidate_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ml_v2_gallery_candidates_gallery_candidate_id_key" ON "ml_v2_gallery_candidates"("gallery_candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "ml_v2_gallery_candidates_organization_id_gallery_candidate__key" ON "ml_v2_gallery_candidates"("organization_id", "gallery_candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "ml_v2_gallery_versions_organization_id_version_key" ON "ml_v2_gallery_versions"("organization_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ml_v2_gallery_version_candidates_gallery_version_id_gallery_key" ON "ml_v2_gallery_version_candidates"("gallery_version_id", "gallery_candidate_id");

-- CreateIndex
CREATE INDEX "idx_v2_mapping_org_candidate_status" ON "ml_v2_candidate_mappings"("organization_id", "gallery_candidate_id", "status");

-- AddForeignKey
ALTER TABLE "ml_v2_gallery_candidates" ADD CONSTRAINT "ml_v2_gallery_candidates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_gallery_versions" ADD CONSTRAINT "ml_v2_gallery_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_gallery_versions" ADD CONSTRAINT "ml_v2_gallery_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_gallery_version_candidates" ADD CONSTRAINT "ml_v2_gallery_version_candidates_gallery_version_id_fkey" FOREIGN KEY ("gallery_version_id") REFERENCES "ml_v2_gallery_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_gallery_version_candidates" ADD CONSTRAINT "ml_v2_gallery_version_candidates_gallery_candidate_id_fkey" FOREIGN KEY ("gallery_candidate_id") REFERENCES "ml_v2_gallery_candidates"("gallery_candidate_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_candidate_mappings" ADD CONSTRAINT "ml_v2_candidate_mappings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_candidate_mappings" ADD CONSTRAINT "ml_v2_candidate_mappings_watchlist_person_id_fkey" FOREIGN KEY ("watchlist_person_id") REFERENCES "watchlist_persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_candidate_mappings" ADD CONSTRAINT "ml_v2_candidate_mappings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_candidate_mappings" ADD CONSTRAINT "ml_v2_candidate_mappings_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_candidate_mappings" ADD CONSTRAINT "ml_v2_candidate_mappings_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_v2_candidate_mappings" ADD CONSTRAINT "ml_v2_candidate_mappings_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
