-- Replaces the simple assetClass/quantity/avgCost Investment model with the
-- full Brazilian fixed-income/fund/equity/crypto model (types, subtypes,
-- indexador-based rates, MTM support). The two existing holdings in this
-- database are disposable test fixtures from building the previous version —
-- there is no production data to migrate, so the tables are dropped and
-- recreated rather than column-by-column altered.

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "PricePoint";
DROP TABLE IF EXISTS "Investment";

CREATE TABLE "Investment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "indexador" TEXT,
    "annualRate" REAL,
    "spread" REAL,
    "adminFee" REAL,
    "perfFee" REAL,
    "amountInvested" REAL NOT NULL,
    "startDate" DATETIME NOT NULL,
    "maturityDate" DATETIME,
    "symbol" TEXT,
    "quantity" REAL,
    "purchaseRef" REAL,
    "expectedReturn" REAL,
    "corretagem" REAL,
    "institution" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "PricePoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "investmentId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "price" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricePoint_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PricePoint_investmentId_date_key" ON "PricePoint"("investmentId", "date");

CREATE TABLE "ReferenceRates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cdi" REAL NOT NULL DEFAULT 12.65,
    "selic" REAL NOT NULL DEFAULT 13.25,
    "ipca" REAL NOT NULL DEFAULT 5.5,
    "updatedAt" DATETIME NOT NULL
);

PRAGMA foreign_keys=ON;
