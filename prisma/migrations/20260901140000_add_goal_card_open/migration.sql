-- Remembers whether the Investments "Goal & projection" block is expanded.
-- Defaults to 1 (open), which is exactly how it behaved before this existed,
-- so an existing install sees no change until the owner collapses it.
ALTER TABLE "AppSettings" ADD COLUMN "goalCardOpen" BOOLEAN NOT NULL DEFAULT true;
