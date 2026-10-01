-- Money can now leave a holding, not just arrive in one: a withdrawal or a
-- redemption at maturity can be deposited into an account.
--
-- That needs "fromAccountId" to become optional and a "fromInvestmentId" to
-- sit beside it. SQLite cannot drop a NOT NULL with ALTER COLUMN, so the table
-- is recreated and copied, the standard pattern. Every existing row has an
-- account on the "from" side and keeps it, so nothing changes for them.
CREATE TABLE "new_Transfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "fromAccountId" TEXT,
    "fromInvestmentId" TEXT,
    "toAccountId" TEXT,
    "toInvestmentId" TEXT,
    "investmentTransactionId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_Transfer" ("id", "date", "amount", "fromAccountId", "toAccountId", "toInvestmentId", "investmentTransactionId", "note", "createdAt")
SELECT "id", "date", "amount", "fromAccountId", "toAccountId", "toInvestmentId", "investmentTransactionId", "note", "createdAt" FROM "Transfer";

DROP TABLE "Transfer";
ALTER TABLE "new_Transfer" RENAME TO "Transfer";
CREATE INDEX "Transfer_date_idx" ON "Transfer"("date");
