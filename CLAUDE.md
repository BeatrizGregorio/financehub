# FinanceHub

A personal budget tracker, built for a single user (the owner of this repo) to log
income/expenses and see where their money goes. Runs entirely locally — no cloud
backend, no auth, no multi-user concerns.

## Who this is for

The owner is a product designer, comfortable with design but newer to writing code.
Implications for how we work on this project:
- Favor simplicity and readability over cleverness. Avoid unnecessary abstraction.
- Explain non-obvious setup/run steps in plain language when they come up.
- Visual polish (typography, spacing, layout) matters — treat it as a first-class
  requirement, not a nice-to-have.
- Prefer one clear way to run the app (`npm run dev`) over multi-service setups.

## Status

V1 built and verified working 2026-07-29. V1.1 (budgets, recurring/installment
entries, custom categories & payment methods, JSON backup) added same day, ported
from a reference single-file HTML app the owner shared, with the same UI patterns
translated into this app's Next.js/Prisma architecture. V1.2 (visual redesign — new
color palette, fonts, icons, panel layout) added same day from a high-fidelity
design handoff doc (`design_handoff_finance_hub/` bundle: a README spec + two
`.dc.html` design-reference files). V1.3 (Electron desktop app — see "Desktop app
(Electron)" below) added 2026-07-30 so the owner can run FinanceHub as a
double-clickable Mac app instead of `npm run dev` in a terminal. Full flow
re-tested in browser (web) / by launching the packaged app directly (desktop)
after each change, including a DB-level round-trip test of backup export/import
and a fresh-install → add data → quit → relaunch persistence test for the desktop
app. V1.4 (second visual redesign — glassmorphism cards, left sidebar nav,
ambient background blobs, new green/red palette) added 2026-07-30 from a Figma
Make export the owner shared (`Design website visuals.zip`: a full shadcn/Vite
scaffold whose `src/app/App.tsx` was a complete high-fidelity mock of all three
pages). Confirmed scope with the owner first (full redesign vs. palette-only) —
see "Visual design system" below for what changed. Re-tested in browser after
each change by adding real entries/budgets through the UI and checking all
three pages plus sidebar collapse. V1.5 (popup entry form + required `name` field)
added 2026-07-30: the add/edit entry form moved from an inline expanding card to a
modal popup (`src/components/Modal.tsx`), and a new required `name` field was added
to `Entry` (separate from the pre-existing optional `note`) — confirmed with the
owner first since it needed a schema migration with backfill for existing rows (see
"Data model"). Verified in browser: added and edited entries through the new modal,
confirmed the dev server needed a restart after `prisma generate` to pick up the
regenerated client (a `PrismaClientValidationError: Unknown argument name` shows up
otherwise — if this happens again after a schema change, restart `npm run dev`).
V1.6 (Investments module) added 2026-07-30 from a written spec the owner provided
(manual-price-entry portfolio tracker: holdings, dated price history, gain/loss,
allocation — see "Investments" under "Core features" and the `Investment`/
`PricePoint` models under "Data model"). Same session also switched the app's
currency from USD to BRL app-wide, since the spec's investments are priced in
reais and the owner is Brazil-based — this touches every page, not just
Investments (see the Currency note below "Visual design system"). Built P0
(CRUD, batch price update, backup/restore, currency) then P1 (gain/loss,
per-holding price-history detail view, dashboard allocation + portfolio-value
cards) as two verified passes, per the spec's own phasing. Verified in browser
end to end: added holdings with and without cost basis, built up multi-date
price history and confirmed corrections only touch that one date, edited/deleted
individual price points from the detail view, cascade-deleted a holding and
confirmed its price history went with it (checked directly in SQLite), and
round-tripped export → wipe → import. P2 (buy/sell transaction log, auto-fetched
prices) was intentionally not built — see the simplification note on
`monthlyPortfolioValue`/`ownershipValue` in `src/lib/investments.ts` (the
function this note originally referenced, `portfolioValueOverTime`, was
replaced in V1.12).

V1.7 (Investments: full Brazilian tax/accrual model) replaced V1.6's simple
investment model entirely, same day (2026-07-30), from a second, much more
detailed spec the owner provided (a full write-up of another app's investment
system — types/subtypes, indexador-based accrual, IR/IOF tax, a projector
calculator). Scoped with the owner via three explicit decisions before
building, since this reversed prior explicit choices: (1) full replace of the
V1.6 model rather than an additive extension — the two V1.6 test holdings were
dropped, not migrated; (2) implement the IR/IOF tax estimate despite the
original spec's "no tax reporting" non-goal, framed clearly as an estimate,
not filing guidance; (3) leave out the Investment Projector calculator
(goal-tracking / monthly-contribution simulator) as a separate future piece of
work. Also explicitly excluded, per the owner's own instruction: all of the
source spec's live price-fetching (brapi.dev, CoinGecko, BCB, Tesouro Direto
APIs) — every price and every reference rate (CDI/SELIC/IPCA) in this app is
entered by hand; see "Investments" under "Core features" for the full
valuation/tax logic and `src/lib/investmentTypes.ts` for the taxonomy. Verified
by hand-computing expected values in Python and cross-checking against the UI
for three distinct paths: CDB compound accrual landing in the 181–360-day IR
tier (exact match to the cent), Ação flat-fallback-then-manual-unit-price
after an Update Prices entry (exact match), and an IR-exempt LCI confirming
the tax disclaimer correctly disappears when IOF/IR are both zero. Did not
exhaustively browser-test every subtype/indexador combination (e.g. CDI+
spread, Fundo MTM, Tesouro Direto unit-fallback-to-accrual) — those paths share
the same `valuation()`/`irRate()`/`iofRate()` config functions already
exercised above, but treat them as reviewed-by-code-reading rather than
individually verified in the running app if you touch that area next.

V1.8 (UI audit) fixed eight layout/alignment bugs found by systematically
checking Dashboard, Entries, Investments, and Settings at 1440px, 768px, and
375px, same day (2026-07-30): chart Y-axis ticks read as raw `R$1200` instead
of formatted currency; `formatShortDate` used `pt-BR` and leaked Portuguese
month names ("30 de jul.") into the otherwise-English chart axes; the
Allocation/Spending-by-category legend text overflowed past the card edge on
narrow columns; `HoldingForm`'s Rendimento fields (Indexador/Taxa/Performance)
didn't share one flex row so they misaligned vertically; the Settings page had
a dead empty grid cell next to Reference Rates; dashboard/Investments stat
pills squeezed their text to near-illegibility instead of wrapping at medium
widths; the sidebar had no responsive behavior at all below ~768px; and
(found once mobile-width testing began) the Budgets card's category/amount
row and the Payment Methods card's text-next-to-icon-grid row both collided
or over-shrank at 375px. Root cause behind several of these: a `flex-1` child
with `min-w-0` and no floor will shrink indefinitely instead of wrapping —
`min-w-0` removes the default `min-width: auto` that would otherwise trigger
`flex-wrap`. Fix pattern used throughout: give the shrinking text a `gap-*`
from its sibling, mark the sibling (icon, value, badge) `shrink-0
whitespace-nowrap`, and either give the text `truncate`/`min-w-0` (list rows,
where clipping one row is fine) or a `min-w-[...]` floor (stat pills, where
wrapping to a second line reads better than any truncation) — pick based on
which looks better for that specific element, not a blanket rule. Verified
each fix via DOM `getBoundingClientRect()` measurement (not just screenshots —
the Browser pane has a known quirk of occasionally rendering stale/blank
screenshots after a scroll, see below) to confirm no horizontal overlap
remained, then a full `tsc --noEmit` + `npm run lint` pass, both clean.

V1.9 (bug fixes) fixed three owner-reported issues 2026-07-31: (1) the
Dashboard Budgets card showed R$0 spent against every budget despite real
expenses that month — root cause was leftover test data from earlier
sessions (entries logged under a category, "sa", that didn't match any
current category, plus an orphaned "Groceries" budget with no matching
category at all) rather than a code bug; confirmed with the owner before
deleting, then verified a real entry rolls up against its budget correctly.
Categories being free-text on `Entry`/`Budget` (no FK — see "Data model")
means this class of mismatch can recur if a category is renamed/deleted
after entries/budgets reference it; that's a deliberate design tradeoff, not
something to "fix" by adding FKs. (2) The add/edit entry modal read as dark
and muddy — `Modal.tsx` used the shared translucent glass `CARD` style
(`bg-white/70`) on top of a `bg-black/30` backdrop scrim, and translucent
white over a dark scrim renders muddy rather than bright. Fixed by giving the modal card its own
solid `bg-white` (not the shared `CARD` constant) and lightening the
backdrop to `bg-black/15` — every other glass card still sits on the light
ambient background, so this was scoped to `Modal.tsx` only, not `CARD`
itself. (3) Removed the Reference Rates editor from Settings per the
owner's request — `ReferenceRatesEditor.tsx` and its dedicated
`updateReferenceRates` action were deleted; `getReferenceRates()` and the
`ReferenceRates` model stay, since Investments accrual math still needs
CDI/SELIC/IPCA — they just fall back to the stored/default values
(12.65/13.25/5.5) permanently now, with no UI to edit them. If the owner
ever wants that back, it's a small, self-contained re-add (the model/data
function were never touched).

V1.10 (Investments: coupon payments + projection chart) added 2026-07-31
from two owner requests, each scoped via clarifying questions first since
both change calculation semantics, not just UI (same reasoning as the V1.7
tax-model questions): (1) **Coupon payments** — a `CouponPayment` model
(id, investmentId, date, amount) tracks juros semestrais/coupon distributions
on bond-like holdings. Confirmed behavior: a coupon is cash paid out, so
`valueAtDate()`'s accrual-fallback branch subtracts total coupons-to-date
from the accrued value (manual-price/MTM branches are left alone — a manual
price already reflects the market's current price net of paid coupons, so
subtracting again would double-count); `taxBreakdown()` and
`portfolioSummary()` both add coupons back into the gain calculation, so
gain/loss reflects total return (price movement + income received) even
though the "current value" figure is net of what's already been paid out.
UI lives in `HoldingDetail.tsx` (`CouponAddForm`/`CouponRow`, mirroring the
existing `PriceRow` pattern), gated to `showsRateFields(type)` (Renda
Fixa/Fundo only — Ação/Cripto/Outro don't have coupon semantics in this
app). A "Coupons received" summary pill appears on the Investments page
only when the total is > 0. (2) **Projection chart** — `projectPortfolioValue()`
in `src/lib/investments.ts` projects total portfolio value at fixed
horizons (30d/60d/90d/6m/9m/1y/3y/5y/10y/15y/20y — the requested "3m" was
dropped since it's within a day of "90d", to avoid a redundant tick).
Confirmed behavior for the two ambiguous cases: a holding's value freezes
at its maturity-date value rather than assuming automatic reinvestment past
maturity, and holdings with no maturity date and no reliable rate (Ação,
Cripto, Fundo with no rate set) are held flat rather than guessing a growth
rate. Both fall out of **reusing `valueAtDate()` unchanged** — capping the
projection date at `maturityDate` before calling it handles the freeze, and
flat-fallback/manual-price holdings already stay flat for any future date
since there's no future price point to look up — see the doc comment on
`valueAtDate()` for why this needed no new valuation logic, just a thin
wrapper (`projectedInvestmentValue`). Rendered via a new
`ProjectionChart.tsx` component on the Investments page, with an explicit
"estimate, not a forecast" disclaimer next to it (same spirit as the tax
disclaimer — don't let it read as more authoritative than it is). Verified
in browser: added and removed a real coupon on the owner's actual holding
and confirmed the value/gain math matched the confirmed design exactly (value
dropped by the coupon amount, gain/loss unchanged), confirmed the
projection chart grows then flattens at the holding's maturity date, and
confirmed `tsc --noEmit`/`npm run lint` stay clean. Backup export/import
(`version: 3`, unchanged) and the `deleteHolding`/`importBackup` wipe steps
were extended to include `CouponPayment` alongside `PricePoint`, following
the same "explicit delete, don't trust the cascade alone" pattern already
used for price history (see "Investments" below).

V1.11 (Investments: monthly value charts) added 2026-07-31 — a "month by
month" view of value, for the whole portfolio and for each holding
individually, distinct from the existing `portfolioValueOverTime()` chart on
the Dashboard (which plots *price-entry dates*, so its spacing depends on
when the owner happened to update prices). `monthlyPortfolioValue()` and
`monthlyValue()` in `src/lib/investments.ts` instead generate one checkpoint
per calendar month (last day of each past month, today for the current
month) via a shared `monthlyCheckpoints()` helper, then evaluate
`valueAtDate()` at each — so it's automatically coupon- and accrual-aware
for free, same as everything else built on that function. Both return the
same `PortfolioValuePoint` shape `portfolioValueOverTime()` already used, so
the existing `PortfolioValueChart` component is reused as-is for the
portfolio-level "Monthly value" card — no new chart component needed there.
Placed on the Investments page in a 2-column grid beside Projection (stacks
to 1 column below `lg`), per the owner's explicit request. The per-holding
version lives in `HoldingDetail.tsx`, added above the existing manual
price-entry sparkline (now labeled "Manual price entries" for clarity, since
there are two charts stacked there now — that heading didn't exist before,
the sparkline used to sit unlabeled directly above the "Price history" list).
Verified in browser on a real holding: the monthly chart correctly shows
flat `amountInvested` for months before the holding's `startDate` (an
existing, already-accepted quirk of `accrualValue()` — see its `days <= 0`
branch — not something new introduced here), then the accrual curve, with a
visible dip around the coupon dates that matches V1.10's coupon-subtraction
logic. Confirmed `tsc --noEmit`/`npm run lint` clean and no layout overflow
at 375px (charts stack, no clipping — double-checked via DOM measurement
after a screenshot made the last x-axis tick look clipped, which turned out
to be the known Browser-pane screenshot artifact, not a real bug — see that
gotcha below). **Correction, V1.12 the same day**: the flat-before-startDate
behavior called "already-accepted" above turned out to be exactly what the
owner didn't want once she saw it plotted on a real timeline — see V1.12.

V1.12 (Dashboard: Monthly value + ownership-window fix) added 2026-07-31,
same day, from two owner requests: show the V1.11 monthly-value chart on the
Dashboard too, and fix it counting a holding's value before it was owned.
(1) **Dashboard**: the Dashboard's existing "Portfolio value over time" card
(`portfolioValueOverTime()`, price-entry-dated, present since V1.6) was
**replaced** with the same `monthlyPortfolioValue()` calendar-month chart
now used on the Investments page — not added alongside it, since the two
looked near-identical and having one price-entry-dated and one calendar-
month-dated version of "portfolio value over time" on the same app would've
been confusing rather than complementary. `portfolioValueOverTime()` is now
unused and was deleted (matching this project's practice of not leaving
dead code around, e.g. the old `projectedValue()` in V1.10). If the owner
ever specifically wants the price-entry-dated granularity back, it's a
small revert. (2) **Fix**: added `ownershipValue()` in
`src/lib/investments.ts`, a stricter wrapper around `valueAtDate()` used
only by the monthly functions (`monthlyValue`/`monthlyPortfolioValue`) —
zero before a holding's `startDate` and zero after its `maturityDate`.
Root cause: `accrualValue()`'s `days <= 0` branch returns flat
`amountInvested` for any date before `startDate`, which is *correct* for
current-value/tax/gain math (a date query before purchase is a
non-question there) but was *wrong* once reused for a historical monthly
timeline, where it made every holding appear to have existed (fully
invested, no less) for the entire chart window regardless of when it was
actually bought. Deliberately left `valueAtDate()`/`currentValue()`/
`taxBreakdown()`/`portfolioSummary()` untouched — the owner's ask was
specifically about the monthly charts, and zeroing out a holding's
*current* value the moment it matures would be a bigger, unrequested
behavior change (the owner is expected to update the price or delete the
holding once something actually matures/redeems, per this app's manual-
entry design). Verified by temporarily moving a real holding's
`maturityDate` to a near-past date, confirming both the per-holding and
portfolio-level monthly charts dropped to R$0 right after that date, then
restoring the original `maturityDate` and confirming the total value figure
returned to exactly what it was before the temporary edit — a reversible,
non-destructive way to test a past-maturity scenario without any holding in
the owner's real data actually being near maturity yet. `tsc --noEmit`/
`npm run lint` both clean.

V1.13 (first-run journey fix: empty categories/payment methods) added
2026-07-31, from the owner's own observation that a brand-new install opens
with zero categories and zero payment methods, and diving straight into
"Add entry" from there is a dead end. Confirmed the real failure: a fresh
database had no seed data at all (no `prisma/seed.ts`, no INSERT in any
migration), so `EntryForm.tsx`'s Category `<select>` rendered with zero
`<option>`s — and since `Entry.category` is required, submitting produced
the unhelpful server-side "Choose a category." error with no way to
recover from inside the modal. Fixed two ways, matching the owner's framing
("ask the user to add those first" — a journey gate, not just a crash fix):
(1) a new hand-written migration
(`prisma/migrations/20260731180000_seed_default_categories_methods`) seeds
the existing `DEFAULT_EXPENSE_CATEGORIES`/`DEFAULT_INCOME_CATEGORIES`/
`DEFAULT_PAYMENT_METHODS` lists from `src/lib/categories.ts`, but only via
`WHERE NOT EXISTS (SELECT 1 FROM "Category"/"PaymentMethod")` — this is a
no-op against any database that already has rows (including the owner's own
`financehub.db`, and any existing downloader's clone), since migrations run
against every environment, not just fresh ones; it only actually inserts
into a genuinely empty database. Written with `UNION ALL SELECT` rather
than a `VALUES (...) AS t(col1, col2)` derived table, since SQLite doesn't
support aliasing columns on a `VALUES` clause that way (Postgres/MySQL do;
first attempt failed with a syntax error against SQLite). (2) Defense in
depth for the case where an owner later deletes *all* categories of one
type via Settings (the seed migration only helps at DB-creation time, not
after): `EntryForm.tsx` now checks `categories.length === 0` for whichever
type (income/expense) is currently selected and, if so, replaces the rest
of the form with a plain message + link to Settings, mirroring the same
"empty state with a Settings link" pattern `BudgetsCard.tsx` already used
for "no budgets set yet." Audited the rest of the app for the same class of
gap first — `BudgetEditor.tsx` already handled zero expense categories
gracefully ("Add an expense category first."), `HoldingsTable.tsx` already
handled zero holdings ("No holdings yet."), and the Payment Method select is
optional with a working "None" fallback, so none of those needed changes;
the Category select was the one real journey-breaking dead end. Verified
both fixes: ran the new migration against a scratch empty SQLite database
(via a temporary `.env` swap) and confirmed all 14 categories + 5 payment
methods appear, then ran it again against the owner's real `financehub.db`
and confirmed row counts were unchanged (true no-op); for the UI guard,
temporarily deleted the owner's real income categories, confirmed the
Income tab of Add Entry showed the new message with a working `/settings`
link instead of a broken form, then restored the original rows (same IDs)
and confirmed all 25 real entries were unaffected. `tsc --noEmit`/
`npm run lint` both clean.

V1.14 (custom budget cycles: months run 10th-to-9th, not 1st-to-last)
added 2026-08-06, two changes in one pass:

(1) **Dashboard showed the wrong month** — an owner-reported bug, and a
real one independent of any data import: `page.tsx` derived "this month"
from `availableMonths(entries)[0]`, i.e. *the latest month any entry
exists in*, not the calendar. That held while every entry was in the past,
but the imported recurring series run out to 2027, so the dashboard header
and the Spending-by-category picker both jumped to a future month. Now
both come from the current date. Any future-dated entry would have
triggered this — it was never actually reading the clock.

(2) **Reporting periods now run 10th → 9th**, named for the month they
*start* in: 10 Aug – 9 Sep is "Aug 2026". A date on/after the 10th belongs
to that month's cycle; the 1st–9th belong to the previous month's. The
owner first asked for the 15th and corrected to the 10th mid-implementation
— that was a one-line change because the boundary lives in a single
`CYCLE_START_DAY` constant in `format.ts`; keep it that way. Cycle keys
deliberately kept the same `YYYY-MM` shape calendar months already used, so
they still sort lexicographically and read normally in the month pickers.

The API is `cycleKey(date)` / `currentCycleKey()` / `cycleLabel(key)` /
`cycleRange(key)` / `cycleEndDate(key)` / `addCycles(key, n)`, all in
`format.ts`. The old `monthKey()` export was **removed rather than
redefined**, so every call site had to be looked at rather than silently
changing meaning, and `monthLabel(date)` was made module-private —
`cycleLabel` takes a *key*, never a date, because labeling a raw date is
exactly the bug that would reintroduce calendar months (a 3 Sep entry
belongs to the "Aug 2026" cycle, so `monthLabel(entry.date)` would say
"Sep"). Everything that buckets entries goes through `cycleKey()`:
`aggregate.ts` (all four functions), the dashboard stat pills, `BudgetsCard`,
`EntriesClient`'s filter, and — a separate code path worth remembering —
`layout.tsx`'s sidebar IN/OUT, which is a **Prisma date-range query**
(`cycleRange()`), not in-memory bucketing. Those two agreeing is the useful
end-to-end check that the range and the bucketing haven't drifted apart.
Per the owner's explicit choice, the Investments monthly-value charts
follow the cycle too (`monthlyCheckpoints()` in `investments.ts` now
returns `{date, key}` pairs so its labels come from the cycle key, not from
the checkpoint date).

Verified: compiled `format.ts` standalone and asserted the boundary cases
directly (9th → previous cycle, 10th → opens, 9th-of-next → still closes
the cycle, plus Jan↔Dec rollover in both directions), then in the browser
confirmed the dashboard header, month picker, and sidebar all read
"Jul 2026" on 6 Aug 2026 (cycle 10 Jul – 9 Aug) with matching IN/OUT
figures. `tsc --noEmit` / `npm run lint` clean.

V1.15 (cycle start day is owner-configurable in Settings) added
2026-08-06, immediately after V1.14 — the owner wanted to pick the day
rather than have it hardcoded. Stored on a new `AppSettings` singleton
(`prisma/migrations/20260806220000_add_app_settings`, same `id: "singleton"`
pattern as `ReferenceRates`), defaulting to 10 so an existing database
behaves exactly as it did before the migration. Read via
`getCycleStartDay()` in `data.ts`, which clamps whatever is stored so a bad
value can't produce a nonsensical range downstream.

**Capped at 1–28** (`MAX_CYCLE_START_DAY`/`clampCycleStartDay` in
`format.ts`), because a 29th–31st boundary doesn't exist in every month:
it would silently drift in February and in 30-day months, leaving gaps or
overlaps between consecutive cycles. Day 1 gives plain calendar months,
i.e. the pre-V1.14 behavior, so that's the "turn this feature off" value.
The Settings card says why 29–31 are missing rather than just disabling
them.

**The day is threaded explicitly as an argument, never read from a
module-level global** — every cycle function takes `startDay` with the
constant as its default. This is deliberate and worth preserving: these
functions run in *client* components too (`SpendingByCategoryCard`,
`EntriesClient`, `InvestmentsClient`, `HoldingDetail`) where there's no
database access, and a mutable module-level "current setting" on the
server would be shared across concurrently-rendering requests. Verbose,
but it can't silently disagree with itself. The chain is: page/layout
(server) fetches → passes as a prop → client component passes into
`aggregate.ts`/`investments.ts`. If you add a new caller, the compiler
won't force you to pass it (there's a default), so check it explicitly.

`updateCycleStartDay` in `settings/actions.ts` revalidates `/investments`
on top of `revalidateAll()`, since that page's charts are cycle-based too
but aren't in the shared revalidate helper. Backup export/import gained a
`settings: { cycleStartDay }` key — still `version: 3`, additive, and an
older backup without it leaves the current setting alone rather than
resetting it (same reasoning as coupons in V1.10).

Verified: compiled `format.ts` standalone and asserted day 1 behaves as
calendar months, day 28 works in February, bad input (0/31/-5/NaN/null/
10.9) clamps rather than throwing, and — the real invariant — consecutive
cycles are exactly 1 day apart with no gap or overlap, across year
boundaries. Then end-to-end in the browser: saved day 1 and confirmed the
dashboard header, month picker and sidebar all moved to calendar months
(Aug 2026), saved 10 and confirmed they moved back to Jul 2026, with
Entries and Investments both rendering. `tsc --noEmit` / `npm run lint`
clean.

V1.16 (Investments: "Meta & Projeção" — goal + projection block) added
2026-08-11, from a written spec the owner provided. This is the
goal-tracking / monthly-contribution simulator that V1.7 and V1.10
explicitly deferred ("the Investment Projector calculator"), so it closes
that gap — it is *not* the same thing as V1.10's `ProjectionChart`, which
plots portfolio value at fixed horizons with no goal or contributions.
Both now live on the Investments page.

**The spec described a different app.** It was written against the
single-file HTML/Chart.js/localStorage reference app (Controle Financeiro),
not this Next.js/Prisma/Recharts one, and it assumed a **dated contribution
log ("log de aportes datados") that this app does not have** — the buy/sell
transaction log is still the deferred P2 work described above. Adapted
rather than stopped: localStorage → an `InvestmentGoal` singleton, Chart.js
→ Recharts, and the cash flows are built from what *does* exist — each
holding's `startDate` + `amountInvested` is a genuine dated outflow, plus
`CouponPayment`s as inflows and current portfolio value as the closing
inflow. **Known limitation, stated in the UI rather than hidden:** topping
up an existing holding raises `amountInvested` without recording a new
date, so that money is attributed to the holding's original `startDate`
and XIRR reads slightly low. Building the real transaction log would fix
this and nothing else here would need to change.

Math lives in `src/lib/goal.ts`, pure and dependency-free so it runs both
server-side for the first render and in the browser as the owner edits:
`annualToMonthly`/`fv`/`requiredPMT`/`monthsToGoal`/`xirr` transcribed from
the spec with the arithmetic untouched (only types added), plus
`buildCashFlows`/`averageMonthlyContribution`/`goalProjection`/
`averageMonthlyExpenses` adapting this app's data to them. XIRR is
bisection, and returns `null` rather than a wrong number when the flows
can't bracket a root (fewer than 2 flows, or no sign change) — the UI shows
"sem dados suficientes ainda" in that case. `SPREAD = 0.03` at the top of
the file drives the pessimistic/optimistic band; it's one constant on
purpose.

Rates in `goal.ts` are **decimals** (0.10 = 10% a.a.) because the
compounding formulas need them that way, which is the opposite of
`ReferenceRates`/`annualRate` elsewhere in this app (12.65 = 12.65%). The
conversion happens at exactly one place, `saveInvestmentGoal` in
`investments/actions.ts` (`ratePercent / 100`) and the form's
`defaultValue`; don't let it leak inward.

UI is `GoalProjectionCard.tsx` (real return + progress bar + the two
solvers + chart), `GoalForm.tsx` (the modal, reusing `Modal.tsx` and
EntryForm's `submitCount` close-on-success pattern), and
`components/GoalProjectionChart.tsx`. The band is a **single Recharts
`Area` whose dataKey holds a `[low, high]` pair** — Recharts renders a
two-value key as a range, which is why there aren't two stacked Areas.
Its `YAxis width` is 92 rather than the 72 the other charts use: a
projection runs years out, so ticks reach 6–7 figures and were clipping at
72 (caught by measuring tick `getBoundingClientRect().left` against the
SVG's left edge, not by eyeballing a screenshot).

Verified: compiled `goal.ts` standalone and asserted the round-trip that
matters (saving exactly `requiredPMT` for n months lands exactly on the
target), plus every edge case the spec listed — rate 0, goal already
reached, goal unreachable at the current contribution, target date in the
past, XIRR with too few flows / no sign change. Then end-to-end in the
browser against real holdings: set a goal through the modal, confirmed it
persisted (rate stored as a decimal, blank contribution stored as null),
and hand-checked both solvers against the rendered figures
(R$ 477,69/month and April 2027 both reconcile). Forced each edge case
through the DB and confirmed the right message renders.

**A "narrow-viewport sidebar bug" reported during this work turned out not
to exist** — worth recording because the false positive is easy to
reproduce. At 375px the sidebar measured 207–240px wide (instead of the
collapsed 72px), `<main>` was squeezed to 135px, and every chart on the
page rendered 14–40px wide. All of that was real on screen *and* entirely
an artifact of the Browser pane: `document.visibilityState` is `"hidden"`
there, and **a hidden page pauses CSS transitions**, so `Nav.tsx`'s
`transition-[width,padding] duration-300` never advanced. React state was
correct the whole time (`collapsed === true`, inline `style.width = "72px"`),
but *computed* width stayed at the pre-transition 240px, and Recharts'
ResponsiveContainer then measured that squeezed parent. Setting
`el.style.transition = "none"` and forcing a reflow immediately reported
the correct 72px / 12px padding. **Whenever a measured layout disagrees
with the inline style, check `document.hidden` and kill transitions before
concluding anything** — see the audit note under "Version-specific
gotchas".

V1.17 (UI/UX audit) added 2026-08-11, checking all four pages at 1440px,
1280px and 375px. Unlike V1.8's audit (which was about layout collapse),
this one was mostly **contrast and accessible naming** — the layout held up
well. Nine fixes:

**Contrast.** `--color-muted-2` was `#9ca3af`, measuring **2.45:1** against
the glass card background — far under WCAG AA's 4.5:1, and it carries most
secondary text plus every chart axis tick. Both grey steps were darkened
together (`--color-muted` #6b7280 → **#5b6472**, `--color-muted-2` #9ca3af →
**#6b7280**, now 5.78:1 and 4.67:1 on cards) so the ink → muted → muted-2
hierarchy survives instead of collapsing into two levels. The same value was
hardcoded as `#9ca3af` in nine chart/component files for Recharts tick
fills; all were updated, so `#9ca3af` should no longer appear anywhere in
`src/`. **Deliberately not changed:** the brand green `#0c9e57` (3.36:1) and
red `#dc3545` (4.37:1), which also fail AA for body text — those are the
Figma palette's identity colors, and altering them is a design decision for
the owner, not a bug fix. Flagged, not touched.

**Accessible naming** (all four pages now report zero): the two month
`<select>`s (dashboard spending card, entries filter) had no accessible
name at all; the Settings inputs — both "New category…" fields, all four
budget-limit numbers, "e.g. Debit Card", and the backup file input — had
only placeholders, which are not accessible names. Budget inputs get
`aria-label={`Monthly budget limit for ${category}`}` specifically because
the category name beside them is only a visual sibling, so a screen reader
would otherwise announce several identical unlabelled number fields.

**Hit targets** raised to the 24px WCAG 2.2 minimum: the Edit/Delete/Series
row actions in `EntryTable` and `HoldingsTable` were 16px of bare text, and
holding-name buttons 20px. Fixed with `px-1.5 py-1 -my-1` — padding grows
the hit area while the matching negative margin keeps row height identical
(verified: entry rows still 70px, zero vertical overlap). The two number
inputs in `BudgetEditor`/`CycleSettingsCard` were 20px inside a 36px pill,
so `py` moved off the wrapper onto the input: same pill, 28px field.

**Layout:** `PortfolioValueChart`'s last x-axis label ("Aug 2026") is
centred on the final data point and overflowed the plot area, so it needed
`margin.right: 30` (~half the widest "MMM YYYY" label). A first attempt at
14 left 2px still clipping — measured, not eyeballed.

**Methodology note, important for any future audit here:** the Browser pane
runs with `document.visibilityState === "hidden"`, and **a hidden page
pauses CSS transitions and throttles ResizeObserver/rAF**. That produces
convincing but false readings — a sidebar mid-transition reporting 207–240px
instead of its settled 72px, and Recharts `ResponsiveContainer` reporting
14–40px chart widths. Both were briefly reported as real bugs during this
work and were not. Before trusting any measurement, inject
`*{transition:none!important;animation:none!important}`, force a reflow, and
if a chart looks collapsed take a screenshot first (that forces a paint).
Where layout isn't needed at all — accessible names, labels, markup — prefer
`curl`ing the page HTML and parsing it, which sidesteps the pane entirely.

V1.19 (Investments: row actions "View more" + "Add coupon") added
2026-08-11. The holdings table previously only exposed Edit/Delete, with the
detail view reachable only by clicking the holding's name — not discoverable.
Now each row has **View more · Add coupon · Edit · Delete**.

"View more" just calls the same `onView` the name click already used.
"Add coupon" opens a dedicated modal, and is **gated to
`showsRateFields(type)`** (Renda Fixa/Fundo only) — the same gate
`HoldingDetail` uses, so the button never offers a meaningless action on
Ação/Cripto/Outro. Verified by temporarily inserting an `acao` holding into
the dev database: 11 rows rendered 11 "View more" but only 10 "Add coupon",
and the Ação row specifically had no coupon button. Row removed afterwards.

The coupon UI was **extracted** to `investments/CouponSection.tsx` rather
than duplicated — `CouponRow`/`CouponAddForm` and the heading/total/list
layout were inline in `HoldingDetail`, and a second entry point would have
meant two copies of the add/edit/delete wiring drifting apart. Both the
detail modal and the new row modal now render `<CouponSection holding={…} />`.
Like `viewing`, the modal's holding is derived from the live `holdings` prop
by id (`couponForId`), not held as a frozen object, so a coupon added inside
the modal appears in its own list immediately — confirmed in the browser
(added R$ 123,45, saw the row and the "total received" line appear without
closing the modal, then removed it).

**Column widths in `HoldingsTable` are measured, not guessed — re-measure
before touching them.** Four actions need 276px on one line (73 + 83 + 35 +
51 + three 10px gaps = 272); at 250 they wrapped and rows grew 70→75px. That
width is paid for by trimming Type 160→140 and Value 150→120, whose widest
real content is only 100px and 101px. Two intermediate attempts each
introduced a hairline horizontal scrollbar — first 6px at the desktop app's
1360px window, then 16px at 1280px — because the `min-w` floor was raised
naively; it ended at **960px**, which fits both (1049px and 969px of usable
width respectively, measured, with the Name column absorbing the remainder
and truncating). `tsc --noEmit` / `npm run lint` clean.

V1.20 (matured holdings + English-language audit) added 2026-08-12, two
things in one pass.

**(1) Maturity.** A holding past its `maturityDate` is money already paid
back — cash waiting to be reinvested, not an active position. The owner
asked to "exclude the investment" and show a celebratory prompt; confirmed
with her first that this means **flag it, not delete it** (deleting a real
holding on a date rollover would destroy price/coupon history nobody asked
to lose). So:
- `isMatured(inv, asOfDate = new Date())` in `investments.ts` — **inclusive
  of the maturity date itself** (a CDB maturing today is finalized today).
  Holdings with no `maturityDate` (Ação/Cripto/open-ended Fundo) never
  mature.
- `valueAtDate()` **caps `asOfDate` at `maturityDate`** rather than
  special-casing the value, so the figure freezes at the redemption amount
  and every branch below it (manual price, MTM, accrual, coupon
  subtraction) stays consistent. This generalizes what
  `projectPortfolioValue()` was already doing for future dates.
- `portfolioSummary()` now totals **active holdings only** and reports
  `maturedValue`/`maturedCount` separately; `allocationByType()` skips
  matured holdings, so the Dashboard donut doesn't show redeemed money as
  an allocation.
- `ownershipValue()` (the monthly-chart wrapper) delegates its maturity
  check to `isMatured()` instead of its own comparison. **This fixed a real
  one-day inconsistency**: it used `>` against `maturityDate` while
  `isMatured()` is inclusive, so on the maturity date itself the summary
  pills dropped the holding but the chart's final point still counted it.
  If you add another maturity check anywhere, route it through
  `isMatured()` for exactly this reason.
- UI: a green `PartyPopper` banner in `InvestmentsClient.tsx` ("Your
  investment is finalized — you have R$ X to reinvest!"), listing each
  matured holding with its maturity date and final value, plus a line
  saying they're no longer in the totals and stay until deleted — the
  "nothing was silently lost" reassurance that makes excluding them from
  the totals safe. `HoldingsTable` shows a "Matured" pill and swaps the
  value hint to "final value".

Verified against the owner's real data without any temporary edits — a
holding (CDB - BANCO BMG S.A) matures exactly 2026-08-12, so this session
was itself the boundary case. Confirmed the banner, the badge, totals
excluding it (R$ 65.039,11 active vs. R$ 21.963,52 matured), and that the
monthly chart's last point drops by the matured amount. That drop was
verified by reading the Recharts dot `cy` values and interpolating against
the y-axis tick positions, not by eyeballing the line.

**(2) English audit.** The V1.16 goal work and the V1.7 investment taxonomy
had been transcribed straight from Portuguese specs, leaving Portuguese
strings in an otherwise-English UI. Translated `investmentTypes.ts`,
`HoldingForm.tsx`, `HoldingDetail.tsx`, `GoalProjectionCard.tsx`,
`GoalForm.tsx`, and the `"Minha meta"` fallback in `investments/actions.ts`.
Per the owner's explicit choice, **Brazilian product names stay in
Portuguese** — Poupança, Debênture, Tesouro Selic/IPCA+/Prefixado/Renda+/
Educa+, CDB, LCI, LCA, CRI, CRA, FI-Infra, FI-Agro — since those are what
the statements say. `a.a.` → `p.a.` throughout.

**The `value` keys in `investmentTypes.ts` were deliberately left
untouched** — they're persisted in `Investment.type`/`subtype` (free text,
no FK), so translating them would orphan every existing holding. Only the
`label`s changed.

Found one unrelated real bug while sweeping: `BudgetEditor`'s limit inputs
still had a `$` prefix, missed when the app switched USD → BRL in V1.6.
Now `R$`. Remaining Portuguese in the running app is the owner's **own
data** (category "Fatura", methods "Crédito"/"Débito/PIX", entry names) —
left alone. The saved goal's name was `"Reserva de emergência"`, which came
from this app's own preset rather than from her typing it, so it was
renamed to "Emergency fund" in the database; it's editable from the goal
modal either way. `tsc --noEmit` / `npm run lint` clean.

V1.21 (Goal & projection is collapsible) added 2026-08-12 — it's the
tallest block on the Investments page (704px expanded at 1280px) and the
owner wanted it out of the way. Collapsed it's 89px.

Three decisions worth keeping:
- **The body unmounts (`{open && …}`) rather than being hidden with CSS.**
  Inside a `display:none` parent Recharts' `ResponsiveContainer` measures 0
  and the chart comes back collapsed; unmounting means it measures a real
  width on remount. Verified by collapsing and re-expanding, then checking
  the chart measured 929×288 with a 1220-character area path, and the body
  returned to exactly its original 599.94px.
- **Collapse state is per-visit, deliberately not persisted.** Reading
  `localStorage` during the first render would disagree with the
  server-rendered HTML, and the usual escape hatch (set it in an effect) is
  what this project's lint config forbids. If the owner asks for it to
  stick, the honest fix is a column on `AppSettings` — same pattern as
  `cycleStartDay` — not a client-side hack.
- **Collapsed still shows the number that matters** ("Emergency fund —
  43.4% of R$ 150.000,00") and keeps the Edit-goal button, so collapsing
  isn't the same as losing the block. The modal renders outside the
  collapsible region for that reason.

Markup is `<h2><button aria-expanded aria-controls>`, the standard accordion
shape — a `<button>` can't legally contain an `<h2>`, so it can't be the
other way round. Verified at 1280px and 375px: at 375px the header wraps the
Edit button onto its own line with no overlap and no horizontal scroll, and
the toggle's hit area is 169×34 (over the 24px WCAG 2.2 minimum). The
sidebar read 207px mid-measurement at first — the documented hidden-pane
transition artifact again, cleared by reloading at that width instead of
resizing into it. `tsc --noEmit` / `npm run lint` clean.

V1.22 (the brand color is owner-selectable in Settings) added 2026-08-12.
Five options — Green (default), Blue, Violet, Teal, Amber — picked in a new
`AccentColorCard` and stored as `AppSettings.accentColor`
(`prisma/migrations/20260812210000_add_accent_color`, defaulting to `green`
so an existing database looks exactly as it did before).

**The important decision, confirmed with the owner first: green was doing
two different jobs, and only one of them is themeable.** It was both the
brand color (buttons, sidebar, logo, gradients, links) *and* the "positive"
color (income amounts, gains, under-budget bars, the matured banner) paired
against `#dc3545` for expenses. Recoloring both would leave a blue
"positive" against a red "negative", which reads as two arbitrary colors
rather than good vs. bad. So the ~90 hardcoded green hexes in `src/` were
classified one by one into two token families in `globals.css`:
- `--color-brand` / `--color-brand-deep` / `--brand-rgb` — themeable.
- `--color-positive` / `--color-positive-light` / `--color-positive-tint` /
  `--color-positive-glow` — permanently `#0c9e57`, the money semantics.

**Only three values are declared per theme**; everything else
(`--color-brand-tint`, the three button/logo/panel shadows,
`--gradient-brand`) is derived once in a later `:root` block using
`rgb(var(--brand-rgb) / …)`. Custom properties resolve at *use* time, not
where they're declared, so those derived values pick up whichever
`--brand-rgb` won the cascade even though they're declared on the same
element. Adding a sixth color is three lines in `globals.css` plus one entry
in `src/lib/theme.ts` — nothing else.

`theme.ts` holds the names and a **swatch hex per color**. That hex
duplication is deliberate and shouldn't be "cleaned up" into a CSS variable:
`--color-brand` only ever holds the *current* theme's value, so a picker
built on it would render five identical swatches.

The attribute lands on `<html>` **server-side** in `layout.tsx`
(`data-accent={accentColor}`), so the chosen color is in the first painted
frame — a client-side swap would flash green on every page load.
`clampAccentColor()` maps anything unrecognized back to green, because an
unknown `data-accent` matches no CSS block and would silently leave the app
on `:root`'s defaults, which looks like "my setting didn't save".
`updateAccentColor` revalidates `/investments` on top of `revalidateAll()`
for the same reason `updateCycleStartDay` does — the accent is applied in
the root layout, so every route re-renders. Backup gained
`settings.accentColor` (still `version: 3`, additive; an older backup
without it leaves the current color alone).

**Deliberately left green: `categoryColor()`'s `PALETTE` and
`PaymentMethodsCard`'s `TILE_COLORS`.** Both are fixed multi-hue identity
palettes (a category keeps its color regardless of branding) and both happen
to start with `#0C9E57`. Theming one without the other would be
inconsistent, so they stay as-is — if the owner ever wants them off-green,
change both together.

Verified in the browser by switching to Violet through the real Settings
form and then sweeping every element on all four pages for a computed
`rgb(12, 158, 87)`: every remaining hit was money-semantic (income amounts,
gain/loss, budget bars, the "Nice pace" insight, the Income bars/legend, the
matured banner and pill) and no brand element was left green. CSS variables
**do** resolve inside Recharts' SVG presentation attributes — the
`stroke`/`fill` props take `var(--color-brand)` fine, confirmed by the
monthly-value and month-over-month lines turning violet while the Income
bars stayed green. Tailwind's opacity modifier on an arbitrary variable
(`bg-[var(--color-positive)]/12`) also works, compiling to an `oklab()`
mix. Contrast against the glass card: Blue 4.99:1, Violet 5.50:1, Amber
4.85:1 all clear WCAG AA for body text; Teal 3.62:1 and Green 3.36:1 sit in
the same large-text/UI band the brand green has been in since V1.17, so no
option is worse than the previous status quo. `tsc --noEmit` /
`npm run lint` clean.

V1.23 (English / Portuguese language setting) added 2026-08-12, the same
pattern as V1.22's color picker: a `language` column on `AppSettings`
(`prisma/migrations/20260812230000_add_language`, defaulting to `en` so an
existing database keeps the language the app has always been in), a
`LanguageCard` in Settings, and `data-*`-free application via a React
context.

**Hand-rolled, no i18n framework.** Two languages and one user do not
justify next-intl. `src/lib/i18n.ts` is the whole feature: an `en` object,
a `pt` object typed as `Dict` (so a missing key is a **compile error**, not
a stray English string found later in the running app), and `dict(lang)`.
Interpolated copy is a function on the dictionary
(`budgetInsight(amount, over)`, `taxNote(iof, ir, rate, days)`) rather than
string concatenation at the call site, so word order can differ between
languages.

**Server components read the language; client components use a context.**
`getLanguage()` + `dict()` in pages and layouts; `useT()` (from
`components/LanguageProvider.tsx`) everywhere else. The context is
deliberately *not* the explicit prop-threading used for `cycleStartDay` —
the dictionary is needed nearly everywhere and would bury real props — and
it is safe in a way a module-level `let currentLanguage` would not be: a
context value belongs to one render tree, so concurrent requests can't see
each other's language. **The four dashboard cards take `t` as a prop and
that only works because they are server components** — passing an object
containing functions to a *client* component would fail serialization. If
you add `"use client"` to `BudgetsCard`/`RecentEntriesCard`/
`AllocationCard`/`PaymentMethodsCard`, switch them to `useT()` at the same
time.

**Dates follow the language; money never does.** `formatCurrency` stays
pt-BR/BRL in both languages — the money is Brazilian whatever the interface
language is. The date helpers in `format.ts` take an optional `lang`
(threaded the same way `startDay` is, defaulting to `en`), and Portuguese
deliberately uses **numeric** formats rather than Intl's `short` style:
pt-BR renders `{month:"short", day:"numeric", year:"numeric"}` as
"15 de jun. de 2027", three times the width of "Jun 15, 2027", which
overflows a 90px table column. So pt gets `dd/MM/yyyy` and `dd/MM` — which
is what Brazilians write anyway. `monthLabel` composes the month and year
**separately** for the same reason: asking Intl for month+year together
gives "ago. de 2026" and wraps every chart axis, versus "ago 2026" built
from the parts.

**The investment taxonomy's labels moved out of `investmentTypes.ts` into
the dictionary**, keyed by the same `value` that's persisted in
`Investment.type`/`subtype`. Those keys are still never translated (that
would orphan every holding) — only the labels are, and there's now exactly
one place per language holding them. **The persisted values are not what
you'd guess from the English labels**: they're `tesouro-pre`,
`debenture-incent`, `fidc`, `fii-fechado`, `fundo-mm` — a first pass at the
dictionary invented plausible-looking keys and silently fell through to the
raw value. Check `investmentTypes.ts` before adding a subtype key.
Projection horizon labels ("1y" → "1a") are likewise built from a number
plus a translated unit rather than stored as text.

**Not translated, deliberately:** the owner's own data (category names,
payment methods, entry and holding names, the goal name), the "financehub"
wordmark, and Brazilian product names in the taxonomy (CDB, LCI, Poupança,
Tesouro IPCA+…) — same reasoning as the V1.20 English audit, those are what
the statements say.

Verified end to end: switched to Portuguese and dumped the rendered text of
all four pages, confirming every string was translated except the owner's
own data; switched back to English through the actual Settings form and
watched the whole page (including cards above and below) follow. Then a
regex sweep of every `.tsx` for JSX text nodes and copy-bearing attributes,
which now reports exactly one hardcoded string left — the "financehub"
wordmark. `tsc --noEmit`, `npm run lint` and a full `next build` all clean.

V1.24 (chart-legend overlap fix + Settings reorganized) added 2026-08-12.

**(1) Legend overlap.** The owner sent a screenshot of the dashboard's
Spending-by-category legend with the category name painted straight over the
amount ("Mimos" across "R$ 200,00"). The markup already looked like the V1.8
fix — `justify-between`, `gap-3`, `shrink-0 whitespace-nowrap` on the value,
`min-w-0` on the label — but it had only **half** of that pattern: `min-w-0`
without a matching `truncate`. `min-w-0` lets the box shrink below its text,
and with nothing clipping, the text renders outside the box. Since the value
is `shrink-0`, *all* shrinkage lands on the label, so in a ~120px legend
column beside the 160px donut a 72px label plus a 60px amount overflows by
about the amount seen in the screenshot.

Fixed by making the row wrap instead of crushing the label: `flex-wrap`
plus `gap-x`/`gap-y` on the `<li>`, **`min-w-0` removed** from the label
(it suppresses the wrap — it's what removes the `min-width: auto` that
triggers wrapping, exactly as the V1.8 note warns), and `break-words` for a
single category name longer than the column. Truncation was rejected: a
legend that says "Assinatu…" is worse than one that uses a second line. The
identical markup in `AllocationChart` had the same latent bug and was fixed
in the same pass.

**Reproducing it needed real data** — the dev database had no expenses in
the current cycle, so temporary "Mimos"/"Assinaturas" entries and categories
were inserted (ids prefixed `tmp-`), measured, then deleted; the owner's 25
real entries were untouched.

**Methodology note, again:** the first three measurement attempts reported
`viewport: 0` and every ancestor at zero width, which "explained" the
overlap perfectly and was entirely false — the Browser pane had stopped
compositing. `window.innerWidth === 0` is the cheapest tell that a
measurement is worthless; a reload in a **fresh tab** (`tabs_create`) is
what recovered it, not `resize_window`. After that the fix measured
correctly: short labels share a line with the amount, long ones push it to
a second line, `overlaps: false` and nothing clipped.

**(2) Settings reorganized.** Eight cards sat in one flat grid at equal
visual weight, so "Language" read as being as important as "Monthly
budgets". Now three headed sections on the same scrollable page (confirmed
with the owner — tabs and a plain reorder were the alternatives offered):
- **Money** — expense categories, income categories, monthly budgets,
  payment methods.
- **Preferences** — month start day, plus colour and language stacked in
  one column so the two "how it looks" settings sit together.
- **Data** — backup & restore, full width.

Section headings are the small uppercase mono style already used for card
sub-labels, so they read as structure rather than as more cards. The owner
chose to keep the two category cards separate rather than merging them
behind an Expense/Income toggle. Verified at 1280px and 375px (no
horizontal overflow, sections collapse to one column) and in both
languages. `tsc --noEmit` / `npm run lint` clean.

V1.25 (offline license keys + 14-day trial) added 2026-08-17, the first piece
of work aimed at *selling* the app rather than using it.

**A key is an Ed25519 signature over `"<normalized email>|financehub-1"`,
base32-encoded.** The app embeds only the public key (`PUBLIC_KEY_PEM` in
`src/lib/license.ts`); the private key lives in `license-signing-key.pem`,
which is gitignored by the pre-existing `*.pem` rule and written mode 0600.
`scripts/make-license.js` is the seller side (`keygen` / `sign <email>` /
`check <email> <key>`) and is never shipped to customers.

**Asymmetric rather than HMAC, deliberately.** An HMAC scheme gives short
pretty keys (`XXXX-XXXX-XXXX`) but the secret has to ship inside the app, so
anyone who unpacks the `.exe` can mint unlimited keys. With Ed25519 the worst
an attacker learns by reading our code is the public key. The cost is a
~104-character key, which is why the gate uses a **textarea** and
`normalizeKey()` strips case, dashes and whitespace — a buyer pasting from an
email client must not be able to get it wrong. `PRODUCT_ID` is inside the
signed message so a future paid 2.0 can require newly-issued keys.

**Zero new dependencies** — Node's built-in `crypto` does Ed25519
(`crypto.sign(null, …)` / `crypto.verify(null, …)`), which matters given this
project's "keep the dependency list small" rule.

**`getLicenseStatus()` re-verifies the signature on every call** rather than
trusting an `activated` boolean. This is the difference between a real check
and a decorative one: confirmed by hand-writing
`email='pirate@example.com', activatedAt=now` straight into SQLite and
watching the app stay gated. If you ever cache this, keep the re-verification.

**No trial — `TRIAL_DAYS = 0` in `data.ts`, a hard gate**, per the owner's
decision: the model is a one-time payment where the buyer receives the
installer plus a key, so there is nothing to try before buying. The trial
machinery (the `trial` status, `TrialBanner`, the countdown copy in both
languages, `License.firstRunAt`) is **deliberately left in place** rather than
deleted, because it makes offering a trial later a genuine one-constant change.
That is configuration, not dead code — don't strip it on a tidy-up pass. The
clock would run from `firstRunAt`, which the migration seeds with
`CURRENT_TIMESTAMP`, so raising the constant later gives existing installs the
remainder of the new window rather than nothing.

Because a hard gate means the very first screen a buyer ever sees is the
activation form, its copy is written as an invitation ("Activate FinanceHub …
runs offline on this computer — no account, no sign-in"), not as an
expiry notice. If a trial is ever enabled the same wording still reads
correctly at expiry.

**Two things stay open when the trial expires, on purpose:**
- `/api/backup` is a Route Handler and therefore *not* behind the layout gate,
  and the gate screen links to it ("Export my data"). Nobody should ever have
  their own numbers held hostage to a sale. That link is hidden when
  `hasAnyData()` is false, so it doesn't appear on a fresh install where there
  is nothing to export and it would only confuse.
- Nothing is deleted or hidden; activating later brings the app back exactly
  as it was, which is also what the gate copy promises.

**`License` is excluded from backup export/import** (see the note in
`importBackup`). Including it would make "send me your backup file" a way to
hand someone a paid copy, and wiping it on import would deactivate the app
every time a backup was restored.

The gate replaces `{children}` in `layout.tsx` but keeps the sidebar, so an
expired copy still looks like the app rather than an error page. A
`LicenseCard` in Settings → Data shows the current state read-only — there's
deliberately no "deactivate" button, since on a one-file local app that could
only ever lock the owner out.

Verified: 13 assertions against the compiled crypto (correct key accepted;
wrong email, truncated, single-character-tampered, random 64-byte and garbage
keys all rejected; base32 round-trips), all four routes gated when expired,
export still working while gated with no key present in the file, a forged key
rejected through the real form, and activation succeeding with a **lowercase**
key and a space-padded mixed-case email. `tsc --noEmit`, `npm run lint` and
`next build` all clean.

**Still missing before this can actually be sold** (none of it is code in this
repo): code signing on both platforms — an unsigned paid download hits
SmartScreen/Gatekeeper warnings, which is the single biggest trust problem —
`mac.arch` is unset so only arm64 Macs are covered, there is no auto-update
channel, and there are no EULA/privacy/refund documents.

## Tech stack

- **Next.js 16 (App Router) + TypeScript**, on **React 19** — single app for both UI
  and mutations, one dev command to run everything.
- **SQLite via Prisma 7** — data persists in a local file (`financehub.db`) in the
  project directory. No external database server.
- **Tailwind CSS v4** — utility-first styling for a clean, consistent look.
- **Recharts v3** — charting library for the dashboard.
- **lucide-react** — icon set used throughout (category icons, nav, buttons). Icons
  are looked up by a small hardcoded kebab-case-name → component map in
  `src/components/CategoryIcon.tsx`, not lucide's dynamic-icon-by-string API (that
  requires an extra lazy-loading entry point that wasn't worth the complexity for
  the ~15 icons this app actually uses).
- **Server Actions** (not API routes) handle all create/update/delete — forms call
  server functions directly (e.g. `src/app/entries/actions.ts`), no client-side
  fetch boilerplate. The one exception is `src/app/api/backup/route.ts`, a GET
  Route Handler, because file downloads need a real HTTP response with headers.
- **Electron** (optional, for the desktop app only) — wraps the same Next.js app so
  it can run as a double-clickable Mac app instead of `npm run dev`. See "Desktop
  app (Electron)" below; this is genuinely the trickiest part of the codebase and
  worth reading in full before changing anything under `electron/` or `scripts/`.

Rationale: this is the simplest stack that still supports real persistence and a
genuinely well-designed UI.

### Version-specific gotchas (don't rediscover these)

This project uses newer major versions than what most AI training data / tutorials
assume. Things that broke naive assumptions during the build:

- **Prisma 7 requires a driver adapter** — `new PrismaClient()` alone throws.
  `src/lib/db.ts` uses `@prisma/adapter-better-sqlite3` (`PrismaBetterSqlite3`,
  note the casing). The `better-sqlite3` native module and `@prisma/engines` needed
  `npm approve-scripts` since npm 11 blocks install scripts by default now.
- **Prisma client generates to `src/generated/prisma`**, not `node_modules/@prisma/client`
  (set in `prisma/schema.prisma`'s `generator` block). Import from `@/generated/prisma/client`.
  This path is gitignored.
- **`prisma.config.ts`** (not just `schema.prisma`) is now the source of truth for
  the CLI — it loads `DATABASE_URL` via `dotenv/config`. Needed `npm install -D dotenv`.
- **Recharts `Tooltip` `formatter` prop** takes `ValueType | undefined`, not `number`
  directly — cast with `Number(value)` inside the formatter or TS build fails.
- **All three pages use `export const dynamic = "force-dynamic"`** — without it, Next
  statically prerenders them at build time and they won't reflect new data if you
  ever run `next build && next start` instead of `next dev`.
- **Date handling**: entry dates are stored as local calendar dates. The `<input
  type="date">` value (`"YYYY-MM-DD"`) is parsed with `new Date(y, m-1, d)`, never
  `new Date(dateString)` — the latter parses as UTC midnight and silently shows the
  wrong day depending on the user's timezone. Same reasoning in `toDateInputValue`
  (uses local getters, not `toISOString`). If you touch date logic, keep this in mind.
- **React's `set-state-in-effect` lint rule**: don't reset controlled form state
  inside the `useActionState` success effect in `EntryForm.tsx` — mirror the existing
  pattern there (only `formRef.current?.reset()` for uncontrolled fields; controlled
  state like `type`/`seriesType` intentionally persists across submissions so adding
  several similar entries in a row doesn't require re-selecting options).
- **Browser preview pane quirk (tooling, not app bug)**: during this session, a few
  `computer{action:"screenshot"}` calls returned a blank white image, or a stale
  scroll position, right after a `scrollIntoView` or `scroll` action — even though
  the DOM/content was confirmed present via JS query and the action's network
  request succeeded. If a screenshot looks blank or cut off but you just interacted
  with the page, verify via `javascript_tool` (check `getBoundingClientRect()`,
  `scrollY`) before assuming the app broke — a plain re-navigate or resizing the
  window taller (to avoid needing to scroll at all) also clears it.
- **The Browser pane is `document.visibilityState === "hidden"`, which pauses CSS
  transitions and throttles ResizeObserver/rAF** — so `getBoundingClientRect()`
  can report the *pre-transition* layout indefinitely. This produced two
  convincing false bug reports during the V1.17 audit: `Nav.tsx`'s sidebar
  measuring 207–240px instead of its settled 72px (its `transition-[width]`
  never advanced, though React state and the inline `style.width` were already
  correct), and Recharts `ResponsiveContainer` reporting 14–40px chart widths.
  Before trusting any measurement, inject
  `*{transition:none!important;animation:none!important}` and force a reflow;
  a screenshot also forces a paint. If a measured layout disagrees with the
  element's own inline style, suspect this first. For anything that doesn't
  need layout (accessible names, labels, markup), `curl` the page and parse the
  HTML instead — far more reliable than driving the pane.
- **`Modal.tsx` portals to `document.body`, and must keep doing so** — a
  `position: fixed` overlay normally resolves against the viewport, but any
  ancestor with `backdrop-filter` (also transform/filter/perspective/contain)
  becomes the containing block for fixed descendants instead. This app's glass
  `CARD` style includes `backdrop-blur-xl`, so a `<Modal>` rendered anywhere
  inside a card sizes and centres itself **against that card** rather than the
  screen. That's exactly what happened to the "Definir meta" dialog in V1.16,
  which renders `<Modal>` inside `GoalProjectionCard`'s own card (the other
  four call sites happen to sit at the top level of their client components,
  which is why they never showed it). Fixed in V1.18 with `createPortal` into
  `document.body`, so placement in the component tree can't matter again. The
  `typeof document === "undefined"` guard is there because `createPortal`
  needs a real DOM node and this renders during SSR too — deliberately not a
  mounted-flag-in-an-effect, since this project's lint config rejects
  `setState` inside an effect.
- **Recharts `Pie` sometimes renders an empty `<g class="recharts-shape">`** (no
  `<path>`, so the donut is just... gone) with the default animation on, in this
  Next 16 dev + React 19 setup — looked like a real bug (confirmed via
  `recharts-pie-sector` having zero child paths) but wasn't data-related; multi- and
  single-slice pies were equally affected. Fixed by passing `isAnimationActive={false}`
  to `<Pie>`. Added the same prop to `<Bar>`/`<Line>` defensively, since they share
  the same animation machinery, even though they weren't observed failing.

## Core features — all implemented

**Logging** (`src/app/entries/`)
- Add/edit income or expense entries via a **popup modal** (`src/components/Modal.tsx`,
  a reusable glass dialog with backdrop-click/Esc-to-close), opened from the "Add
  entry" button or a row's "Edit" action — not an inline expanding card like V1–V1.3.
  Fields, in order: type toggle, **Name** (required — a short title, e.g. "Trader
  Joe's"), Date, Notes (optional freeform text — the original "Note" field, just
  relabeled), Category, Value (amount), Payment method (optional, expense only),
  Repetition (recurring/installments, add-only, hidden while editing)
- `Entry.name` (required `String`) was added in V1.5, separate from the pre-existing
  optional `note` field — see "Data model" below for the migration/backfill approach
- Table and dashboard "Recent" list show `name` as the primary label with `note` (if
  present) as smaller secondary text underneath — previously `note || category` was
  the primary label
- **Recurring entries**: "Repeats monthly" creates 12 linked entries (one per month,
  day-of-month clamped for shorter months) sharing a `groupId`
- **Installments**: splitting an expense into N months divides the amount evenly
  across N linked entries (last cent of rounding error, if any, lands on the last
  installment — not reconciled, matches the reference app's simpler approach)
- Edit and delete entries (delete has a native `confirm()` prompt); entries in a
  series get an extra **"Delete series"** action that removes every entry sharing
  that `groupId`, with its own confirm showing the count
- Table view filterable by month and type, with a Method column (hidden below `md`)
  and a small badge for recurring/installment entries
- Categories and payment methods are **DB-driven** (`Category`/`PaymentMethod`
  models), not hardcoded — manage them on the Settings page. `src/lib/categories.ts`
  now only holds the *default* seed lists (`DEFAULT_EXPENSE_CATEGORIES` etc.) and
  the `categoryColor()` hash-to-palette function, which works for any category name
  including ones the owner adds later.

**Dashboard** (`src/app/page.tsx`) — a 3-column grid (stacks to 1 column below `lg`):
- Header: a welcome line + an "Add entry" button that links to `/entries`, plus
  three separate stat-pill cards (Income / Expenses / Net savings) below it — V1.4
  reintroduced these as dedicated glass cards, reversing V1.2's "fold into one
  subtitle line" decision; see "Visual design system" for why
- Col 1: **Budgets** (`BudgetsCard.tsx`) — progress bars for expense categories that
  have a limit set, current month only, plus a "Nice pace" / "Over budget" insight
  computed from the totals; **Recent** (`RecentEntriesCard.tsx`) — last 5 entries
  across all time, with a count badge showing the total entry count
- Col 2: **Spending by category** (`SpendingByCategoryCard.tsx`, wraps
  `SpendingByCategoryChart.tsx`) — donut chart with its own month picker; **Income
  vs. expenses** — bar chart, last 4 months; **Allocation** (`AllocationCard.tsx` /
  `AllocationChart.tsx`, added V1.6, regrouped by investment **type** in V1.7) —
  donut of investment holdings by type (Renda Fixa/Fundo/Ação/Cripto/Outro),
  links to `/investments`
- Col 3: **Month-over-month net** — line chart, last 4 months; **Payment methods**
  (`PaymentMethodsCard.tsx`) — teaser showing up to 4 methods as icon tiles, links
  to Settings; **Monthly value** (`PortfolioValueChart.tsx`, added V1.6, retitled
  and switched from price-entry dates to calendar months in V1.12) — line chart,
  last 12 months, from `monthlyPortfolioValue()`, one point per calendar month
  (last day of each past month, today for the current one) rather than
  whatever dates the owner happened to update prices on. Each holding
  contributes 0 before its `startDate` and 0 after its `maturityDate` (see
  `ownershipValue()` in `src/lib/investments.ts`) — a holding that hasn't been
  bought yet, or has already matured, shouldn't count toward the total
- Empty state with a CTA when there are no entries yet (this gates on `Entry` rows
  only — a holding-only portfolio with zero entries still sees this welcome screen;
  investment cards aren't special-cased around it)

Note: the design handoff's mock had "Upcoming bills" and "Reminders" cards in place
of the category chart and income/expense chart — those showed fabricated data (a
hardcoded "Netflix due Aug 03", a fake auto-pay reminder) with no backing feature or
data model. Rather than invent a bill-scheduling/reminders feature or show made-up
obligations in a finance app, those two slots were filled with real, existing
dashboard modules instead. Don't reintroduce fake bills/reminders without building
the underlying feature first.

**Investments** (`src/app/investments/`) — a full Brazilian-market portfolio
tracker, structured like Entries (page fetches → client component owns modal
state → table + modal), fully local/offline, no price-feed API of any kind.
V1.6 (2026-07-30) shipped a simple version (assetClass/quantity/avgCost); V1.7
(2026-07-30, same day) replaced it entirely with the type/subtype/tax model
below, ported from a detailed spec the owner provided for another
implementation ("Controle Financeiro"), **excluding that spec's live
brapi.dev/CoinGecko/BCB/Tesouro-Direto price-fetching** — every price and rate
in this app is entered by hand, by the owner's explicit choice. The two V1.6
test holdings were disposable fixtures and were dropped rather than migrated
(see "Data model").

- **Taxonomy** (`src/lib/investmentTypes.ts`): 5 types (Renda Fixa, Fundo, Ação/ETF,
  Cripto, Outro) and ~24 subtypes under Renda Fixa/Fundo, each tagged with an
  IR-exemption flag and a *valuation mode*. This module is the single source of
  truth for which fields the add/edit form shows for a given type/subtype
  (`showsPosition`, `showsRateFields`, `showsMaturityDate`, etc.) and for the
  IR/IOF tax tables — `src/lib/investments.ts` and `HoldingForm.tsx` both read
  from it rather than duplicating the rules.
- **Valuation** (`valueAtDate()` in `investments.ts`, the one place this chain
  lives — `currentValue()`, the value-over-time chart, and the tax calculations
  all call it so they can't disagree with each other):
  1. A manual price/value entered via Update Prices on or before that date, if
     one exists — interpreted as *price per unit* (× `quantity`) for Ação,
     Cripto, and Tesouro Direto subtypes, or as the *direct total value* (MTM)
     for Fundo and the MTM Renda Fixa subtypes (NTN-F, debêntures, CRI, CRA,
     Outro RF).
  2. Otherwise: flat `amountInvested` for Ação/Cripto with no price ever
     entered, or compound accrual (`accrualValue()`) for everything else —
     `amountInvested × (1 + effectiveRate/100) ^ (daysHeld/365)`.
  `getEffectiveRate()` resolves `indexador` (prefixada/% CDI/CDI+/IPCA+/% SELIC)
  against the manually-maintained Reference Rates (see Settings below). It
  groups `fundo` with `renda-fixa` for this resolution — the source spec's own
  pseudocode only special-cased `renda-fixa`, which would leave Fundo holdings
  with no working rate since they don't have an `expectedReturn` field on the
  form; this is a deliberate fix, documented in a comment at the call site, not
  an accidental deviation.
- **Tax estimate** (`taxBreakdown()`): regressive IOF (first 30 days) then
  regressive IR (22.5%/20%/17.5%/15% by holding period, overridden to a flat
  15% for Ação/Cripto, 0% for Fundo "simplified" per the spec, and 0% for the
  exempt subtypes — LCI, LCA, Poupança, CRI, CRA, Debênture Incentivada,
  FI-Infra, FI-Agro). Shown next to gain/loss in the holding detail view with an
  explicit **"estimate for personal reference, not tax filing guidance"**
  disclaimer — this reverses the original spec's "no tax reporting" non-goal on
  the owner's explicit instruction, so keep that framing intact if you touch it;
  don't let it read as authoritative. Come-cotas isn't modeled for funds.
  Verified by hand against Python cross-checks for the accrual+regressive-IR,
  unit-price+flat-IR, and IR-exempt paths during this session — see the git-free
  session history if you need the worked examples.
- Add/edit holdings (`HoldingForm.tsx`, all field visibility driven by
  `investmentTypes.ts`): Nome, Tipo, Data de início always shown; Subtipo/
  Símbolo/Data de vencimento/Indexador+Taxa+Spread/Taxa de administração/Taxa de
  performance/Quantidade+Preço/Retorno esperado/Corretagem all conditional.
  `amountInvested` auto-calculates from `quantity × purchaseRef` while the user
  hasn't touched it manually (tracked via an `amountTouched` flag, not
  overwritten after that).
- **Update prices** (`UpdatePricesModal.tsx`) — one date field + one price input
  per holding, submitted as a batch (`savePrices()`). Blank inputs are skipped.
  Saving upserts on `(investmentId, date)` — re-saving the same holding+date
  *replaces* that day's value, never adds a row; every other date is a new,
  permanent `PricePoint`. Each row hints whether the number expected is "price
  per unit" or "current total value" based on the holding's valuation mode.
- Holdings table: name/institution, type+subtype chip (`typeIconName()` +
  `typeColor()`), current value with a "manual · date" or "accrual estimate"
  hint, gross gain/loss (full IOF/IR breakdown lives in the detail view, not
  the table, to keep it scannable).
- Clicking a holding's name opens its **detail view** (`HoldingDetail.tsx`): a
  **monthly value chart** (added V1.11, via `monthlyValue()` — one point per
  calendar month, evaluated through `valueAtDate()` so it's accrual/coupon-
  aware even with zero manual prices; zero before `startDate`/after
  `maturityDate` since V1.12, see `ownershipValue()`), a manual-price-entries sparkline below
  it (handles a single point fine, just renders the dot), the full tax
  breakdown, every dated price (individually editable via `updatePricePoint`
  or deletable via `deletePricePoint`), and — added V1.10, gated to
  `showsRateFields(type)` (Renda Fixa/Fundo only) — a **coupon payments**
  section (`CouponAddForm`/`CouponRow`, same edit/delete pattern as price
  rows) for recording juros semestrais/coupon distributions. Derives its
  holding from the live `holdings` prop by id (`viewingId`, not a frozen
  object) so edits inside it show up immediately.
- Summary pills: Total value, Total invested, Total gain/loss (once return% is
  computable — `amountInvested` is required now, so unlike V1.6 this isn't
  conditional on an optional cost field), and — V1.10, only shown when > 0 —
  Coupons received.
- **Projection chart** (`ProjectionChart.tsx`, added V1.10): total portfolio
  value at fixed future horizons (30d/60d/90d/6m/9m/1y/3y/5y/10y/15y/20y),
  computed by `projectPortfolioValue()` in `src/lib/investments.ts`. Reuses
  `valueAtDate()` unchanged for the actual math (see that function's doc
  comment) — a thin wrapper just caps the projection date at a holding's
  `maturityDate` so matured holdings freeze rather than assume automatic
  reinvestment. Labeled "an estimate, not a forecast" next to the chart; don't
  let wording changes make it read as more authoritative than it is (same
  spirit as the tax disclaimer). This is a value-over-time projection, not the
  goal-tracking/monthly-contribution-simulator "Investment Projector" from the
  original spec — that one's still deferred, see below.
- **Monthly value chart** (added V1.11, beside Projection in a 2-column grid
  that stacks below `lg`): total portfolio value at the end of each of the
  last 12 calendar months, via `monthlyPortfolioValue()` — also now what the
  Dashboard's "Monthly value" card shows (see "Dashboard" above; V1.12
  replaced the Dashboard's old price-entry-dated chart with this same
  function so the two pages agree). Each holding's contribution is 0 before
  its `startDate` / after its `maturityDate`, per `ownershipValue()` — a
  V1.12 fix, since the original version counted a holding's `amountInvested`
  starting from before it was even bought (an artifact of `accrualValue()`'s
  `days <= 0` → flat-`amountInvested` branch, which is correct for *current*
  value math but wrong for a historical timeline). See the per-holding
  version of this same chart under `HoldingDetail.tsx` above.
- **Reference rates** (CDI/SELIC/IPCA): a `ReferenceRates` singleton table.
  Was editable on Settings via `ReferenceRatesEditor.tsx`; that editor (and
  its dedicated `updateReferenceRates` action) was removed in V1.9 per the
  owner's request. The model, `getReferenceRates()`, and the defaults
  (12.65/13.25/5.5) are all still here and still drive accrual — there's just
  no UI to change them anymore, so they're effectively fixed at whatever they
  were last set to (or the defaults, if never touched).
- Deleting a holding explicitly deletes its `PricePoint` and `CouponPayment`
  rows first, in a `$transaction`, rather than relying on the schema's
  `onDelete: Cascade` alone — SQLite only enforces foreign keys when `PRAGMA
  foreign_keys = ON` for the connection, and this project doesn't rely on that
  being set. Do the same (explicit delete, don't trust the cascade) anywhere
  else you delete an `Investment` row, including in `importBackup`'s wipe step.
- **Goal & projection** (`GoalProjectionCard.tsx` + `GoalForm.tsx` +
  `components/GoalProjectionChart.tsx`, added V1.16, math in
  `src/lib/goal.ts`): the goal-tracking/monthly-contribution simulator the
  earlier specs deferred — money-weighted actual return (XIRR), a progress
  bar against an `InvestmentGoal` singleton, and two solvers (contribution
  needed to hit the target date / date reached at the current
  contribution). Distinct from the V1.10 Projection chart above, which has
  no goal or contributions. Framed as tracking, never as advice.
  **Collapsible since V1.21** — the body unmounts rather than being CSS-
  hidden (Recharts measures 0 inside a `display:none` parent), and the
  collapsed header keeps the progress figure plus the Edit-goal button.
- **Matured holdings** (added V1.20): once a holding reaches its
  `maturityDate` (inclusive), `isMatured()` treats it as finalized — its
  value freezes at the redemption figure, it drops out of the summary
  totals, the allocation donut and the monthly charts, and a banner on the
  Investments page says how much is now free to reinvest. It is **not**
  deleted; the row stays with a "Matured" badge until the owner removes it,
  so price and coupon history survive. Route any new maturity check through
  `isMatured()` rather than comparing dates again — see V1.20 for the
  off-by-one-day bug that came from having two comparisons.
- **Not built** (deferred, matching the owner's own scoping): any live
  price/rate fetching. It would slot in without a schema change if asked
  for later — a `ticker` field + a manual "refresh" button, per the P2 note
  below.

**Settings** (`src/app/settings/`) — a dedicated page, not a slide-over panel like
the reference file used (simpler to reason about, consistent with how
Dashboard/Entries already work)
- Add/remove expense categories, income categories, payment methods
- Set monthly budget limits per expense category (blank/0 = no limit)
- **Backup & restore**: "Export backup" downloads all data — including
  `Investment`/`PricePoint` history and `ReferenceRates` since V1.7, and
  `CouponPayment` history since V1.10 (still `version: 3` in the backup
  JSON — coupons are an additive optional field on that same shape, so a
  pre-V1.10 version-3 backup still imports fine, just with zero coupons) —
  as JSON via `GET /api/backup`; "Import
  backup" replaces *all* current data with the uploaded file's contents after a
  confirm prompt (destructive by design, matches the reference app — there's no
  merge option). A `version: 2` (V1.6-shape) backup's `investments` entries
  don't match the new required fields (`type`/`amountInvested`/`startDate`), so
  `importBackup` filters them out rather than guessing a mapping — same
  "treat as empty, don't error" handling as a backup with no `investments` key
  at all.
  An older (`version: 1`) backup without an `investments` key imports fine —
  treated as zero investments, not an error
- "Restore default categories & payment methods" resets those three tables back to
  the seed lists

Currency is hardcoded to BRL (`Intl.NumberFormat("pt-BR", { currency: "BRL" })`) in
`src/lib/format.ts` (`formatCurrency`) — switched from USD in V1.6 when the
Investments module was added, since the owner is Brazil-based and her holdings are
in reais. This is app-wide: entries, budgets, and the dashboard all display R$, not
just Investments. Chart axis tick labels that hardcode a currency symbol (in
`IncomeVsExpenseChart.tsx` / `MonthlyTrendChart.tsx`) use `R$` too — if you add
another chart with a Y-axis tick formatter, match this.

## Visual design system

Green-accented glassmorphism redesign (V1.4, light-mode-only — the Figma Make
reference didn't include a dark variant, so `globals.css` has no
`prefers-color-scheme` block). This superseded V1.2's flat-card/top-nav look
(colors, layout, and card treatment below are all V1.4; a couple of things V1.2
introduced, like the fonts and the `CARD` constant's *name*, carried forward
unchanged). Keep new UI consistent with these tokens rather than inventing new ones:

- **Fonts**: unchanged from V1.2 — Plus Jakarta Sans (headings/UI, weights 400–800)
  + DM Mono (numbers, dates, uppercase labels/badges) — loaded via
  `next/font/google` in `layout.tsx` as `--font-jakarta` / `--font-dm-mono`, wired
  into Tailwind's `font-sans`/`font-mono` in `globals.css`'s `@theme inline` block.
- **Colors** (CSS custom properties in `globals.css`). Since V1.22 these split
  into two families, and which one a new piece of UI belongs to is a real
  decision, not a formatting choice:
  - **Brand, themeable** — `--color-brand` / `--color-brand-deep` /
    `--brand-rgb`, plus the derived `--color-brand-tint`, `--gradient-brand`
    and the three `--shadow-brand*` values. Buttons, sidebar, logo, links,
    highlights, single-series chart lines. The owner picks one of five in
    Settings; default green `#0C9E57` with `#0A7A43` as the gradient end, i.e.
    the V1.4 Figma palette.
  - **Money semantics, fixed** — `--color-positive` `#0C9E57` (+ `-light`,
    `-tint`, `-glow`) for income/gain/under-budget, against `--color-rust`
    `#DC3545` for expense/over-budget/destructive (which replaced V1.2's brown
    "rust" `#8A3A28` — don't be misled by the name, it's red). These never
    follow the brand color; see V1.22 for why.
  - Ink `#111827` (primary text), page bg `#EEF1F7` (was `#E9E9EC`).
  **Never hardcode either family's hex again** — a literal `#0c9e57` in a new
  component is invisible to the theme switcher. `--color-meadow`/
  `--color-emerald`/`--color-green-tint` were removed in V1.22; `grep` for them
  returns nothing, and the brand ones now carry an honest name.
- **Category colors**: `src/lib/categories.ts`'s `categoryColor()`/`PALETTE` were
  reassigned to a brighter multi-hue set (blue/amber/purple/teal/pink/orange) to
  match the reference's playful category-chip look, replacing V1.2's
  monochrome green/brown scheme. `categoryIconName()`/`methodIconName()` icon
  mapping is unchanged.
- **Layout**: no more single wrapping panel. `layout.tsx` renders a full-height
  `<Nav>` (left sidebar, see below) + `<main>` split, with three fixed
  `pointer-events-none` radial-gradient "blob" divs (green/blue/purple, heavily
  blurred) positioned behind everything for the ambient background effect. Pages
  render into `<main>`'s own `max-w-[1400px]` centered container.
- **Sidebar nav** (`src/components/Nav.tsx`, still named `Nav` though it's no
  longer a top bar): collapsible (icon-only at 72px vs. 240px expanded, toggled by
  clicking the logo), glass background (`bg-white/65 backdrop-blur-2xl`), active
  link gets a green-tinted background + green text. Shows a "current month" IN/OUT
  summary card at the bottom — `layout.tsx` (a server component) queries
  `prisma.entry` for the current month's date range and passes `income`/`expense`
  down as props, so every route pays a small extra query for this; acceptable for
  a local SQLite app.
- **Glass card style**: `CARD` constant in `src/lib/ui.ts` now adds translucency +
  blur (`bg-[var(--color-card)] backdrop-blur-xl` where `--color-card` is
  `rgba(255,255,255,0.7)`) on top of the existing border/radius/shadow, so cards
  read as frosted glass over the ambient blobs rather than flat white. Most cards
  still use `` `${CARD} p-5` `` (or similar padding) rather than repeating classes
  inline — that convention is unchanged from V1.2.
- **Dashboard header**: reintroduced separate stat-pill cards (Income / Expenses /
  Net savings, each its own glass `CARD`) above the three-column grid, matching the
  reference's `StatPill` component. This reverses V1.2's "fold into one subtitle
  line" decision — if a future redesign removes stat pills again, update this note.

## Data model

`Entry` (`prisma/schema.prisma`):
- `id` (cuid), `name` (String, **required** — short title, added in V1.5 via
  `prisma/migrations/20260730130000_add_entry_name`; existing rows were backfilled
  with `name = category` since no better default existed. The Prisma field carries
  `@default("")` only so the SQL migration's `NOT NULL DEFAULT ''` doesn't drift
  from schema on a future `prisma migrate dev` — the app always requires/sends a
  real name, so that default is never actually used in practice), `amount` (Float),
  `date` (DateTime, local calendar semantics)
- `type` (String: `"income"` | `"expense"` — SQLite has no enum support in Prisma)
- `category` (String, free text — no FK to `Category`, so removing a category never
  breaks existing entries), `note` (optional freeform text, labeled "Notes" in the
  UI), `method` (optional)
- `groupId` / `seriesType` (`"fixed"` | `"installment"`) / `installmentNum` /
  `installmentTotal` — all optional, only set for recurring/installment entries
- `createdAt` / `updatedAt`

`Category`: `id`, `name`, `type` (`"income"` | `"expense"`), unique on `(name, type)`
so e.g. "Other" can exist in both.

`Budget`: `id`, `category` (unique string, not an FK), `limit` (Float).

`Investment` (V1.6 shape replaced entirely in V1.7 — see
`prisma/migrations/20260730210000_investment_br_tax_model`, a hand-written
migration that **drops and recreates** `Investment`/`PricePoint` rather than
altering columns, since the only existing rows were V1.6 test fixtures with no
sensible mapping into the new required fields — `type`, `amountInvested`, and
`startDate` didn't exist before):
`id`, `name`, `type` (String — `renda-fixa`/`fundo`/`acao`/`cripto`/`outro`,
see `src/lib/investmentTypes.ts`), `subtype` (optional String, renda-fixa/fundo
only), `indexador` (optional String), `annualRate` / `spread` / `adminFee` /
`perfFee` (all optional Float), `amountInvested` (Float, **required** — total
capital invested, not a per-unit cost; this is the field V1.6's `avgCost` was
replaced by), `startDate` (DateTime, **required**, local calendar semantics —
same handling as `Entry.date`), `maturityDate` (optional DateTime), `symbol` /
`quantity` / `purchaseRef` / `expectedReturn` / `corretagem` / `institution` /
`notes` (all optional), `createdAt` / `updatedAt`. Has `prices: PricePoint[]`
and (added V1.10) `coupons: CouponPayment[]` relations. None of
`type`/`subtype`/`indexador` are FKs — same free-text
reasoning as `Entry.category` — the taxonomy lives in code
(`investmentTypes.ts`), not the DB, so it isn't owner-editable the way
categories/payment methods are (a deliberate P0-style decision, not yet
revisited).

`PricePoint` (schema unchanged since V1.6, just reinterpreted — see
"Investments" above for the per-type "price per unit" vs. "direct value"
distinction): `id`, `investmentId` (FK → `Investment`, `onDelete: Cascade` in
the schema — but see the "don't trust it alone" note under "Investments"
above), `date` (DateTime, local calendar semantics), `price` (Float),
`createdAt`. `@@unique([investmentId, date])` is the whole
append-only-history mechanism: one row per holding per day, and saving a value
for a day that already has one is a Prisma `upsert` on that compound key
(`updatePricePoint`/`savePrices` in `src/app/investments/actions.ts`), never a
second row for the same day.

`CouponPayment` (added V1.10): `id`, `investmentId` (FK → `Investment`,
`onDelete: Cascade` — same "don't trust it alone" caveat as `PricePoint`),
`date` (DateTime, local calendar semantics), `amount` (Float), `createdAt`.
No unique constraint on `(investmentId, date)` — unlike `PricePoint`, two
coupons legitimately can land on the same day is unlikely but not
impossible, and there's no "replace the day's value" semantic to enforce
here (each row is its own payment, not a point-in-time snapshot), so
`addCoupon` always inserts rather than upserting.

`ReferenceRates` (added V1.7): a **singleton** table — always exactly one row,
`id: "singleton"` — holding `cdi` / `selic` / `ipca` (Float, % a.a.) +
`updatedAt`. `getReferenceRates()` in `src/lib/data.ts` returns spec-matching
defaults (12.65/13.25/5.5) if the row doesn't exist yet. Was editable on
Settings via `updateReferenceRates()`; that action was removed in V1.9 along
with its UI (see "Investments" above) — the model and getter are unchanged,
there's just nothing left that writes to it, so it stays at whatever it was
last set to (or the defaults, if never touched). This app has never fetched
CDI/SELIC/IPCA from anywhere live.

`AppSettings` (added V1.15): another **singleton** (`id: "singleton"`) holding
the owner's app-wide preferences — `cycleStartDay` (Int, default 10, see V1.14/
V1.15) and, since V1.22, `accentColor` (String, default `"green"`) and, since V1.23, `language`
(String, default `"en"`). The accent
stores the palette *name*, not a hex, so a future tweak to a color's value
restyles the app instead of leaving a stale hex in the database; the values
live in `src/lib/theme.ts` + `globals.css`. Both fields are read through
clamping getters in `data.ts` (`getCycleStartDay`/`getAccentColor`/
`getLanguage`), so a bad stored value can't produce a broken range, an
unmatched `data-accent`, or an empty dictionary.

`PaymentMethod`: `id`, `name` (unique).

## File structure (actual)

```
FinanceHub/
├── CLAUDE.md
├── .claude/launch.json         # dev server config for `preview_start` tooling
├── package.json
├── prisma.config.ts             # loads DATABASE_URL for the Prisma CLI
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── financehub.db                # SQLite data file — gitignored, never commit
├── .env                          # DATABASE_URL=file:./financehub.db
├── src/
│   ├── app/
│   │   ├── layout.tsx            # root layout, renders <Nav>
│   │   ├── page.tsx               # Dashboard (force-dynamic)
│   │   ├── api/backup/route.ts    # GET — JSON export (Route Handler, not an action)
│   │   ├── entries/
│   │   │   ├── page.tsx           # fetches entries + categories + methods
│   │   │   ├── actions.ts         # createEntry/updateEntry/deleteEntry/deleteSeries
│   │   │   ├── EntriesClient.tsx  # owns edit-vs-add form state
│   │   │   ├── EntryForm.tsx      # add/edit form, useActionState, recurrence UI
│   │   │   └── EntryTable.tsx     # filterable table, delete/delete-series confirm
│   │   ├── settings/
│   │       ├── page.tsx           # fetches categories + budgets + methods (reference rates removed V1.9)
│   │       ├── actions.ts         # category/method/budget CRUD + import/reset
│   │       ├── CategoryManager.tsx
│   │       ├── PaymentMethodManager.tsx
│   │       ├── BudgetEditor.tsx
│   │       ├── BackupPanel.tsx    # export link + import form + reset-defaults
│   │       ├── CycleSettingsCard.tsx  # month start-day picker w/ live range preview (V1.15)
│   │       ├── AccentColorCard.tsx    # brand color picker (V1.22)
│       └── LanguageCard.tsx       # English / Português picker (V1.23)
│   │   └── investments/            # added V1.6, full BR tax model in V1.7, coupons + projection in V1.10
│   │       ├── page.tsx           # fetches investments + prices + coupons + reference rates
│   │       ├── actions.ts         # createHolding/updateHolding/deleteHolding/savePrices/updatePricePoint/deletePricePoint/addCoupon/updateCoupon/deleteCoupon
│   │       ├── InvestmentsClient.tsx  # owns modal state; exports the shared `Holding` type; renders ProjectionChart
│   │       ├── HoldingForm.tsx    # add/edit holding form, all sections conditional per investmentTypes.ts
│   │       ├── HoldingsTable.tsx  # holdings table; row actions View more / Add coupon / Edit / Delete (V1.19)
│   │       ├── UpdatePricesModal.tsx  # the batch "Update prices" form
│   │       ├── CouponSection.tsx  # V1.19 — coupon total/add-form/list, shared by HoldingDetail + the row's Add-coupon modal
│   │       ├── GoalProjectionCard.tsx # V1.16 — Meta & Projeção block (real return, progress, solvers)
│   │       ├── GoalForm.tsx       # V1.16 — goal modal + emergency-reserve preset
│   │       └── HoldingDetail.tsx  # sparkline + tax breakdown + editable/deletable price + coupon lists
│   ├── components/
│   │   ├── Nav.tsx                 # collapsible left sidebar nav (see Visual design system)
│   │   ├── LanguageProvider.tsx    # added V1.23 — language context + useT() for client components
│   │   ├── CategoryIcon.tsx        # <Icon name="..."/> — kebab-case name → lucide component
│   │   ├── Modal.tsx                # reusable popup dialog — portals to document.body (V1.18, see gotchas); solid white card, not the translucent CARD, since V1.9
│   │   ├── BudgetsCard.tsx         # Dashboard col 1: budget progress bars + insight
│   │   ├── RecentEntriesCard.tsx   # Dashboard col 1: last 5 entries
│   │   ├── SpendingByCategoryCard.tsx  # Dashboard col 2: owns month-picker state
│   │   ├── SpendingByCategoryChart.tsx # donut, used by the card above
│   │   ├── AllocationCard.tsx / AllocationChart.tsx  # Dashboard col 2: investments donut by type, added V1.6
│   │   ├── PaymentMethodsCard.tsx  # Dashboard col 3: teaser linking to Settings
│   │   ├── IncomeVsExpenseChart.tsx
│   │   ├── MonthlyTrendChart.tsx
│   │   ├── PortfolioValueChart.tsx # Dashboard col 3 "Monthly value" line, added V1.6, reused on Investments page since V1.11
│   │   ├── GoalProjectionChart.tsx # added V1.16 — band + goal line + crossing dot
│   │   └── ProjectionChart.tsx     # added V1.10 — Investments page: value at fixed future horizons
│   ├── generated/prisma/          # generated Prisma client — gitignored
│   └── lib/
│       ├── db.ts                  # PrismaClient singleton w/ driver adapter
│       ├── data.ts                # getCategories/getBudgets/getPaymentMethods/getReferenceRates/getCycleStartDay
│       ├── categories.ts          # DEFAULT_* seed lists (expense/income/payment method) + categoryColor()/categoryIconName()
│       ├── investmentTypes.ts     # added V1.7 — type/subtype taxonomy, IR/IOF tax tables, form-field visibility rules
│       ├── ui.ts                  # shared `CARD` className constant
│       ├── theme.ts               # added V1.22 — the five brand accent colors + clampAccentColor()
│       ├── i18n.ts                # added V1.23 — en/pt dictionaries, Dict type, clampLanguage()
│       ├── format.ts              # currency/date formatting + addMonthsClamped + formatShortDate + budget-cycle helpers (CYCLE_START_DAY, cycleKey/cycleRange/cycleLabel — see V1.14)
│       ├── aggregate.ts           # category/month/budget aggregation helpers
│       └── investments.ts         # added V1.6 — pure derived-math functions incl. coupons + projection (V1.10) + monthly value (V1.11/V1.12), see "Investments" above
```

## How to run

```bash
npm run dev
```
Then open `http://localhost:3000`. Data is stored in `financehub.db` in this
directory — back it up (e.g. copy the file, or use Settings → Export backup) if you
want a safety net, since there's no cloud sync. Node/npm are managed via `nvm`
(already installed on the owner's Mac; `~/.zshrc` loads it automatically in new
terminals).

There's also a packaged desktop app (a double-clickable `.app`/`.dmg`, no terminal
needed) — see "Desktop app (Electron)" below. It uses a **separate** database file
in the Mac's per-user app-data folder, not `financehub.db` in this directory, so the
two don't share data automatically (export/import via Settings moves data between
them).

## Desktop app (Electron)

FinanceHub can also run as a double-clickable Mac app, built on 2026-07-30 so the
owner isn't tied to running `npm run dev` in a terminal. The web app (`npm run dev`)
and the desktop app are two ways to run the *same* Next.js/Prisma code — no
application logic was forked or duplicated for this.

### How it works

- `electron/main.cjs` (Electron's main process) computes a per-user data path via
  Electron's `app.getPath("userData")` (e.g.
  `~/Library/Application Support/FinanceHub/financehub.db` on Mac — a different file
  from the dev `financehub.db` in the project folder), runs any un-applied
  migrations against it, then **forks the app's own already-built Next.js server as
  a child process** (`next.config.ts` has `output: "standalone"` for this) with
  `ELECTRON_RUN_AS_NODE=1` — a standard technique where Electron's own bundled
  Node.js runs a script as a plain Node process, so the app doesn't need a
  system-wide Node.js install to work. Once that child server responds, a
  `BrowserWindow` opens pointing at it (`http://127.0.0.1:4173`).
- Migrations run via a small hand-rolled runner (in `main.cjs`, ~30 lines) that
  applies each `prisma/migrations/*/migration.sql` file once, tracked in its own
  `_app_migrations` table — **not** the full Prisma CLI, which would mean bundling
  its engines/toolchain into the app just to run migrations on first launch.
- **Two separate builds of `better-sqlite3`** are required and must never be
  confused: the root `node_modules/better-sqlite3` (regular Node ABI, used by
  `npm run dev`/`next build`) and a second copy inside `.next/standalone/node_modules`
  (rebuilt for **Electron's** ABI — confirmed different from the host Node's ABI in
  this setup, e.g. 148 vs. 137; don't assume they match). `npm run electron:build`
  handles this correctly already — see "Rebuilding the native module" below before
  changing anything here.

### Startup error visibility

Added 2026-08-05 after the Windows friend's install opened to a blank
Electron "This page couldn't load" screen with zero actionable information —
a packaged GUI app has no visible console, so any startup failure used to be
completely silent to the end user. Two real bugs in `main.cjs` were making
this worse than it needed to be, found by deliberately reproducing a failure
locally (killed the wrong thing first and left a stray process holding port
4173 from an earlier test — that accidentally became the first real test
case and confirmed the fix works end-to-end):
1. `waitForServer()` resolved on **any** HTTP response, including a 500
   error page — so a genuinely broken server still looked "started," and the
   broken page got loaded into the window instead of the failure being
   caught. Fixed to require an actual 2xx/3xx status.
2. There was no handling at all for the forked server process exiting
   before ever responding — a hard crash (e.g. port already in use, a
   native module failing to load) would just sit there being silently
   retried by `waitForServer` for the full 15-second timeout, then fail with
   a generic message nobody would ever see anyway.

Now: every startup step (`main.cjs`'s `log()` helper) is appended to
`financehub.log` in the same per-user data folder as the database — so
there's always a persistent, inspectable record, not just whatever scrolled
past in a terminal that doesn't exist for a packaged app. And if startup
fails for any reason, the `BrowserWindow` loads a small self-contained error
page (a `data:` URL, no extra file needed) showing the actual error message
and the log file's path, instead of Electron/Chromium's generic unhelpful
network-error screen — so a non-technical user can just screenshot what's
actually wrong rather than reporting "nothing happens." Verified both paths
locally: a forced `EADDRINUSE` crash was caught immediately (not after a
15s hang) with a clear message in the log, and a clean run logged each step
through to "Server responded successfully."

**Timeout bumped 15s → 45s (2026-08-05)**, from a real fresh-Windows-install
log: the server logged "Ready" ~17s after being forked (antivirus scanning
newly-installed files, cold disk cache — genuinely slow, not stuck), but
`waitForServer`'s 15s timeout fired about 2 seconds before that, so a
perfectly healthy launch got reported as a failure. Doesn't slow down real
failures — a crashed process or port conflict still rejects immediately via
`serverExitPromise` regardless of this number; it only affects the case
where the server is actually still starting.

### Commands

```bash
npm run electron:build   # next build (standalone) + copy static assets + rebuild native module for Electron
npm run electron:start   # electron:build, then launch the Electron shell for local testing
npm run electron:dist    # electron:build, then package a distributable .dmg into /release
```
`npm run dev` is unaffected by any of this and keeps working exactly as before.

### Rebuilding the native module (the trickiest part — read before touching)

`scripts/rebuild-native-for-electron.js` (invoked by `electron:build`) does this,
in order, and **must keep doing all three steps** or one of the two runtimes breaks:
1. `electron-rebuild -f -w better-sqlite3` — rebuilds the **root** copy for
   Electron's ABI. (Confirmed this always finds a working prebuilt/rebuild path;
   the module has never needed a from-source compile in testing here.)
2. Copies that freshly-rebuilt root binary into **every** `better_sqlite3.node`
   found anywhere under `.next/standalone` (via a recursive `findBinaries()` walk
   that follows symlinks) — not just the one at
   `.next/standalone/node_modules/better-sqlite3/build/Release/`. See "A second
   binary location" below for why a single hardcoded path isn't enough.
3. `npm rebuild better-sqlite3` — rebuilds the **root** copy back to the regular
   Node ABI, so `npm run dev` keeps working.

This exists because `@electron/rebuild`'s own directory-scanner
(`electron-rebuild -m .next/standalone`) reports "No native modules found" against
the standalone output — it's a Next.js-generated pruned `node_modules` copy without
the dependency-graph metadata (`.package-lock.json` etc.) the scanner expects. Doing
the rebuild against the root copy (which the scanner handles fine) and copying the
binary over sidesteps that limitation. If a future `better-sqlite3`/`@electron/rebuild`
update fixes the scanner, this workaround could be simplified — but verify with the
same fresh-install-and-relaunch test described below before trusting a simpler version.

**A second binary location (found 2026-08-05, via a real user's broken Windows
install)**: Next's build doesn't leave just one copy of `better-sqlite3` under
`.next/standalone/node_modules` — for native "external" packages it also creates
a second, content-hashed copy at
`.next/standalone/.next/node_modules/better-sqlite3-<hash>/` (how Turbopack loads
native externals at runtime; the hash is deterministic — content/version-based,
not per-machine). On Mac this resolves correctly, because it's a real relative
symlink back to the first copy (`better-sqlite3-90e2652d1716b047 ->
../../node_modules/better-sqlite3`, confirmed by inspecting `.next/standalone/.next/node_modules/`
directly) — `fs.statSync` follows it, so both "locations" are really one file, and
the original single-path copy step happened to be enough. A friend's packaged
Windows build hit a real `NODE_MODULE_VERSION mismatch` — the app *started*
(server responded, so `waitForServer()` didn't catch it) but every Prisma query
threw `ERR_DLOPEN_FAILED` — the server responded HTTP 500 on every page — because
that second copy on
Windows was still the original plain-Node-ABI binary, untouched by the rebuild
script. Only surfaced because of the startup-error-logging work above (see
"Startup error visibility") — before that, this would've just been another
silent failure. Root cause wasn't fully pinned down (unclear whether Windows
produced a non-functional symlink/junction, or an independent copy instead of a
symlink at all) — rather than depend on symlink semantics matching across
platforms, the fix sidesteps the question entirely: `findBinaries()` recursively
finds every `better_sqlite3.node` under `.next/standalone` and overwrites all of
them, then verifies **each one** loads under Electron independently (not just the
root source binary) — the exact "verified one copy, trusted a second, unnoticed
one silently" gap that caused this. Confirmed locally on Mac: the script finds
both the real path and the symlinked path (2 locations), copies to both, and both
verify — same behavior whether the second path is truly a separate file or a
symlink resolving to the first. The genuinely decisive test is still only
possible on Windows (see "Verifying a change" below) — this fix is reasoned
through carefully and confirmed not to regress Mac, but the *next* Windows build
is what actually proves it.

**That "next Windows build" (same day) proved the fix above was not enough**:
the friend re-tested against a genuinely fresh install (confirmed via a new
`financehub.log` run with a new timestamp, not a resend of the old one) and
hit the exact same `NODE_MODULE_VERSION` mismatch at the exact same path
(`better-sqlite3-90e2652d1716b047`). So `rebuild-native-for-electron.js` was
correctly writing the right ABI bytes to every location under
`.next/standalone` *before* packaging — the bug was downstream of that, in
`scripts/after-pack.js`'s copy into the packaged app (see the "breaks every
directory-level symlink/junction" bullet under "Packaging quirks" below for
the actual fix — it took four more attempts after this one to get right).
This is the
lesson to remember here: verifying the *source* of a copy is correct proves
nothing about the *destination* once another copy step sits between them —
always verify what actually shipped, not what was true right before
packaging. `scripts/verify-packaged-native-module.js` (added same day, run
as a new CI step right after `electron-builder` in
`build-windows.yml`) closes exactly that gap going forward: it dlopens every
`better_sqlite3.node` found in the actual unpacked packaged output, under
the actual packaged Electron executable — so a future regression in the
copy step fails CI instead of only surfacing when a real user launches the
installed app.

**Never run `electron-builder install-app-deps` or a bare `electron-rebuild`
(no `-m`) directly** — either will rebuild the *root* copy for Electron's ABI and
leave it that way, silently breaking `npm run dev` with a
`NODE_MODULE_VERSION mismatch` error until you run `npm rebuild better-sqlite3`
again. If `npm run dev` ever throws that error, that's what happened; the fix is
always `npm rebuild better-sqlite3`.

**`electron-builder` itself also does this automatically during packaging** —
by default it runs its own native-module rebuild pass (targeting Electron's ABI)
on root `node_modules` as part of `electron-builder --mac`, silently undoing step
3 above *after* `scripts/rebuild-native-for-electron.js` already restored it. This
was the single most confusing bug in this whole area: the build would "succeed,"
`npm run dev` would work immediately after `electron:build`, and then break again
after the *packaging* step specifically — timing made it look intermittent. Fixed
two ways, both present and both worth keeping: `"npmRebuild": false` in
`package.json`'s `"build"` config tells electron-builder not to do this at all, and
`electron:dist` also runs `npm rebuild better-sqlite3` as its own last step
regardless, as a defense-in-depth backstop if that config option ever stops working
across an electron-builder update. If `npm run dev` breaks specifically after
`npm run electron:dist` (but was fine right after `electron:build`), suspect this
exact interaction first.

Because exit codes and log output from `electron-rebuild`/`electron-builder` proved
unreliable indicators of which ABI a binary actually ended up with (a "Rebuild
Complete" message doesn't guarantee the file changed), `rebuild-native-for-electron.js`
doesn't trust them — it actually `require()`s the binary under the relevant runtime
(via `electron -e "..."` with `ELECTRON_RUN_AS_NODE=1`, and via plain `node -e`) after
each step and fails loudly if that fails, rather than silently shipping a broken
binary. Keep that verification if you ever rewrite this script.

### Packaging quirks (electron-builder — also non-obvious)

`package.json`'s `"build"` key configures `electron-builder`. Two things here exist
for reasons that took real trial and error to find, in case they need touching:

- **`"files"` includes `"!node_modules/**/*"`** to stop electron-builder from
  bundling the *entire root* `node_modules` (Next.js, React, Prisma, all of
  it — everything the standalone build already vendors its own copy of) into
  `app.asar`. Without this, `app.asar` was **487 MB** for a build that should be a
  few KB (the main process is just `electron/main.cjs`, using only Node built-ins).
  `electron-builder` does this by inspecting the root `package.json`'s
  `"dependencies"` regardless of what directory you scope packaging to — moving the
  app source to a sub-directory with its own dependency-free `package.json`
  (tried first) didn't stop it; only the explicit negation pattern did.
- **The standalone build and migrations are copied into the packaged app via an
  `"afterPack"` hook (`scripts/after-pack.js`), not `"extraResources"`.**
  `extraResources` seemed to special-case any folder literally named
  `node_modules` — even with an explicit per-entry `"filter": ["**/*"]`, the
  `standalone/node_modules` folder (containing the Electron-ABI `better-sqlite3`
  built above) came out empty in the packaged app, breaking it at launch with
  `Cannot find module '.../standalone/node_modules/better-sqlite3'`. The
  `afterPack` hook does a plain recursive `fs.cpSync` after `electron-builder`
  finishes its own packaging, which isn't subject to that filtering at all.
- **`afterPack` breaks every directory-level symlink/junction under the
  copied `standalone` output, then force-writes a known-good binary into
  every discovered native module location — do not remove either step.**
  It's the fix for the single nastiest bug in this whole feature, worth
  understanding in full, including five earlier fixes that each turned out to
  be incomplete: Next's own build creates internal symlinks inside
  `.next/standalone/.next/node_modules/` (e.g.
  `better-sqlite3-<hash> -> ../../node_modules/better-sqlite3`, how Turbopack's
  output loads native "external" packages at runtime).
  1. Node's `fs.cpSync`, by default (no symlink option), resolves a *relative*
     symlink's target to an *absolute* path before recreating it at the
     destination. So the packaged app's copy of that symlink silently pointed
     back at **this exact build machine's project folder**
     (`/Users/.../FinanceHub/.next/standalone/node_modules/better-sqlite3`)
     instead of its own bundled copy sitting right next to it. This is
     exactly the kind of bug that "works on the machine that built it"
     forever and only breaks for an actual end user: every test run on this
     dev machine appeared to succeed or fail seemingly at random, because it
     depended on whatever ABI state the *original* project's
     `.next/standalone` happened to be in at that moment (a side effect of
     the dual-ABI juggling above), not on what was actually bundled in the
     `.dmg`. Caught it by deliberately moving this project's own
     `.next/standalone` out of the way and relaunching the packaged `.app` —
     see the isolation test below, which is the only way this class of bug
     reliably shows itself.
  2. `verbatimSymlinks: true` (the direct fix for #1) preserves the symlink
     as a relative link instead of resolving it to an absolute path — correct
     and sufficient on Mac, where it's a real, working relative symlink. But
     a friend's Windows build kept shipping a stale, wrong-ABI
     `better_sqlite3.node` at exactly this path even after the "second binary
     location" fix above confirmed every source binary was correct *before*
     packaging (see that section for the full story) — which only makes
     sense if the symlink itself didn't survive the Windows copy step
     intact. Windows symlink/junction creation is privilege-gated and known
     to behave inconsistently in ways a plain file copy never has to worry
     about, so root-caused or not, it's not worth depending on. Also added
     `scripts/verify-packaged-native-module.js` as a new CI step
     (`build-windows.yml`, right after `electron-builder`) that dlopens every
     native binary in the *actual packaged output* under the *actual packaged
     Electron executable* — the check that would have caught this the first
     time, since the pre-packaging verification in
     `rebuild-native-for-electron.js` structurally cannot see bugs introduced
     by a later copy step. This CI step is what proved fix #3 below was
     *also* still broken, rather than needing another friend to test it.
  3. `dereference: true` (the direct fix for #2 — copies the symlink's target
     content instead of the link, so there's supposedly no link left to get
     wrong) turned out to be *insufficient* on its own. The new CI
     verification step from #2 still caught a broken binary, with the dlopen
     error reporting the module's real identity as the CI checkout's root
     `node_modules` path (`D:\a\financehub\financehub\node_modules\...`,
     not anything under the packaged `resources\standalone\...` at all) —
     meaning `fs.cpSync`'s `dereference` option didn't fully collapse this
     specific nested symlinked-directory case on Windows (Node has known
     rough edges around symlinks-within-symlinked-directories). This is the
     clearest example yet of the lesson from fix #2: confirming the *source*
     of a copy is correct proves nothing about the *destination*, and now
     neither does trusting a specific `fs.cpSync` option to fully resolve an
     unknown depth of symlink chaining either.
  4. A general `resolveSymlinksInPlace()` walk — replace every symlink found
     via `Dirent.isSymbolicLink()` (from `fs.readdirSync(...,
     { withFileTypes: true })`) with a real copy of whatever
     `fs.realpathSync` resolves it to — got further: the CI dlopen error
     stopped pointing outside the package entirely (progress — the entry was
     now a genuinely independent file, not a link). But it *still* shipped
     wrong-ABI bytes. Root cause, finally nailed down:
     `Dirent.isSymbolicLink()` from the fast-path `readdirSync` is not
     reliable for Windows junctions (a known libuv/Windows rough edge — it
     can misreport a junction as a plain directory, where a real
     `fs.lstatSync` call would correctly identify it as a link). Whatever
     Node's own module loader *did* end up resolving through at require()
     time, by the point `after-pack.js` runs — inside the `electron-builder`
     step, which only starts after `electron:build`, and therefore after
     `rebuild-native-for-electron.js`'s own *last* step (which deliberately
     resets the **root** `node_modules/better-sqlite3` back to plain Node ABI
     so `npm run dev` keeps working) has already finished — it resolved to
     that now-stale root copy, not the still-correct `.next/standalone` copy.
  5. Force-writing the known-good bytes straight into the leaf `.node` file —
     no symlink detection, no dereferencing, just delete-and-recreate that one
     file — still failed, with the *exact same* "resolved to the CI
     checkout's root `node_modules`" error as fix #3. The actual junction
     turned out to be the **directory** (`better-sqlite3-<hash>`), not the
     file inside it. Windows transparently redirects *every* file operation
     that passes through a junctioned path component — reads, writes,
     deletes, all of it, at the OS/filesystem-driver level, regardless of
     which tool performs them. So "deleting and recreating" the leaf file was
     actually deleting and recreating a file inside the junction's *target*
     (the CI checkout's root `node_modules`) — never a genuinely separate
     file under the packaged output at all. And that root copy gets reset
     back to plain Node ABI by the workflow's own final safety-net step
     (`npm rebuild better-sqlite3`, which runs *after* `electron-builder` —
     and therefore after `afterPack` — as part of the same
     `electron:dist:win` command, specifically so `npm run dev` keeps
     working), which is exactly why the same wrong-ABI failure kept
     reappearing no matter how the leaf file was "fixed": there was never a
     real, independent packaged file to fix in the first place.
  6. The actual fix: `breakJunctionsInPlace()` (in `scripts/after-pack.js`)
     walks the packaged output using `fs.lstatSync` directly — not
     `fs.readdirSync(..., { withFileTypes: true })`'s Dirent info, the exact
     detection gap that made fix #4 miss this — to authoritatively detect
     *directory-level* reparse points too, not just file-level ones. For each
     one found, it reads/copies the junction's current target content,
     deletes the junction entry itself (removing only the link, per Node's
     documented `fs.rm` behavior and Windows' own `RemoveDirectory`/
     `DeleteFile` semantics for junctions), and recreates a real, independent
     directory in its place — so nothing under the packaged `standalone`
     folder shares storage with root `node_modules` anymore, and the later
     ABI-reset step can't reach it. The force-write-known-good-bytes pass
     from fix #5 then runs on top of that as defense in depth, now actually
     landing on independent files, and a final walk-up-the-path assertion
     throws loudly if any reparse point somehow survives, instead of silently
     shipping a broken build a sixth time. If
     `scripts/verify-packaged-native-module.js` ever fails again, this is the
     exact spot to revisit — it's what caught #2, #3, #4, and #5 before this
     fix.
- No code-signing identity is configured (the owner doesn't have an Apple
  Developer ID). The built `.dmg` is unsigned — macOS Gatekeeper will show an
  "unidentified developer" warning on first open; right-click → Open (or System
  Settings → Privacy & Security → Open Anyway) gets past it once. This is a
  one-time nuisance for personal use; only worth fixing with a real Developer ID
  if the owner starts distributing this to other people.

### Verifying a change to any of this

Because this whole area is native-module/packaging plumbing that fails in ways
that don't show up in `npm run build` or `npm run lint`, verify with the actual
sequence, not just a clean build:
1. `npm run electron:build`, then confirm `npm run dev` still works (this is the
   thing most likely to silently break — see "Rebuilding the native module" above).
2. Delete `~/Library/Application Support/FinanceHub` (simulates a fresh install),
   run `./node_modules/.bin/electron .` from the project root, and confirm the
   dashboard's empty state loads with no errors in the terminal.
3. Insert a row directly into that fresh `financehub.db` (via a one-off
   `better-sqlite3` script, same technique as any other DB-check in this project)
   and relaunch to confirm the data persists and the app reads it back.
4. Only then run `npm run electron:dist`, and **check `npm run dev` again
   afterward** — not just right after `electron:build`. The `npmRebuild`/root-ABI
   bug above only manifested after the full packaging step, not after
   `electron:build` alone, which is exactly what made it confusing to track down.
5. Repeat steps 2–3 against the actual packaged `.app` in `/release/mac-arm64/`
   (launch `Contents/MacOS/FinanceHub` directly to see its console output, not
   just double-clicking the `.app`) — packaging (asar/afterPack) has broken things
   that worked fine in the unpackaged `electron .` shell before.
6. **The decisive test, required after touching `after-pack.js` or anything
   about how the standalone build gets copied**: `mv .next/standalone
   /tmp/some-other-name`, then relaunch the packaged `.app` from step 5 again.
   If it still works with this project's own `.next/standalone` completely
   absent, the packaged app is genuinely self-contained. If it breaks, some copy
   step is still leaking an absolute path back to this build machine — see the
   `verbatimSymlinks` bullet above, which is exactly this failure mode. Move
   `.next/standalone` back afterward (`mv /tmp/some-other-name .next/standalone`).
   Skipping this step means a bug that "works every time" for you can still ship
   completely broken to an actual end user, since it depends on state that only
   exists on the machine that built it.

### Windows build

Added 2026-07-31, from the owner wanting to send a Windows-friend a real
`.exe` instead of "clone the repo and run npm run dev." Deliberately built
via **GitHub Actions on a real `windows-latest` runner**
(`.github/workflows/build-windows.yml`, manual `workflow_dispatch` trigger —
not run on every push, since it's a distributable build, not a CI check),
not cross-compiled from this Mac — the native `better-sqlite3` module has to
be compiled for the target OS, and there was no way to verify a
cross-compiled Windows binary actually works without a Windows machine to
test it on. The workflow: checkout → `npm ci` → `npx prisma generate` →
`npm run electron:dist:win` (mirrors the existing `electron:dist` script,
just `electron-builder --win` instead of `--mac`) → uploads the resulting
`.exe` as a build artifact. Download it from the workflow run's Summary page
under "Artifacts" once it finishes.

Auditing the existing (mac-only-until-now) packaging scripts for
Windows-safety found `electron/main.cjs` and
`scripts/rebuild-native-for-electron.js`'s core rebuild logic already fully
cross-platform (everything goes through `path.join`/`fs`/Electron's own
`process.resourcesPath` and `app.getPath()`, which resolve correctly per
OS) — but two real platform-specific bugs needed fixing before a Windows
build could work at all:
1. **`scripts/after-pack.js`** hardcoded the macOS `<AppName>.app/Contents/
   Resources` bundle layout to find where to copy the standalone build and
   migrations. Windows (and Linux) use a flat `resources/` folder directly
   under `appOutDir` instead — there's no `.app` bundle. Fixed by branching
   on `context.electronPlatformName` (`"darwin"` vs. everything else),
   electron-builder's own way of telling `afterPack` which platform it's
   packaging for.
2. **`scripts/rebuild-native-for-electron.js`** located the Electron binary
   via a hardcoded `node_modules/.bin/electron` path, to verify a rebuilt
   `better-sqlite3` binary actually loads under Electron's runtime. That
   works on Mac (the bin shim there is directly executable), but on Windows
   `node_modules/.bin/electron` is a `.cmd` shim, not something
   `execFileSync` can run directly at that exact path. Fixed by using
   `require("electron")` instead — the `electron` npm package's whole
   purpose is exporting the correct platform binary path as a string
   (`electron.exe` on Windows, `.../Electron.app/Contents/MacOS/Electron` on
   Mac) for exactly this kind of script; confirmed it still resolves
   correctly on this Mac after the change.

**First real run (2026-08-05) failed, and the fix is a good lesson for this
whole area**: `next build` failed prerendering `/_not-found` with `The table
main.Entry does not exist in the current database` — nothing to do with
Windows or native modules at all, both guesses in the paragraph above this
one were wrong. Root cause: `/_not-found` is an implicit static page that
still renders the root layout (it wraps every route), and `layout.tsx`
queries `prisma.entry.findMany()` for the sidebar's current-month IN/OUT
summary — so *every* `next build`, including this one, needs a real,
migrated database on disk, not just a generated Prisma client. The workflow
ran `prisma generate` (creates client code) but never `prisma migrate
deploy` (creates the actual tables), so the SQLite file existed with zero
tables. Fixed by adding a "Set up the database" step running `prisma migrate
deploy` before the build step. Reproduced and confirmed the fix locally
first (temporarily pointed `DATABASE_URL` at a scratch file, ran `prisma
generate` alone → same "table does not exist" crash; then `prisma migrate
deploy` first → clean build) before pushing, rather than guessing again from
a CI log alone. Worth remembering: this same requirement silently applies to
`npm run electron:build`/`electron:dist` on Mac too — it only ever "worked"
locally because the developer's own `financehub.db` already had every
migration applied from normal day-to-day use; a genuinely fresh Mac clone
would hit the identical crash if someone ran `electron:build` before
`prisma migrate deploy`. Not fixed there since the local dev flow always
happens to have a migrated DB already, but keep this in mind if that ever
stops being true (e.g. a docs rewrite that reorders the setup steps).

**Second run, same day, got past the database fix and actually built the
`.exe`** — packaging itself succeeded (`building target=nsis ... file=release\FinanceHub Setup 0.1.0.exe`),
but the job still failed at the very last step: `GitHub Personal Access
Token is not set, neither programmatically, nor using env "GH_TOKEN"`.
Cause: electron-builder auto-detects a CI environment (GitHub Actions sets
`CI=true`) and defaults to trying to *publish* the build to GitHub Releases
unless told not to — completely separate from `actions/upload-artifact`,
which the workflow already uses to hand back the `.exe` and doesn't need any
token. Fixed by adding `--publish never` to both `electron:dist` and
`electron:dist:win` in `package.json`, making the "don't auto-publish"
behavior explicit rather than relying on electron-builder's implicit
CI-detection (which its own log output says is being removed in v27 anyway).
Added to the mac script too even though it isn't run in CI today, so the
behavior doesn't silently change if that ever stops being true.

No code signing is configured for Windows either (same as mac) — the `.exe`
will trigger a Windows SmartScreen "unrecognized app" warning on first run;
"More info" → "Run anyway" gets past it, same one-time-nuisance tradeoff as
the mac Gatekeeper
warning.

### File structure additions

```
FinanceHub/
├── .github/workflows/
│   └── build-windows.yml       # manual CI build of the Windows .exe — see "Windows build" above
├── electron/
│   ├── main.cjs                # Electron main process: migrations, forks the server, opens the window
│   └── package.json            # minimal, dependency-free — see "Packaging quirks" above
├── scripts/
│   ├── lib/find-native-binaries.js # shared findBinaries() walk, used by rebuild-native-for-electron.js + after-pack.js
│   ├── prepare-electron.js         # copies public/ + .next/static/ into .next/standalone/ after `next build`
│   ├── rebuild-native-for-electron.js  # the dual-ABI better-sqlite3 dance — see above
│   ├── after-pack.js               # electron-builder afterPack hook — copies standalone build + migrations, force-writes native binary
│   └── verify-packaged-native-module.js  # CI-only: dlopens the actual packaged binary — see "Packaging quirks" above
└── release/                    # electron-builder output (.dmg, unpacked .app) — gitignored, rebuild anytime
```

## Notes for future sessions

- This is a single-user, local-only app by design. Don't add auth, multi-user
  support, or cloud sync unless the owner explicitly asks. Investments (V1.6,
  rearchitected in V1.7) was built the same way on purpose — no price-feed API,
  no network calls anywhere in that flow, CDI/SELIC/IPCA reference rates are
  hand-maintained too — don't wire any of that up without the owner asking (P2
  leaves room for an *opt-in* live price fetch later; see the `ticker` +
  manual-refresh idea in the Investments section above, not an always-on
  background fetch).
- Keep the dependency list small — every added library is something the owner
  has to reason about later.
- No git repo has been initialized in this project as of this writing.
- If the owner pastes another reference file/app or spec for inspiration again,
  check with them on scope (full port vs. subset, full replace vs. additive
  extension, which non-goals if any should flip) before building — that's
  happened twice now (the V1.2 visual redesign reference and the V1.6→V1.7
  investments spec) and confirming scope up front both times is what kept the
  work aligned with what they actually wanted instead of over- or under-building.
- The IR/IOF figures anywhere in the Investments UI are an **estimate for
  personal reference, not tax filing guidance** — come-cotas isn't modeled,
  brokerage statements may differ. Keep that framing if you touch the tax
  display; don't let wording changes make it read as authoritative.
- If the owner asks for real historical portfolio value (accounting for
  quantity changes over time, not just price/rate changes) or per-lot cost
  basis, that's the P2 buy/sell transaction log described in the Investments
  section — a real data-model change (a `Transaction` model, `quantity` derived
  instead of stored), not a tweak, so scope it as its own piece of work rather
  than patching the current `Investment.quantity` field. Note this is a
  narrower gap than it was in V1.6: `monthlyPortfolioValue()`/`monthlyValue()`
  run actual accrual/manual-price logic per historical date via
  `valueAtDate()`, it just can't know what `quantity` *was* on a past date,
  only what it is now.
