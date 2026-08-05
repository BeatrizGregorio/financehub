-- Seed default categories and payment methods, but only into a genuinely
-- empty database (a fresh install/clone). Guarded by "WHERE NOT EXISTS" on
-- each table so this never touches an existing, already-customized setup —
-- it must stay a no-op against any database that already has rows, since
-- migrations run against every environment, not just fresh ones.
--
-- Without this, a brand-new install has zero categories, which breaks
-- logging an entry entirely (the category select renders with no options,
-- and category is required) — see the DEFAULT_* lists in src/lib/categories.ts,
-- which this mirrors. Uses UNION ALL rather than a VALUES-with-column-aliases
-- derived table, since SQLite doesn't support aliasing VALUES columns that way.

INSERT INTO "Category" ("id", "name", "type")
SELECT lower(hex(randomblob(12))), name, type
FROM (
  SELECT 'Groceries' AS name, 'expense' AS type
  UNION ALL SELECT 'Rent', 'expense'
  UNION ALL SELECT 'Transport', 'expense'
  UNION ALL SELECT 'Utilities', 'expense'
  UNION ALL SELECT 'Dining Out', 'expense'
  UNION ALL SELECT 'Entertainment', 'expense'
  UNION ALL SELECT 'Health', 'expense'
  UNION ALL SELECT 'Shopping', 'expense'
  UNION ALL SELECT 'Other', 'expense'
  UNION ALL SELECT 'Salary', 'income'
  UNION ALL SELECT 'Freelance', 'income'
  UNION ALL SELECT 'Investment', 'income'
  UNION ALL SELECT 'Gift', 'income'
  UNION ALL SELECT 'Other', 'income'
)
WHERE NOT EXISTS (SELECT 1 FROM "Category");

INSERT INTO "PaymentMethod" ("id", "name")
SELECT lower(hex(randomblob(12))), name
FROM (
  SELECT 'Debit Card' AS name
  UNION ALL SELECT 'Credit Card'
  UNION ALL SELECT 'Cash'
  UNION ALL SELECT 'Bank Transfer'
  UNION ALL SELECT 'Other'
)
WHERE NOT EXISTS (SELECT 1 FROM "PaymentMethod");
