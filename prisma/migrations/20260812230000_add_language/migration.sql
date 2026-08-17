-- UI language, chosen in Settings. Defaults to 'en' so an existing database
-- keeps the language the app has always been in.
ALTER TABLE "AppSettings" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
