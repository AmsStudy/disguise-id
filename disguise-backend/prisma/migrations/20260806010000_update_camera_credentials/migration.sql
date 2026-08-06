-- AlterTable
ALTER TABLE "cctv_sources" ADD COLUMN "credentials_configured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Change password to TEXT to fit the envelope cipher
ALTER TABLE "cctv_sources" ALTER COLUMN "password" TYPE TEXT;

-- Reset existing plaintext passwords and set credentials configured to false
UPDATE "cctv_sources" 
SET 
  "password" = NULL,
  "credentials_configured" = false,
  "status" = 'credentials_required'
WHERE "password" IS NOT NULL AND "password" NOT LIKE 'v1:%';
