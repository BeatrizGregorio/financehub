-- A goal can pin the value its projection starts from, instead of always
-- starting from whatever the portfolio is worth right now.
--
-- Nullable on purpose: NULL means "use the live portfolio value", which is the
-- honest default. A pinned number is a what-if, and would otherwise go quietly
-- stale as the portfolio moves under it.
ALTER TABLE "InvestmentGoal" ADD COLUMN "startingValue" REAL;
