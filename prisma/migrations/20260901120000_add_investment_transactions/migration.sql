-- Dated buy/sell transactions against a holding.
--
-- Purely additive: no existing column changes and no rows are written. A
-- holding with no transactions keeps being valued from amountInvested/quantity
-- and startDate exactly as before, so every existing install is unaffected
-- until the owner records a transaction.
CREATE TABLE "InvestmentTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "investmentId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "quantity" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestmentTransaction_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Every read is "the transactions for this holding, in date order".
CREATE INDEX "InvestmentTransaction_investmentId_date_idx" ON "InvestmentTransaction"("investmentId", "date");
