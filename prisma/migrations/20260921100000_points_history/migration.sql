-- Points tab, second pass (V1.34): trust the balance, see the direction, and
-- measure what points are actually worth.

-- When the BALANCE was last typed in, as opposed to any edit of the row. A
-- balance is only as good as its date, and the page now says how old it is.
ALTER TABLE "PointsProgram" ADD COLUMN "balanceUpdatedAt" DATETIME;
UPDATE "PointsProgram" SET "balanceUpdatedAt" = "updatedAt";

-- One row per balance change. Not a ledger: it records what the balance WAS
-- on a date, which is enough for a trend line without logging every earn.
CREATE TABLE "PointsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "balance" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointsSnapshot_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PointsProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PointsSnapshot_programId_idx" ON "PointsSnapshot"("programId");

-- What a redemption actually bought. valueReceived is what the owner reckons
-- the reward was worth in BRL; together with the points spent it gives a real
-- measured value per 1000, against which the estimate can be checked.
CREATE TABLE "PointsRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "points" REAL NOT NULL,
    "valueReceived" REAL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointsRedemption_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PointsProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PointsRedemption_programId_idx" ON "PointsRedemption"("programId");

-- Which programme a credit card earns into. Optional, and deliberately not a
-- hard FK constraint in app logic: deleting a programme just unlinks the card.
ALTER TABLE "PaymentMethod" ADD COLUMN "pointsProgramId" TEXT;
