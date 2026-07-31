-- CreateTable
CREATE TABLE "CouponPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "investmentId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CouponPayment_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReferenceRates" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "cdi" REAL NOT NULL DEFAULT 12.65,
    "selic" REAL NOT NULL DEFAULT 13.25,
    "ipca" REAL NOT NULL DEFAULT 5.5,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ReferenceRates" ("cdi", "id", "ipca", "selic", "updatedAt") SELECT "cdi", "id", "ipca", "selic", "updatedAt" FROM "ReferenceRates";
DROP TABLE "ReferenceRates";
ALTER TABLE "new_ReferenceRates" RENAME TO "ReferenceRates";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
