-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';

-- Backfill existing entries with their category as a reasonable default name
UPDATE "Entry" SET "name" = "category" WHERE "name" = '';
