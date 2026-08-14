-- Single savings goal for the Investments projector (multiple goals are out
-- of scope), same singleton pattern as ReferenceRates / AppSettings.
-- expectedAnnualRate is a decimal: 0.1 = 10% a.a.
-- No row is seeded — the projector shows an empty state until the owner sets
-- a goal, so there's nothing to guess a target amount or date from.
CREATE TABLE "InvestmentGoal" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "name" TEXT NOT NULL DEFAULT 'Minha meta',
    "targetAmount" REAL NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "expectedAnnualRate" REAL NOT NULL DEFAULT 0.1,
    "monthlyContribution" REAL,
    "updatedAt" DATETIME NOT NULL
);
