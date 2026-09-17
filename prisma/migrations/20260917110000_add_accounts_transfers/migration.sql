-- Accounts, transfers, and which account an entry moved through.
-- Purely additive: existing entries get accountId NULL and keep behaving
-- exactly as before; with no accounts defined, nothing changes anywhere.
ALTER TABLE "Entry" ADD COLUMN "accountId" TEXT;

CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'checking',
    "openingBalance" REAL NOT NULL DEFAULT 0,
    "openingDate" DATETIME NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");

CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT,
    "toInvestmentId" TEXT,
    "investmentTransactionId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Transfer_date_idx" ON "Transfer"("date");
