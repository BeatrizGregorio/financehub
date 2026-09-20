-- Credit card points / rewards programmes (V1.31). Optional: the tab only
-- appears when AppSettings.pointsEnabled is on, which is off by default so
-- nothing changes for an existing install.
ALTER TABLE "AppSettings" ADD COLUMN "pointsEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PointsProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "valuePer1000" REAL,
    "expiresOn" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
