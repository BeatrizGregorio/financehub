-- Automatic backups. On by default: a brand-new install starts protected, and
-- an existing one gets its first copy on the next page load of the day.
ALTER TABLE "AppSettings" ADD COLUMN "autoBackupEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppSettings" ADD COLUMN "autoBackupDir" TEXT;
ALTER TABLE "AppSettings" ADD COLUMN "autoBackupKeep" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "AppSettings" ADD COLUMN "lastAutoBackupAt" DATETIME;
