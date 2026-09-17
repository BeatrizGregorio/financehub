-- Desktop bill reminders (V1.28). On by default: they only ever appear in the
-- desktop app, and only for things actually due.
ALTER TABLE "AppSettings" ADD COLUMN "remindersEnabled" BOOLEAN NOT NULL DEFAULT true;
