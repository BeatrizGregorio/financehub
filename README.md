# FinanceHub

A personal budget and investment tracker. Log income/expenses, set monthly
budgets, and track a Brazilian-market investment portfolio (accrual-based
fixed income, taxes/IOF estimates, coupon payments, and projections) — all
stored locally, no cloud backend, no account required.

Runs as a regular web app (`npm run dev`) or as a packaged desktop app for
macOS.

## Features

- **Entries** — income/expense logging with custom categories, payment
  methods, recurring entries, and installment splitting.
- **Budgets** — monthly limits per category with at-a-glance progress on the
  dashboard.
- **Investments** — a full Brazilian fixed-income model: type/subtype
  taxonomy (CDB, LCI, Tesouro Direto, debêntures, funds, ações, cripto...),
  indexador-based accrual (CDI/SELIC/IPCA/prefixada), an IR/IOF tax
  estimate, coupon payment tracking, and value projections out to 20 years.
- **Dashboard** — spending by category, income vs. expenses, monthly net,
  portfolio allocation, and monthly portfolio value, all in one view.
- **Backup & restore** — export/import your entire dataset as JSON.
- **Desktop app** — an Electron build so the app runs as a double-clickable
  Mac app instead of a terminal command.

## Tech stack

Next.js 16 (App Router) + TypeScript + React 19, SQLite via Prisma 7,
Tailwind CSS v4, Recharts, and an optional Electron shell for the desktop
build.

## Getting started

Requires Node.js and npm.

```bash
npm install
npx prisma generate
echo 'DATABASE_URL="file:./financehub.db"' > .env
npx prisma migrate deploy
npm run dev
```

If `npm install` reports skipped/blocked install scripts (some npm versions disable
these by default), run `npx prisma generate` again afterward — it's what creates
the `src/generated/prisma` client the app imports from, and without it you'll see
`Module not found: Can't resolve '@/generated/prisma/client'`.

Open [http://localhost:3000](http://localhost:3000). Data is stored locally
in `financehub.db` — nothing leaves your machine.

## Desktop app (macOS)

```bash
npm run electron:build   # build + prep the standalone bundle
npm run electron:start   # launch it locally
npm run electron:dist    # package a distributable .dmg into /release
```

See [CLAUDE.md](CLAUDE.md) for the full architecture, the native-module
packaging details, and the reasoning behind most of the app's design
decisions — it started as project notes for an AI coding assistant, but
doubles as fairly thorough dev documentation.

## Data & privacy

This app has no authentication and no multi-user support by design — it's
built for one person's local data. There's no telemetry and no network
calls other than serving the app itself.

## License

All rights reserved. This code is shared publicly for reference, but is not
licensed for reuse, modification, or redistribution without permission.
