@echo off
set DATABASE_URL=postgresql://postgres:berdoa57@localhost:5432/disguiseid?schema=public
mkdir prisma\migrations\20260804143500_phase3d_operator_review_workflow
npx prisma migrate diff --from-url "%DATABASE_URL%" --to-schema-datamodel prisma/schema.prisma --script > prisma\migrations\20260804143500_phase3d_operator_review_workflow\migration.sql
