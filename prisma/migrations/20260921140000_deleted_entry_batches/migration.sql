-- Undo for entry deletes (V1.36). Deleting a series takes twelve rows at once
-- and confirm() is the only thing standing in front of it, so the rows are
-- kept as JSON for a short window and can be put back exactly as they were.
CREATE TABLE "DeletedEntryBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    -- What was deleted, for the banner: the entry's own name.
    "label" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    -- The deleted rows themselves, ids included, so a restore is exact.
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
