-- License activation + trial start. One row, id = 'singleton'.
CREATE TABLE "License" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "email" TEXT,
    "key" TEXT,
    "activatedAt" DATETIME,
    "firstRunAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed the row so firstRunAt is the moment this migration runs. For an
-- existing install that means the trial starts now rather than being already
-- expired, which is the right way round: nobody should be locked out of data
-- they already have by installing an update.
INSERT INTO "License" ("id", "firstRunAt") VALUES ('singleton', CURRENT_TIMESTAMP);
