-- Brand accent color, chosen in Settings. Defaults to 'green' so an existing
-- database looks exactly as it did before this migration.
ALTER TABLE "AppSettings" ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT 'green';
