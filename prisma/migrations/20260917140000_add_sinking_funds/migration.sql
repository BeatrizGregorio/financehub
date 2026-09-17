-- Yearly and irregular bills. Additive; starts empty.
CREATE TABLE "SinkingFund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "repeatsYearly" BOOLEAN NOT NULL DEFAULT true,
    "savedAmount" REAL NOT NULL DEFAULT 0,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
