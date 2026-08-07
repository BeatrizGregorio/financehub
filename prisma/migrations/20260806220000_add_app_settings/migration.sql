-- Singleton settings row, same pattern as ReferenceRates.
-- cycleStartDay: day of the month every reporting period begins on.
-- Defaults to 10, matching the hardcoded value this setting replaces, so an
-- existing database keeps behaving exactly as it did before this migration.
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "cycleStartDay" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" DATETIME NOT NULL
);
