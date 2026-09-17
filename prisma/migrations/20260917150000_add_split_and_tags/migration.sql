-- Split entries and tags. Additive: existing entries get no split and no tags.
ALTER TABLE "Entry" ADD COLUMN "splitId" TEXT;
ALTER TABLE "Entry" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '';
