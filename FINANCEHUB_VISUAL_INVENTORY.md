# FinanceHub: visual inventory for a redesign

Everything the interface currently shows: every page, card, modal, form, state and piece of copy, plus the design tokens behind them. Taken directly from the source code on **16 Sep 2026** (branch `feat/disable-license-gate`).

Use it as a brief. Sections 1–3 are the shared system, sections 4–8 walk through the screens, and sections 9–13 cover everything that cuts across screens, including a list of visual inconsistencies worth fixing in the rework.

> Sizes are CSS pixels. "Mono" means DM Mono; everything else is Plus Jakarta Sans. Color names in `--this-form` are CSS variables in `src/app/globals.css`.

---

## Contents

1. [What must survive a redesign](#1-what-must-survive-a-redesign)
2. [App shell](#2-app-shell)
3. [Current design system](#3-current-design-system)
4. [Dashboard](#4-dashboard-)
5. [Entries](#5-entries-entries)
6. [Investments](#6-investments-investments)
7. [Settings](#7-settings-settings)
8. [Dormant screens (licensing)](#8-dormant-screens-licensing)
9. [Every modal and dialog](#9-every-modal-and-dialog)
10. [Every chart](#10-every-chart)
11. [Icons](#11-icons)
12. [States checklist](#12-states-checklist)
13. [Inconsistencies and redesign opportunities](#13-inconsistencies-and-redesign-opportunities)
14. [Appendix: all UI copy (English)](#14-appendix-all-ui-copy-english)

---

## 1. What must survive a redesign

These are functional or meaning-carrying rules, not styling choices. A new look can change anything else.

| Rule | Why |
|---|---|
| **Green = money in / gain, red = money out / loss**, independent of the brand color | The brand color is user-selectable (5 options). If the brand were blue and "positive" followed it, blue-vs-red stops reading as good-vs-bad. Two separate color families exist for this reason. |
| **Five brand accents must all work**: Green (default), Blue, Violet, Teal, Amber | Chosen in Settings. Every brand-colored element has to look right in all five. |
| **Light and dark themes** | Dark follows the OS setting (`prefers-color-scheme`). There's no in-app toggle yet. |
| **Two languages: English and Português** | Portuguese strings run longer. Dates switch format (`Jun 15, 2027` vs `15/06/2027`). Currency is always `R$ 1.234,56` in both. |
| **Numbers are the content** | Currency, percentages and dates are almost everywhere. They currently use the mono font; tabular alignment matters in tables. |
| **Small text must stay ≥ 4.5:1 contrast** | Audited twice (V1.17, V1.27). Brand/positive/red each have a darker `-text` variant for small text. |
| **Hit targets ≥ 24px** | Row actions (Edit / Delete / Series / View more) were raised to 24px in an audit. |
| **Works down to 375px wide** | Tested at 1440, 1280, 768 and 375. |
| **Modals open from inside glass cards** | Modals portal to `document.body`; a `backdrop-filter` ancestor would otherwise trap them inside the card. Keep this if cards stay blurred. |
| **"Estimate, not advice" framing** | Tax figures, projections and goal math all carry disclaimers. A redesign must not make them look more authoritative. |
| **The owner's own data is never translated** | Category names, payment methods, entry/holding names and the goal name show exactly as typed. |

---

## 2. App shell

Every page renders inside the same frame (`src/app/layout.tsx`).

```
┌──────────────────────────────────────────────────────────────┐
│ ambient color blobs (fixed, behind everything)               │
│ ┌──────────┬────────────────────────────────────────────────┐│
│ │ SIDEBAR  │  MAIN (scrolls)                                ││
│ │ 240px    │  centered container, max 1400px                ││
│ │ or 72px  │  padding 24px (32px from sm)                   ││
│ │          │                                                ││
│ └──────────┴────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
          whole frame max-width 1600px, full viewport height
```

### Ambient background
Three large, heavily blurred radial-gradient circles sit behind everything (`pointer-events: none`):

| Position | Size | Color |
|---|---|---|
| Top-left, bleeding off-screen | 55vw circle, blur 60px | Brand color at 12% (follows the accent) |
| Bottom-right | 45vw, blur 60px | Blue `rgba(59,130,246,0.09)` |
| Upper-right-center | 28vw, blur 50px | Purple `rgba(168,85,247,0.07)` |

Page ground: `#EEF1F7` light / `#0D1117` dark.

### Sidebar (`src/components/Nav.tsx`)
Glass panel: `--color-nav` (white 65% / dark 75%), `backdrop-blur-2xl`, 1px right border. Width animates 300ms between states.

**Expanded (240px):**
1. **Logo row.** 36×36 rounded-12 tile with the brand gradient, a white `ChartPie` icon and a brand-colored glow. Next to it, the wordmark **"financehub"** (lowercase, 17px extrabold). Clicking the logo tile collapses the sidebar; there is no separate toggle button.
2. **Nav links** (13.5px, 10px/12px padding, radius 12, icon 17px):
   - Dashboard (`LayoutDashboard`)
   - Entries (`ListOrdered`)
   - Investments (`TrendingUp`)
   - Settings (`Settings`)
   - *Active:* brand-tint background, brand text color, weight 600, icon stroke 2.3.
   - *Inactive:* transparent, grey (`--color-muted-2`), weight 500, icon stroke 1.8.
3. **Current-month summary** (pinned to the bottom): a small inset box.
   - `CURRENT MONTH` (mono, 10.5px, uppercase)
   - Month label, e.g. **Aug 2026** (14px semibold)
   - Two columns split by a 1px divider: `IN` + green amount, `OUT` + red amount (12px semibold).

**Collapsed (72px):** logo tile only, icon-only links centered (label shown as a tooltip), and the summary shrinks to a single 8px brand-colored dot whose tooltip reads `Aug 2026 — Net R$ X`.

**Behavior:** starts collapsed on viewports under 768px. There is no mobile drawer or bottom bar; the collapsed rail is the mobile layout.

### Main container
`max-w-[1400px]`, centered, padding 24px (32px at `sm`). The `<main>` element scrolls; the sidebar doesn't.

---

## 3. Current design system

### 3.1 Typography

| Role | Font | Loaded weights |
|---|---|---|
| Headings, UI, body | **Plus Jakarta Sans** (`--font-jakarta`) | 400, 500, 600, 700, 800 |
| Numbers, dates, uppercase labels, chart axes | **DM Mono** (`--font-dm-mono`) | 400, 500 |

**Sizes actually in use** (there is no formal scale; see §13):

| Use | Size / weight |
|---|---|
| Page title (Entries, Investments, Settings) | 28px → 34px at `sm`, extrabold, tight tracking |
| Dashboard title "Welcome back" | 20px bold *(different from other pages)* |
| Dashboard empty-state title | 24px extrabold |
| Card title | 17px extrabold (dashboard & investments) **or** 16px extrabold (settings) |
| Stat pill value | 24px extrabold, leading 1 |
| Modal title | 16px bold |
| Section label (Settings) | Mono 11px bold, 0.12em tracking, uppercase |
| Stat/field label | Mono 10.5px, 0.1em tracking, uppercase |
| Form field label | 11px bold, uppercase, wide tracking **or** 12.5px semibold sentence case (goal & license forms) |
| Body / list primary | 13–13.5px, semibold–bold |
| Secondary / blurbs | 12.5px |
| Footnotes | 11–11.5px |
| Table header | Mono 10.5px uppercase, 0.1em tracking |
| Table/list amounts | Mono 12.5–14px medium |
| Badges | Mono 9.5px uppercase |

### 3.2 Color tokens

**Surfaces and text**

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--background` | `#EEF1F7` | `#0D1117` | Page ground |
| `--color-ink` / `--foreground` | `#111827` | `#E6EDF5` | Primary text |
| `--color-muted` | `#5B6472` | `#9AA6B6` | Secondary text, blurbs |
| `--color-muted-2` | `#6B7280` | `#7F8B9C` | Tertiary text, labels, chart ticks |
| `--color-card` | white 70% | white 5.5% | Glass card fill |
| `--color-panel` | black 4.5% | white 5% | Input fill, subtle buttons |
| `--color-inset` | black 4.5% | white 6% | Chips, stat boxes, pills |
| `--color-inset-2` | black 3.5% | white 4.5% | Very subtle wells |
| `--color-track` | black 8% | white 13% | Progress tracks, grid lines, hover fill |
| `--color-border` | black 8% | white 11% | Hairlines |
| `--color-surface-raised` | `#FFFFFF` | `#1B2430` | Focused input, small inline fields |
| `--color-modal` | `#FFFFFF` | `#161D27` | Modal card (solid, not glass) |
| `--color-nav` | white 65% | `#161D27` 75% | Sidebar |
| `--color-tooltip-bg` | white 96% | `#161D27` 97% | Chart tooltips |

**Money semantics (fixed, never follows the brand)**

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-positive` | `#0C9E57` | `#34D98B` | Income bars, under-budget fills, gain |
| `--color-positive-text` | `#07713E` | `#4CE39B` | Small green text |
| `--color-positive-light` | `#10B96A` | `#4CE39B` | Gradient end (goal reached) |
| `--color-positive-tint` | green 12% | green 16% | Green backgrounds |
| `--color-positive-glow` | green 33% | green 40% | Progress bar glow |
| `--color-rust` | `#DC3545` | `#F4707D` | Expense bars, over-budget fills *(it's red despite the name)* |
| `--color-rust-text` | `#C92A3A` | `#F4707D` | Small red text, errors |
| `--color-rust-tint` | red 8% | red 16% | Red backgrounds |
| `--color-rust-glow` | red 33% | red 40% | Over-budget bar glow |

**Brand (user-selectable)**

| Accent | `--color-brand` light | `--color-brand-deep` light | brand dark | brand-text dark |
|---|---|---|---|---|
| Green (default) | `#0C9E57` | `#0A7A43` | `#22C77E` | `#4CE39B` |
| Blue | `#2563EB` | `#1D4ED8` | `#60A5FA` | `#93C5FD` |
| Violet | `#7C3AED` | `#5B21B6` | `#A78BFA` | `#C4B5FD` |
| Teal | `#0D9488` | `#0F766E` | `#2DD4BF` | `#5EEAD4` |
| Amber | `#B45309` | `#92400E` | `#FBBF24` | `#FCD34D` |

Derived from whichever accent is active:
- `--color-brand-text`: brand-deep in light, the lighter step in dark
- `--color-brand-tint`: brand at 10%
- `--gradient-brand`: 135° from brand → brand-deep (**every primary button**)
- `--shadow-brand`: `0 4px 16px` brand 28%
- `--shadow-brand-logo`: `0 8px 18px -8px` brand 60%
- `--shadow-brand-panel`: `0 16px 34px -20px` brand 70%

**Fixed identity palettes (not themed)**

*Category colors* (`src/lib/categories.ts`). Known names get a fixed color; anything else is hashed into the palette:

| Category | Color | Category | Color |
|---|---|---|---|
| Rent | `#3B82F6` | Health | `#DC3545` |
| Groceries | `#F59E0B` | Salary | `#0C9E57` |
| Shopping | `#EC4899` | Freelance | `#10B96A` |
| Dining Out | `#F97316` | Investment | `#3B82F6` |
| Utilities | `#14B8A6` | Gift | `#F97316` |
| Transport | `#0EA5E9` | Other | `#9CA3AF` |
| Entertainment | `#A855F7` | | |

Hash palette: `#0C9E57 #10B96A #3B82F6 #F59E0B #A855F7 #F97316 #14B8A6 #EC4899 #0EA5E9 #9CA3AF`

*Investment type colors* (`src/lib/investmentTypes.ts`), muted/earthy:

| Type | Color | Icon |
|---|---|---|
| Fixed income (renda-fixa) | `#2E7D50` | `Landmark` |
| Fund | `#3D6B9E` | `Layers` |
| Stock / ETF | `#8C2D3F` | `TrendingUp` |
| Crypto | `#A87B3A` | `Bitcoin` |
| Other | `#7A6855` | `Package` |

*Payment method tiles* (dashboard): `#0C9E57 #3B82F6 #A855F7 #F59E0B`, by position.

*Projection / "value" steel blue* (hardcoded): `#3D6B9E`, hover dot `#5A8BC4`. Used by the Projection chart, per-holding monthly chart, goal band/line and goal progress bar.

### 3.3 Shape, depth, spacing

| Thing | Value |
|---|---|
| **Card** (`CARD` in `src/lib/ui.ts`) | `--color-card` fill + `backdrop-blur-xl` + 1px black 7% border + **radius 22px** + `--shadow-card` |
| `--shadow-card` light | `0 2px 24px -4px rgba(17,24,39,.10)`, `inset 0 1px 0 rgba(255,255,255,.6)` |
| `--shadow-card` dark | `0 2px 24px -4px rgba(0,0,0,.55)`, `inset 0 1px 0 rgba(255,255,255,.05)` |
| Card padding | 18px, 20px or 22px depending on the card |
| Radii in use | 22 (cards, modal), 18 (matured banner), 16 (method tiles), 14 (insight box), 12 (buttons, inputs, nav links, stat boxes), 10–11 (small inputs, icon tiles), 9 (small square buttons), full (pills, chips, toggles) |
| Grid gaps | 20px between cards, 12px between stat pills, 24px between page sections, 36px between Settings sections |

### 3.4 Buttons

| Variant | Look | Where |
|---|---|---|
| **Primary** | Brand gradient, white 13.5px semibold, radius 12, 10px×20px (or 12px×20px), brand shadow, hover brightness 105%, press scale 95%, disabled 50% | Add entry, Add holding, Save…, Import N entries, Set a goal |
| **Primary pill** | Same gradient, fully rounded | "Add" next to category/method inputs, empty-state CTA |
| **Primary small** | Gradient, radius 8, 12.5px | Add coupon (inside the coupon form) |
| **Secondary glass** | Card fill + blur, black 8% border, ink text, radius 12 | Update prices |
| **Subtle** | `--color-panel` fill, ink text, radius 12 | Edit goal / Set a goal (in the card header) |
| **Text/ghost** | No fill, 12–13px semibold grey, hover ink (or red for delete, brand for coupon) | Cancel, row Edit / Delete / Series / View more / Add coupon |
| **Icon square** | 28×28, radius 9, panel fill | "+" on the Budgets card |
| **White on gradient** | White fill with brand text / translucent white with white text / outline | Backup panel only |

### 3.5 Form fields
**Three different input styles** exist today (see §13):

| Style | Look | Used in |
|---|---|---|
| **A: bordered** | Panel fill, 1px border, radius 12, 10px×14px, 14px text; focus → ink border + raised white fill | Entry form, Holding form, Update prices date |
| **B: soft** | Inset fill, no border, radius 10, 10px×13px, 13.5px; focus → 2px brand ring at 30% | Goal form, License form |
| **C: pill** | Inset fill, fully rounded, 10px×16px, 13px; focus → raised fill + 1px ink ring | New category, New payment method, Entries search |
| **Inline mini** | Raised fill, 1px border, radius 8, right-aligned mono | Price/coupon edit in lists, Update prices amounts |
| **Pill-with-affix** | Inset pill wrapping a borderless mono number + `R$` prefix or "of the month" suffix | Budget limits, Month start day |

Selects use native `<select>`, restyled with `appearance-none` and a `ChevronDown` icon where shown in toolbars.

**Label styles:** A/C forms use 11px bold uppercase grey above the field. B forms use 12.5px semibold ink in sentence case.

### 3.6 Recurring small components

| Component | Look |
|---|---|
| **Stat pill** | Card, min-width 190px, flex-grow. Mono uppercase label → 24px extrabold value → optional mono 12px sub-line with an ↗/↘ arrow, colored green/red/grey |
| **Category chip** (Settings) | Inset pill: 8px colored square + name (click = rename) + `×` at 40% opacity (click = delete) |
| **Payment method chip** | Inset pill: `CreditCard` icon at 50% + name + `×` (the whole chip deletes) |
| **Category icon tile** | 36–38px square, radius 11–12, category color fill, white 16–18px icon |
| **Type chip** (holdings) | 24px square radius 8, type color, white 12px icon + label |
| **Badge** | Mono 9.5px uppercase: "recurring" / "12× installment" on a panel fill; "Matured" on green 12% |
| **Count badge** | Brand-tint pill, 11px bold brand text (Recent card count, Upcoming "next 30 days") |
| **Progress bar** | 6px (budgets) or 10px (goal) track, fully rounded; fill green/red with a 6px glow, or a blue/green gradient for the goal |
| **Inset info box** | Inset fill, radius 10–14, icon + text |
| **Empty state text** | 13px grey, centered, 24px vertical padding |
| **Inline error** | 12.5–14px red-text, directly under the form |
| **Confirmations** | Browser-native `confirm()` dialogs, unstyled (see §9) |

---

## 4. Dashboard (`/`)

File: `src/app/page.tsx`. Shows the **current budget cycle**, which runs from the chosen start day, default the 10th: "Aug 2026" = 10 Aug – 9 Sep.

### 4.1 Empty state (zero entries logged)
Centered, max 896px wide, 96px vertical padding:
- **Welcome to FinanceHub** (24px extrabold)
- "Log your first income or expense to start seeing your spending here." (14px muted, max ~384px)
- Primary pill button: `+ Add an entry` → goes to /entries

> Investment data alone does **not** leave this state; it gates on entries only.

### 4.2 Populated layout

```
Welcome back                                        [+ Add entry]
Here's your financial snapshot for Aug 2026

[ INCOME        ] [ EXPENSES          ] [ NET SAVINGS        ]
[ R$ 5.000,00   ] [ R$ 1.234,00      ] [ R$ 3.766,00        ]
[ ↗ this month  ] [ ↘ +R$ 200 vs. last] [ ↗ +R$ 800 vs. last ]

┌ Column 1 ──────────┐ ┌ Column 2 ───────────┐ ┌ Column 3 ──────────┐
│ Budgets            │ │ Spending by category│ │ Month-over-month   │
│ Upcoming           │ │ Income vs. expenses │ │ Net worth          │
│ Recent             │ │ Allocation          │ │ Payment methods    │
└────────────────────┘ └─────────────────────┘ │ Monthly value      │
                                               └────────────────────┘
```
Three columns at `lg` (1024px+), one stacked column below. Cards align to the top, so column heights differ.

**Header row:** "Welcome back" (20px bold) + "Here's your financial snapshot for **Aug 2026**". Right: primary button `+ Add entry` (a link to /entries; it does *not* open the modal here).

**Stat pills** (wrap on narrow screens):

| Pill | Value | Sub-line | Sub color |
|---|---|---|---|
| INCOME | Cycle income | ↗ "this month" | Always green |
| EXPENSES | Cycle expenses | `±R$ X vs. last month` | Green ↗ if spending fell, red ↘ if it rose |
| NET SAVINGS | Income − expenses | `±R$ X vs. last month` | Green if net rose, red if it fell |

### 4.3 Column 1

**Budgets** (`BudgetsCard.tsx`), padding 18px
- Header: "Budgets" + a 28px square `+` button (→ Settings)
- One row per expense category with a limit:
  - 38px category icon tile
  - Name (13.5px bold, truncates) · right-aligned mono `R$ 320,00 / R$ 800,00` (red when over)
  - 6px progress bar: green with a glow, or red with a glow when over; capped at 100% width
- **Insight box** (only if any limits exist): inset panel, radius 14
  - 20px circle icon: ✨ `Sparkles` green, or ⚠ `TriangleAlert` red
  - "Nice pace" / "Over budget" (12px bold, colored)
  - "You're R$ X under budget this month. Keep it up." / "You're R$ X over budget this month."
- Empty: "No budgets set yet. **Set one in Settings**" (link in brand color)

**Upcoming** (`UpcomingCard.tsx`), padding 18px
- Header: `CalendarClock` icon + "Upcoming" · brand-tint pill "next 30 days"
- Up to 5 rows, soonest first: category icon tile · name (bold) / "Sep 16 · Credit Card" · amount (`+` green for income, `−` ink for expense)
- Footer (above a hairline): "Scheduled net" or "and 3 more" · net amount in mono bold, green/red
- Empty: "Nothing scheduled in the next 30 days."
- Only shows real future-dated entries, which come mostly from recurring series.

**Recent** (`RecentEntriesCard.tsx`), padding 18px
- Header: "Recent" · brand-tint count pill (total number of entries ever)
- Last 5 entries by date: icon tile · name / "Category · Method" · amount (green `+` / ink `−`)
- Empty: "No entries yet."

### 4.4 Column 2

**Spending by category** (`SpendingByCategoryCard.tsx`), padding 20px
- Header: title + a compact month dropdown pill (panel fill, 12px semibold, chevron)
- Donut (160×160, inner radius 62%, 2° gaps, category colors) + legend list
  - Legend row: 8px colored square · category name (semibold, wraps) · mono amount (never wraps; drops to its own line if cramped)
  - Side by side from `sm`, stacked below
- Empty: "No expenses this month yet." (224px tall area)

**Income vs. expenses**, padding 20px
- Title + grouped bar chart, last 4 cycles, 256px tall
- Bars: income green, expenses red, top radius 4, gap 6
- X ticks: short month ("Jun"); Y ticks: `R$ 1.000`; legend underneath

**Allocation** (`AllocationCard.tsx`), padding 20px
- Header: "Allocation" + brand link "Investments →"
- Donut + legend, same component shape as Spending but colored by investment type; excludes matured holdings
- Empty: "No holdings yet."

### 4.5 Column 3

**Month-over-month net**: title + line chart, last 4 cycles, brand-color line, 2.5px stroke, 3px dots.

**Net worth** (`NetWorthCard.tsx`), padding 20px
- Header: "Net worth" · total in mono 15px bold (ink, or red if negative)
- Blurb: "Cash and investments together. Cash is the running total of what you have logged, not a bank balance." *(wording is intentional; keep the meaning)*
- **Stacked area chart**, 12 cycles: "Cash (logged)" brand area + "Investments" green area, vertical gradient fills, legend with circle icons
- Footer: `● Cash (logged) R$ X` and `● Investments R$ Y`

**Payment methods** (`PaymentMethodsCard.tsx`), padding 20px
- Left: "Payment methods" · "Track which card or account each expense is paid from." · brand link "Manage methods →"
- Right: 2×2 grid of 52px tiles (radius 16, inset fill, hairline ring) showing the method icon in fixed colors
- Stacks vertically below `sm`

**Monthly value**: title + portfolio value line, 12 cycles, brand line.

---

## 5. Entries (`/entries`)

Files: `src/app/entries/page.tsx`, `EntriesClient.tsx`, `EntryTable.tsx`, `EntryForm.tsx`.

### 5.1 Layout

```
Entries                                              [+ Add entry]
120 transactions · All time · net +R$ 33.840,00

[ all | income | expense ]  [📅 All time ▾]  [🔍 Search name or notes…   ×]

┌──────────────────────────────────────────────────────────────────┐
│ DATE    NAME            CATEGORY     METHOD     AMOUNT   ACTIONS │
│ Sep 2   Netflix         ■ Utilities  Credit     −R$ 39,90  Edit Delete Series │
│         [RECURRING]                                              │
│         streaming note                                           │
└──────────────────────────────────────────────────────────────────┘
Showing 1–50 of 120                                  [‹ Previous] [Next ›]
```

**Header**
- "Entries" (28/34px extrabold)
- Summary line: `120 transactions · Aug 2026 · net` + amount (semibold, green if ≥ 0, red if negative). Counts and net reflect the **whole filtered set**, not just the visible page.
- Primary button `+ Add entry` opens the modal.

**Filter bar** (wraps):
1. **Type segmented control**: glass pill holding three pill buttons, `all` / `income` / `expense`, lowercase with CSS capitalize. Active: all = black 8% fill + ink text; income = green tint + green; expense = red tint + red. Inactive: grey text.
2. **Month dropdown**: pill, 1px border, card fill, `Calendar` icon left, chevron right. "All time" plus every month that has data.
3. **Search**: pill input, `Search` icon, clear `×` button when text is present, min 210px, max 300px from `sm`. Searches name and notes; runs on Enter.

Filters live in the URL, so the back button works. While a filter change is loading, the table dims to 60% opacity.

### 5.2 Table (`EntryTable.tsx`)
Glass container (radius 22, border, shadow), **horizontally scrollable below 820px**.

Columns (CSS grid, `90px 1.4fr 1.1fr 1fr 110px 150px`):

| Column | Content |
|---|---|
| DATE | Mono 13px grey, `Sep 2, 2026` / `02/09/2026` |
| NAME | Name 13.5px semibold ink, truncates. Optional badge **RECURRING** or **12× INSTALLMENT** (mono 9.5px, panel fill, radius 6). Optional note underneath in 12px grey |
| CATEGORY | 9px colored square + name, 13.5px semibold |
| METHOD | 13px muted, blank if none |
| AMOUNT | Right-aligned mono 14px: `+R$ 5.000,00` green (income) or `−R$ 39,90` ink (expense) |
| ACTIONS | Right-aligned text buttons: **Edit** (hover ink) · **Delete** (hover red) · **Series** (hover red, only on a recurring/installment row with >1 entries) |

Header row: mono 10.5px uppercase grey, bottom hairline. Row dividers: black 4%. Row padding 15px/24px.

Empty (no results): "No entries match these filters yet." centered, 48px padding.

### 5.3 Pagination
Only shown when there are more than 50 results.
- Left: `Showing 1–50 of 120` (mono 12px grey, tabular)
- Right: two pill buttons, `‹ Previous` and `Next ›` (bordered, card fill, hover track fill, disabled at 40% opacity)

### 5.4 Add / Edit entry modal (`EntryForm.tsx`)
Modal title: "Add entry" or "Edit entry". A 2-column grid from `sm`, 1 column below. Field style **A** (bordered).

| # | Field | Details | Visibility |
|---|---|---|---|
| 1 | **Type toggle** | Full-width segmented control: `expense` / `income`. Active = ink fill + white text | Always, spans 2 cols |
| 2 | **Name** | Text, required, max 80, placeholder "e.g. Trader Joe's" | Always |
| 3 | **Date** | Native date picker, default today | Always |
| 4 | **Notes (optional)** | Text, max 200, placeholder "e.g. bought for team lunch" | Always |
| 5 | **Category** | Select of that type's categories | Always |
| 6 | **Value** | Number, step 0.01, min 0.01, placeholder "0.00" | Always |
| 7 | **Payment method (optional)** | Select with "None" first | Expense only |
| 8 | **Repetition (optional)** | Select: "One time" / "Repeats monthly (12 months)" | Add only (hidden when editing) |
| 9 | **Installments** | Number 1–36, default 1 + hint "Installments splits the amount evenly across that many months." | Add + expense + "One time" |

Footer: primary button **Add entry** / **Save changes** (shows "Adding…" / "Saving…" while pending) + text button **Cancel**.

**Blocking empty state** (no categories exist for the selected type): the fields are replaced by the sentence "You don't have any expense categories yet. **Add one in Settings** before logging an expense."

Behavior: after **adding**, the form resets and stays open for rapid entry; after **editing**, it closes.

---

## 6. Investments (`/investments`)

Files: `src/app/investments/*`. The most complex screen.

### 6.1 Page order (top to bottom)

```
Investments                              [⟳ Update prices] [+ Add holding]
3 holdings · gain/loss figures are estimates, not tax guidance

[🎉 MATURED BANNER — only when a holding has matured]

[TOTAL VALUE] [TOTAL INVESTED] [TOTAL GAIN/LOSS] [COUPONS RECEIVED]
Accrual estimates use CDI 12.65% · SELIC 13.25% · IPCA 5.50% p.a. These reference rates have never been updated…

┌ Monthly value ────────────┐ ┌ Projection ────────────────┐
└───────────────────────────┘ └────────────────────────────┘

┌ Goal & projection ▾ ────────────────────────── [✎ Edit goal] ┐
└──────────────────────────────────────────────────────────────┘

┌ Holdings table ──────────────────────────────────────────────┐
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Header
- "Investments" (28/34px) + `3 holdings · gain/loss figures are estimates, not tax guidance`
- **Update prices** (secondary glass button, `RefreshCw` icon) opens the Update prices modal
- **Add holding** (primary, `+`) opens the holding form modal

### 6.3 Matured banner
Only when ≥ 1 holding has passed its maturity date.
- Rounded-18 box, green 7% fill, green 25% border
- `PartyPopper` icon + "Your investment is finalized — you have **R$ 21.963,52** to reinvest!" (plural: "2 investments are finalized — …")
- Indented list, one row per holding: **Name** · mono "matured Aug 12, 2026 · R$ X"
- Footnote (11.5px): "These are no longer counted in your totals below. They stay here until you delete them, so nothing is lost."

### 6.4 Summary pills
Same pill as the Dashboard (the sub-line is optional here):

| Pill | Shown when | Color |
|---|---|---|
| TOTAL VALUE | Always | Ink |
| TOTAL INVESTED | Always | Ink |
| TOTAL GAIN/LOSS | A return is computable | Value and `+7.6%` sub-line in green or red |
| COUPONS RECEIVED | Total > 0 | Green |

### 6.5 Reference rates note
12px muted line directly under the pills, only when some holding is valued by rate accrual:
- "Accrual estimates use CDI 12.65% · SELIC 13.25% · IPCA 5.50% p.a."
- then either "Reference rates last updated Sep 1, 2026." (muted) **or** "These reference rates have never been updated — treat accrual figures as rough." (**red**)

### 6.6 Two chart cards (2 columns at `lg`)

| Card | Right-side label | Blurb | Chart |
|---|---|---|---|
| **Monthly value** | "last 12 months" (11px grey) | "Total portfolio value at the end of each month." | Brand line |
| **Projection** | "30d → 20y" | "An estimate, not a forecast — assumes today's rates hold steady and each holding stops growing at its maturity date rather than being automatically reinvested." | Steel-blue line at 11 horizons: 30d, 60d, 90d, 6m, 9m, 1y, 3y, 5y, 10y, 15y, 20y |

### 6.7 Goal & projection card (`GoalProjectionCard.tsx`)
One card with **5 visual states**.

**Header (always visible):**
- Title "Goal & projection" is a button with a `ChevronDown` (rotated −90° when collapsed); hover turns it brand-colored
- Sub-line:
  - *expanded:* "Where your portfolio is heading, and what it takes to hit your goal."
  - *collapsed + goal:* "Emergency fund — **43.4%** of R$ 150.000,00"
  - *collapsed, no goal:* "Set a goal"
- Right: subtle button `✎ Edit goal` (or `✎ Set a goal`)
- The open/closed state is remembered between visits.

**Expanded body:**

1. **Actual return box** (inset, radius 12)
   - `TrendingUp` icon + "Actual return: **8.42% p.a.**" + small white pill button "Use as the projection rate"
   - *or* "Actual return: **not enough data yet**"
   - Footnote: "Money-weighted, from your contributions and today's value — each purchase counts from its holding's start date…"
2. **Preview notice** (only after clicking "Use as the projection rate"): brand 10% box, "Previewing at 8.42% p.a. — **reset** or save it via Edit goal to keep it."
3. **No goal yet:** inset box with "No goal set yet. Add one to see how far along you are and what monthly contribution gets you there." + primary `🎯 Set a goal`
4. **With a goal:**
   - Row: `Target` icon + **Emergency fund** · mono "by March 2027"
   - **10px progress bar**: steel-blue gradient (`#3D6B9E → #5A8BC4`), or green gradient once the goal is reached
   - Below the bar: **43.4%** (mono semibold) · `R$ 65.039,11 / R$ 150.000,00`
   - **Two solver boxes** side by side (stacked on mobile), each an inset box with an icon and a mono uppercase label:

     | Box | Possible messages |
     |---|---|
     | 💼 TO HIT THE GOAL | "contribute R$ 477,69/month to get there by March 2027" · "At this pace you pass the goal before the target date 🎯" · "The target date has already passed — adjust it…" (muted) |
     | 📅 AT YOUR CURRENT CONTRIBUTION | "R$ 1.200,00/month → arrives April 2027" · "Goal already reached 🎉" · "the goal isn't reached at this contribution — raise it or move the date" (muted) |

   - **Goal projection chart** (288px tall; see §10)
   - Footnote: "Projected from the assumptions above (10.00% p.a., with a ±3 p.p. band). Past performance doesn't guarantee future results."

### 6.8 Holdings table (`HoldingsTable.tsx`)
Glass container, **horizontally scrollable below 960px**. Grid: `1.3fr 140px 120px 165px 276px`. The column widths were measured to fit the actions on one line; re-check them if the typography changes.

| Column | Content |
|---|---|
| NAME | Name as a button (13.5px semibold, underline on hover; opens detail). Under it: a **MATURED** badge (green) and/or the institution in 12px grey |
| TYPE | 24px type-color icon tile + type label (13px). Subtype underneath in 11px grey, e.g. "Tesouro IPCA+" |
| VALUE | Right-aligned mono 13px value + a 10.5px hint: `manual · Sep 1, 2026` / `accrual estimate` / `final value` |
| GAIN/LOSS | Right-aligned mono 13px `+R$ 1.000,00 (10.0%)`, green/red, or `—` grey |
| ACTIONS | Text buttons: **View more** · **Add coupon** (Fixed income & Fund only, hover brand) · **Edit** · **Delete** (hover red) |

Empty: "No holdings yet." (centered, not in a card).

---

## 7. Settings (`/settings`)

File: `src/app/settings/page.tsx`. Title "Settings" + "Manage categories, budgets and backups." Three **headed sections**, 36px apart. Each has a mono uppercase heading, a 13px blurb, and a **2-column card grid** from `md` (1 column below). Most cards use padding 22px and a **16px** title.

```
MONEY
The categories you log against, what you plan to spend, and how you pay.
[ Expense categories ] [ Income categories ]
[ Monthly budgets    ] [ Payment methods   ]
[ Categories needing attention — full width, only if needed ]

PREFERENCES
How the app looks, and when each reporting month begins.
[ Month start day    ] [ App color ]
                       [ Language  ]

DATA
Everything lives on this computer — there's no cloud copy.
[ Backup & restore (brand gradient) ] [ Import from CSV — full width ]
```

### 7.1 Money section

**Expense categories** / **Income categories** (`CategoryManager.tsx`), two identical cards
- Title + "Used when logging an expense." / "Used when logging income."
- Wrap of **category chips**: colored square + name + `×`
  - Clicking the **name** turns the chip into an inline rename form: small pill input (130px, pre-filled, autofocus) + gradient "Save" pill + "Cancel" text; errors appear inline in red
  - Clicking **×** deletes immediately (no confirmation)
- Empty: "No categories yet."
- Add row: pill input "New category…" + gradient pill "Add"; red error line below (e.g. `"Rent" already exists.`)

**Monthly budgets** (`BudgetEditor.tsx`)
- "Monthly budgets" + "Blank means no limit."
- One row per expense category: 9px colored square + name · right pill `R$ [___]` (mono, 80px input, step 10)
- Primary "Save limits"
- Empty: "Add an expense category first."

**Payment methods** (`PaymentMethodManager.tsx`)
- "Payment methods" + "Optional, shown when logging an expense."
- Chips: `CreditCard` icon + name + `×` (the whole chip is the delete button)
- Empty: "No methods yet."
- Pill input "e.g. Debit Card" + "Add"

**Categories needing attention** (`OrphanCategoriesCard.tsx`). **Only appears when something is wrong**; full width.
- `AlertTriangle` (red) + title + blurb "Entries and budgets refer to categories by name, so renaming or deleting one elsewhere can leave them pointing at nothing."
- List of inset rows (radius 12), each a sentence + an action:
  - "2 entries are filed under "Farmacia", which is no longer one of your categories." → gradient pill **Add it back**
  - "A budget is set for "Assinaturas", which is not an expense category — it can never fill." → red-text pill with a ring, **Remove budget**

### 7.2 Preferences section

**Month start day** (`CycleSettingsCard.tsx`)
- Title + "The day each month begins for totals, budgets and charts. Use 1 for normal calendar months."
- Row: "Starts on day" · pill `[10] of the month` (number 1–28)
- Live preview box (inset, `CalendarRange` icon): "Right now that means **Aug 2026** runs **Aug 10 – Sep 9**."
- Primary "Save start day"
- Footnote: "Days 29–31 aren't available because they don't exist in every month…"

**App color** (`AccentColorCard.tsx`)
- Title + "Sets the accent used for buttons, the sidebar and highlights."
- 5 swatches in a row: a 36px circle each, with its label underneath (11.5px). Selected: white `Check` inside, a 2px page-color gap + 2px swatch-color ring, and a bold ink label
- Primary "Save color", **disabled until the selection changes**
- Footnote: "Income and gains stay green and expenses stay red whichever color you pick…"

**Language** (`LanguageCard.tsx`), stacked under App color
- Title + "The language this app's own text is shown in."
- Two option buttons (radius 12): `🌐 English`, `✓ Português`. Selected = brand-tint fill + brand text + 1.5px brand inset ring. Each language is written in its own language.
- Primary "Save language", disabled until changed
- Footnote: "Your own text — category names, payment methods, entry and holding names — is never translated. Amounts stay in R$ either way."

### 7.3 Data section

**Backup & restore** (`BackupPanel.tsx`). **The one card that isn't glass:** a full brand gradient (brand → brand-deep), white text, brand panel shadow.
- "Backup & restore" + "Your data lives locally. Export a JSON copy or restore from one." (white 70%)
- Two equal buttons:
  - **Export** (`Download`): solid white with brand-colored bold text; downloads JSON
  - **Import** (`Upload`): white 15% fill, white 20% border, white text; opens the file picker, confirms, then **replaces all data**
- Full-width outline button **Restore default categories** (`RotateCcw`, white 25% border, white 75% text)
- Errors in white text

**Import from CSV** (`CsvImportCard.tsx`), full width, **progressive disclosure**
1. *Initial:* `FileSpreadsheet` icon + "Import from CSV" + blurb "Bring in a bank or card statement. The file is read on this computer and never uploaded, and this adds to your entries rather than replacing them." + inset pill `⬆ Choose a CSV file`
2. *After picking a file* (the pill now shows the filename):
   - Row of 3 dropdowns (mono uppercase labels): **DATE COLUMN**, **DESCRIPTION COLUMN**, **AMOUNT COLUMN**, pre-filled by guessing from the header
   - Row of 3 dropdowns: **INCOME OR EXPENSE** ("By sign (negative = expense)" / "All rows are expenses" / "All rows are income"), **FILE EXPENSES UNDER**, **FILE INCOME UNDER**
   - Optional **PAYMENT METHOD** dropdown (max 260px)
   - **Preview well** (inset, radius 12, scrolls horizontally): "FIRST ROWS, AS THEY WILL BE CREATED" + up to 5 rows of mono date · name (truncates) · colored amount
   - Primary **Import 4 entries** (shows "Importing…" while running) + "2 rows skipped — no readable date or amount." (muted)
3. *Done:* green "Imported 4 entries." and the card returns to its initial state
4. *Error:* red message (e.g. "That file has no rows this can read.")

**License** card: hidden while licensing is switched off (see §8).

---

## 8. Dormant screens (licensing)

Licensing is **switched off** (`LICENSING_ENABLED = false`), so these never render today. Include them only if the redesign should be ready for a paid version.

**Activation gate** (`LicenseGate.tsx`) replaces page content; the sidebar stays.
- Centered column, max 512px, 64px top padding
- 48px brand-gradient tile with a `KeyRound` icon
- "Activate FinanceHub" (24px extrabold) + body "Enter the email you bought with and the license key from your purchase email. Everything then runs offline on this computer — no account, no sign-in."
- Card form: **Email used to buy** (email) · **License key** (3-row mono textarea, "Paste the key from your purchase email") · red error · primary **Activate** / "Activating…"
- Below (only if data exists): brand link `⬇ Export my data` + "You can always export your data, licensed or not."

**Trial banner** (`TrialBanner.tsx`): brand-tint strip, radius 14, `Clock` icon, "Trial — 12 days left. Everything works; activate whenever you're ready."

**License card** (Settings → Data): "License" + "You're on the free trial." / "This copy is activated." + a tinted status row with `BadgeCheck` "Licensed to you@example.com" or `Clock` + the trial text.

---

## 9. Every modal and dialog

All modals share `src/components/Modal.tsx`:
- Full-screen scrim: black 15% + `backdrop-blur-sm`; clicking it closes the modal
- Card: **solid** `--color-modal` (deliberately not glass, because translucency over the scrim looked muddy), max width 576px, radius 22, padding 24px, card shadow
- Header: title (16px bold) + 28px round `×` close button (hover panel fill)
- Top-aligned with 40px padding on mobile, vertically centered from `sm`; the page scrolls if the content is tall
- `Esc` closes

| Modal | Opened from | Contents |
|---|---|---|
| **Add entry** / **Edit entry** | Entries header button / row "Edit" | §5.4 |
| **Add holding** / **Edit holding** | Investments header / row "Edit" | §9.1 |
| **Update prices** | Investments header | §9.2 |
| **{Holding name}** (detail) | Holding name or "View more" | §9.3 |
| **Coupon payments — {Holding name}** | Row "Add coupon" | Coupon section only (§9.3) |
| **Set a goal** / **Edit goal** | Goal card | §9.4 |

**Native browser confirmations** (unstyled `confirm()`; a redesign could replace them):
- "Delete this entry? This can't be undone."
- "Delete all 12 entries in this series? This can't be undone."
- "Delete this holding? Its price history will be deleted too. This can't be undone."
- "Delete this price point?"
- "Delete this coupon payment?"
- "Importing will replace all current data with the backup file. Continue?"
- "Restore default categories and payment methods? Custom ones will be removed."

> Deleting a category, a payment method or a transaction has **no** confirmation.

### 9.1 Add / Edit holding (`HoldingForm.tsx`)
2-column grid, field style A. **Many fields are conditional** on type, subtype and index:

| Field | Shown for |
|---|---|
| Name (2 cols, placeholder "e.g. CDB Nubank 12 months") | All |
| Type (Fixed income / Fund / Stock / ETF / Crypto / Other) | All |
| Start date | All |
| Subtype (15 fixed-income + 9 fund options) | Fixed income, Fund |
| Ticker / symbol ("ex.: PETR4" or "ex.: bitcoin") | Stock, Crypto |
| Maturity date (optional) | Fixed income, Fund |
| **"RETURN" sub-panel** (inset well, radius 12, 2 cols) containing: | Fixed income, Fund |
| ↳ Index (Fixed rate / % of CDI / CDI + / IPCA + / % of SELIC) | |
| ↳ Rate % p.a. *or* % of CDI *or* % of SELIC | Index ≠ CDI+/IPCA+ |
| ↳ Spread (% p.a.) | Index = CDI+ or IPCA+ |
| ↳ Performance (%) | Fund |
| Management fee (% p.a., optional) | Fixed income, Fund, Stock |
| Quantity + purchase price (labels vary by type) | Fund, Stock, Crypto, Tesouro Direto subtypes |
| Amount invested (R$), auto-fills from quantity × price until edited by hand | All |
| Expected return (% p.a.) | Other |
| Estimated brokerage fee (R$, optional) | Stock, Crypto |
| Institution (optional, "e.g. XP, Nubank") | All |
| Notes (optional, 2 cols, "e.g. long-term hold") | All |

Footer: **Add holding** / **Save changes** + Cancel.

### 9.2 Update prices (`UpdatePricesModal.tsx`)
- One **Date** field (style A, 224px wide from `sm`)
- Scrolling list (max 360px): one panel-filled row per holding
  - Name (13px semibold) · hint "Last: R$ 123,45 · price per unit" / "No manual value yet · current total value"
  - Right: 112px mono number input
- Blank inputs are skipped. Primary **Save prices** + Cancel.
- Empty: "Add a holding first."

### 9.3 Holding detail (`HoldingDetail.tsx`)
Vertical stack, 20px gaps:
1. Muted line: `Fixed income · CDB · Nubank`
2. **4 stats** (2×2 on mobile, 4 across from `sm`), mono uppercase 10px labels, 14px semibold mono values:
   CURRENT VALUE · INVESTED · GROSS GAIN (green/red) · NET GAIN* (green/red)
3. Tax footnote (11px, only if IOF or IR > 0): "*Estimated after IOF (R$ X) and IR (R$ Y, 20.0% on 243d held) — an estimate for personal reference, not tax filing guidance."
4. **MONTHLY VALUE** + "last 12 months": 160px steel-blue line chart, no Y axis
5. **MANUAL PRICE ENTRIES**: 160px brand line chart, *or* "No price history yet."
6. **PRICE HISTORY**: list (max 256px, scrolls): mono date · mono value · Edit · Delete. Edit swaps in an inline number input + Save (brand text) / Cancel. Empty: "No prices recorded."
7. **COUPON PAYMENTS** (Fixed income & Fund only)
   - Header right: green mono "R$ 246,90 total received"
   - Inline add form: small Date + Amount fields + gradient "Add coupon" button
   - List: mono date · green "+R$ 123,45" · Edit · Delete (edit swaps in an inline input). Empty: "No coupon payments recorded."
8. **Buys and sells** (all types; `TransactionSection.tsx`)
   - "Buys and sells" (15px extrabold) · right: mono "Net invested R$ 2.500,00 · 10 units"
   - Hint: *before any:* "Optional. Record one and this holding is valued from these dated flows instead of its single start date…" / *after:* "This holding is valued from these dated flows rather than its start date and stored amount."
   - Inline form (mono uppercase micro-labels): TYPE (Buy/Sell) · DATE · AMOUNT · UNITS (per-unit types only) · gradient "Add"
   - List rows (inset, radius 10): 24px circle icon (↙ green for buy, ↗ red for sell) · mono date · "Buy"/"Sell" · spacer · units · amount (`+` ink or `−` red) · 🗑 delete. Empty: "No buys or sells recorded."

### 9.4 Goal form (`GoalForm.tsx`)
Field style **B** (soft) with sentence-case labels:
- **Goal name** ("Emergency fund")
- **Target amount (R$)** with a small pill `🛡 Emergency fund` on the right of the label (fills in 6 × average monthly expenses) + hint "Fills in 6 × your average monthly expenses (R$ X/month)."
- **Target date** · **Expected return (% p.a.)** side by side (stacked on mobile), default 10
- **Monthly contribution (R$)** + hint "Leave blank to use your recent average (R$ X/month over the last 6 months)."
- Right-aligned primary **Save goal**

---

## 10. Every chart

Library: **Recharts**. Shared conventions: dashed 3-3 horizontal grid lines in `--color-track`, no axis lines or tick marks, mono 11.5px grey ticks, currency ticks as `R$ 12.000`, and animations turned off (they caused rendering bugs).

**Tooltip (identical everywhere):** radius 12, 13px Jakarta, `--color-tooltip-bg`, blur 16, 1px border, `0 4px 20px rgba(0,0,0,.1)`, values as full currency.

| Chart | Where | Type | Size | Colors | Empty state |
|---|---|---|---|---|---|
| Spending by category | Dashboard col 2 | Donut 62% inner + legend | 160px | Category palette | "No expenses this month yet." |
| Income vs. expenses | Dashboard col 2 | Grouped bars, 4 cycles, legend | 256px tall | Green / red | *(none)* |
| Allocation | Dashboard col 2 | Donut + legend | 160px | Investment type palette | "No holdings yet." |
| Month-over-month net | Dashboard col 3 | Line + dots, 4 cycles | 256px | Brand | *(none)* |
| Net worth | Dashboard col 3 | **Stacked areas** (gradient fills 45%→12%), legend, 12 cycles | 256px | Brand + green | "No entries yet." |
| Monthly value | Dashboard col 3 **and** Investments | Line + dots, 12 cycles | 256px | Brand | "No price history yet." |
| Projection | Investments | Line + dots, 11 horizons | 256px | Steel blue `#3D6B9E` | "Add a holding to see a projection." |
| Goal projection | Goal card | **Composed**: shaded range band (13% steel blue) + steel-blue line + dashed brand "Goal" reference line + brand dot where the goal is crossed (white 2px stroke); every Nth tick labelled | 288px, Y axis 92px wide | Steel blue + brand | "Set a goal to see the projection." |
| Per-holding monthly value | Holding detail | Line, Y axis hidden | 160px | Steel blue | *(none)* |
| Manual price entries | Holding detail | Line, Y axis hidden | 160px | Brand | "No price history yet." |

**Chart quirks to design around**
- Right margin of 30px on the Monthly value chart stops the last x-label ("Aug 2026") from clipping.
- Donut legends put the amount on its own line when the column is narrow, rather than truncating the category name.
- Portuguese month labels are built as "ago 2026", not Intl's "ago. de 2026", which wrapped every axis.

---

## 11. Icons

**Library:** lucide-react only. Two usage patterns: loose UI icons, and a name → icon map (`src/components/CategoryIcon.tsx`) for data-driven tiles.

**UI icons in use**

| Area | Icons |
|---|---|
| Nav | `ChartPie` (logo), `LayoutDashboard`, `ListOrdered`, `TrendingUp`, `Settings` |
| Actions | `Plus`, `X`, `Pencil`, `Trash2`, `RefreshCw`, `Download`, `Upload`, `RotateCcw`, `Check` |
| Toolbars | `Calendar`, `ChevronDown`, `ChevronLeft`, `ChevronRight`, `Search`, `ArrowRight` |
| Status | `ArrowUpRight`, `ArrowDownRight`, `ArrowDownLeft`, `Sparkles`, `TriangleAlert`, `AlertTriangle`, `PartyPopper`, `BadgeCheck`, `Clock` |
| Content | `CalendarClock`, `CalendarRange`, `Target`, `Wallet`, `ShieldCheck`, `Languages`, `FileSpreadsheet`, `CreditCard`, `KeyRound` |

**Data icons** (category, method and type tiles):

| Name | Icon | Used for |
|---|---|---|
| shopping-cart | ShoppingCart | Groceries |
| home | Home | Rent |
| car | Car | Transport |
| zap | Zap | Utilities |
| utensils | Utensils | Dining Out |
| tv | Tv | Entertainment |
| heart-pulse | HeartPulse | Health |
| shopping-bag | ShoppingBag | Shopping |
| arrow-down-left | ArrowDownLeft | Salary |
| briefcase | Briefcase | Freelance |
| trending-up | TrendingUp | Investment category; Stock type |
| gift | Gift | Gift |
| package | Package | Other / **fallback for any custom category** |
| credit-card | CreditCard | Debit & Credit Card; method fallback |
| banknote | Banknote | Cash |
| landmark | Landmark | Bank Transfer; Fixed income type |
| coins | Coins | Other method |
| layers | Layers | Fund type |
| bitcoin | Bitcoin | Crypto type |

> Any category the owner creates themself gets the generic `Package` icon. The owner's real categories include "Fatura", "Mimos" and "Assinaturas", so most real tiles show a box. That's worth solving in a redesign.

**Emoji in copy:** 🎯 "…pass the goal before the target date 🎯", 🎉 "Goal already reached 🎉".

---

## 12. States checklist

| State | How it looks today |
|---|---|
| **Hover** | Primary buttons brighten 5%; text buttons go grey → ink (red for destructive, brand for coupon); chips darken to the track fill; holding names underline; icon buttons get a panel fill |
| **Press** | Primary buttons and the logo scale to 95% |
| **Focus** | Style A: ink border + white fill. Style B: 2px brand ring at 30%. Style C: 1px ink ring. Buttons use the browser's default focus ring (no custom one) |
| **Pending** | Button label becomes "Saving…" / "Adding…" / "Importing…" / "Activating…" and the button goes to 50% opacity. The entries table dims to 60% during filter navigation. There are no spinners or skeletons anywhere |
| **Disabled** | 50% opacity (Save color / Save language until changed); pagination at 40% |
| **Error** | Red text line under the form. No field-level error styling, no toasts |
| **Success** | Mostly silent: modals close, forms reset, lists update. The only explicit success message is CSV's "Imported N entries." |
| **Empty** | Grey centered sentence, sometimes with a brand link (see each section) |
| **Selected** | Nav: brand tint. Segmented controls: tint or ink fill. Swatches: ring + check. Language: tint + inset ring |
| **Negative values** | Red text; the net worth total goes red when below zero |
| **Loading (first paint)** | Server-rendered; no loading UI |

---

## 13. Inconsistencies and redesign opportunities

Found while reading the code for this document. They're factual observations of how things are built today; the dark-mode ones haven't been checked in the browser.

### Hierarchy and type
- **Page titles disagree.** Dashboard uses 20px bold "Welcome back"; Entries, Investments and Settings use 28–34px extrabold.
- **Card titles disagree.** 17px on Dashboard and Investments, 16px in Settings, 15px for "Buys and sells".
- **No defined type scale.** 20+ distinct sizes are in use (9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 17, 20, 24, 28, 34…).
- **Two label conventions:** uppercase 11px grey (entry, holding, price forms) vs. sentence-case 12.5px ink (goal and license forms).
- **Wordmark case:** "financehub" in the sidebar vs. "FinanceHub" in the page title and copy.

### Components
- **Three input styles plus variants** (§3.5) where one would do.
- **Several button languages:** gradient rectangle, gradient pill, glass, subtle, text, and white-on-gradient.
- **Two chip behaviors:** category chips delete only via ×, while payment method chips delete when clicked **anywhere**, which is easy to trigger by accident, with no confirmation.
- **Confirmations are native browser dialogs**, visually disconnected from the app, and inconsistently applied (§9).
- **No toasts, spinners or skeletons.** Success is usually implicit.
- **Placeholder "0.00" uses a dot** while the app displays amounts with a comma (`R$ 0,00`).

### Color
- **A second accent hides in the charts.** Steel blue `#3D6B9E` is hardcoded in the Projection, per-holding and goal charts and the goal progress bar. It doesn't follow the brand color, isn't a token, and has no dark-theme variant.
- **The investment type palette is earthy/muted** (`#2E7D50`, `#8C2D3F`, `#A87B3A`…) while the category palette is bright Tailwind hues. The two appear on the same Dashboard.
- **Generic icons for custom categories** (§11).

### Dark theme (likely problems, not browser-verified)
These use hardcoded black/white instead of tokens, so they probably won't adapt:
- **Entry form type toggle:** active state is `--color-ink` fill + literal white text. In dark mode ink becomes near-white, so the label would be almost invisible. **Most likely a real bug.**
- Card and table borders are `border-black/[0.07]`: invisible on a dark ground.
- Sidebar summary box `bg-black/[0.03]` and its divider `bg-black/10`.
- Entries "all" filter active fill `rgba(0,0,0,0.08)`.
- Modal scrim `bg-black/15` (the `--color-scrim` token exists but isn't used).
- Scrollbar hover `rgba(0,0,0,0.25)`; goal chart crossing-dot stroke `#fff`; budget insight red circle `rgba(220,53,69,0.12)`.
- Payment-method tiles, category colors and type colors have no dark variants.

### Copy and i18n gaps
- **Update prices** hint text "Last: R$ X" and "No manual value yet" is hardcoded English; it doesn't translate.
- **Goal chart tooltip** "Pessimistic – optimistic" is hardcoded English.
- Two emoji appear in otherwise emoji-free copy (🎯 🎉).

### Layout and mobile
- **No real mobile navigation.** The sidebar only collapses to a 72px rail; there's no bottom bar or drawer. Relevant if the iPhone idea goes ahead.
- **Both tables scroll sideways on phones** (820px and 960px minimum widths). Card-style rows would read better at 375px.
- **The Dashboard is three independent columns**, so related cards (e.g. two portfolio charts) end up in different places and column heights are uneven.
- **Monthly value appears twice** with identical content (Dashboard and Investments).
- **Investments is very long:** header, banner, pills, note, two charts, goal block, then the table last. The table is arguably the primary content but sits at the bottom.

---

## 14. Appendix: all UI copy (English)

The full, authoritative copy lives in `src/lib/i18n.ts`, with the matching Portuguese dictionary alongside it. `{…}` marks a value filled in at runtime.

### Navigation & common
Dashboard · Entries · Investments · Settings · Current month · IN · OUT · Net · Expand sidebar · Collapse sidebar
Save · Saving… · Adding… · Importing… · Cancel · Edit · Delete · Add · Date · Name · Category · Amount · Value · Type · Actions · None · Close dialog · Save changes · last {n} months

### Dashboard
- Welcome to FinanceHub · Log your first income or expense to start seeing your spending here. · Add an entry
- Welcome back · Here's your financial snapshot for {month} · Add entry
- Income · Expenses · Net savings · this month · vs. last month
- Budgets · No budgets set yet. · Set one in Settings · Over budget · Nice pace
- You're {R$} over budget this month. / You're {R$} under budget this month. Keep it up.
- Upcoming · next {n} days · Nothing scheduled in the next 30 days. · and {n} more · Scheduled net
- Recent · No entries yet.
- Spending by category · No expenses this month yet.
- Income vs. expenses · Month-over-month net · Monthly value
- Allocation · Net worth · Cash and investments together. Cash is the running total of what you have logged, not a bank balance. · Cash (logged) · Investments
- Payment methods · Track which card or account each expense is paid from. · Manage methods

### Entries
- Entries · {n} transaction(s) · All time · net · all · income · expense
- Search name or notes… · Clear search · Showing {from}–{to} of {total} · Previous · Next
- Add entry · Edit entry · Method · Series · recurring · installment
- No entries match these filters yet.
- e.g. Trader Joe's · Notes (optional) · e.g. bought for team lunch · Payment method (optional)
- Repetition (optional) · One time · Repeats monthly (12 months) · Installments · Installments splits the amount evenly across that many months.
- You don't have any {expense/income} categories yet. · Add one in Settings · before logging {an expense/income}.

### Investments
- Investments · {n} holding(s) · gain/loss figures are estimates, not tax guidance
- Update prices · Add holding · Edit holding · No holdings yet. · Add a holding first.
- Total value · Total invested · Total gain/loss · Coupons received · Gain/loss
- Matured · final value · accrual estimate · manual · {date}
- Your investment is finalized — you have {R$} to reinvest! / {n} investments are finalized — … · matured
- These are no longer counted in your totals below. They stay here until you delete them, so nothing is lost.
- Accrual estimates use CDI {x} · SELIC {x} · IPCA {x} p.a. · Reference rates last updated {date}. · These reference rates have never been updated — treat accrual figures as rough.
- Monthly value · Total portfolio value at the end of each month.
- Projection · An estimate, not a forecast — assumes today's rates hold steady and each holding stops growing at its maturity date rather than being automatically reinvested. · Add a holding to see a projection.
- View more · Add coupon
- Current value · Invested · Gross gain · Net gain*
- *Estimated after IOF ({R$}) and IR ({R$}, {rate}% on {days}d held) — an estimate for personal reference, not tax filing guidance.
- Manual price entries · Price history · No price history yet. · No prices recorded.
- Coupon payments · No coupon payments recorded. · total received
- Buys and sells · Net invested · units · Buy · Sell · No buys or sells recorded. · (two hint sentences, §9.3)
- price per unit · current total value · Save prices
- **Holding form:** Start date · Subtype · Ticker / symbol · Maturity date (optional) · Return · Index · Spread (% p.a.) · Performance (%) · Management fee (% p.a., optional) · Amount invested (R$) · Expected return (% p.a.) · Estimated brokerage fee (R$, optional) · Institution (optional) · Notes (optional) · e.g. CDB Nubank 12 months · e.g. XP, Nubank · e.g. long-term hold · Number of shares · Price per share at purchase · Number of units · Unit price at purchase · Quantity · Average purchase price
- **Types:** Fixed income · Fund · Stock / ETF · Crypto · Other
- **Indexes:** Fixed rate · % of CDI · CDI + · IPCA + · % of SELIC · Rate % p.a.
- **Subtypes:** CDB · LCI · LCA · Poupança (savings) · Tesouro Selic · Tesouro IPCA+ · Tesouro Prefixado · Tesouro Renda+ · Tesouro Educa+ · NTN-F (fixed rate w/ coupons) · Debênture (tax-exempt) · Debênture (standard) · CRI · CRA · Other fixed income · FIDC / FIC-FIDC (senior share) · FIDC (subordinated share) · FII (closed-end / unlisted) · FI-Infra · FI-Agro · Fixed income fund · Multi-strategy fund · Equity fund · Other fund

### Goal
- Goal & projection · Where your portfolio is heading, and what it takes to hit your goal. · of · Set a goal · Edit goal
- Actual return: · not enough data yet · Use as the projection rate
- Money-weighted, from your contributions and today's value — each purchase counts from its holding's start date, so a top-up on an existing holding is attributed to that original date.
- Previewing at {rate}% p.a. — · reset · or save it via Edit goal to keep it.
- No goal set yet. Add one to see how far along you are and what monthly contribution gets you there.
- by · To hit the goal · At your current contribution
- contribute {R$}/month to get there by {month} · At this pace you pass the goal before the target date 🎯 · The target date has already passed — adjust it to see the contribution needed.
- {R$}/month → arrives {month} · Goal already reached 🎉 · the goal isn't reached at this contribution — raise it or move the date
- Projected from the assumptions above ({rate}% p.a., with a ±{n} p.p. band). Past performance doesn't guarantee future results.
- Set a goal to see the projection. · Goal
- **Form:** Goal name · Emergency fund · Target amount (R$) · Fills in 6 × your average monthly expenses ({R$}/month). · Target date · Expected return (% p.a.) · Monthly contribution (R$) · Leave blank to use your recent average ({R$}/month over the last 6 months). · Save goal

### Settings
- Settings · Manage categories, budgets and backups.
- MONEY · The categories you log against, what you plan to spend, and how you pay.
- PREFERENCES · How the app looks, and when each reporting month begins.
- DATA · Everything lives on this computer — there's no cloud copy.
- Expense categories · Used when logging an expense. · Income categories · Used when logging income. · New category… · No categories yet.
- Categories needing attention · Add it back · Remove budget · (sentences in §7.1)
- Monthly budgets · Blank means no limit. · Add an expense category first. · Save limits
- Payment methods · Optional, shown when logging an expense. · No methods yet. · e.g. Debit Card
- Month start day · The day each month begins for totals, budgets and charts. Use 1 for normal calendar months. · Starts on day · of the month · Right now that means {month} runs {range}. · Save start day · Days 29–31 aren't available because they don't exist in every month — the boundary would drift in February and leave gaps between months.
- App color · Sets the accent used for buttons, the sidebar and highlights. · Green · Blue · Violet · Teal · Amber · Save color · Income and gains stay green and expenses stay red whichever color you pick — those mean money coming in or going out, not branding.
- Language · The language this app's own text is shown in. · English · Português · Save language · Your own text — category names, payment methods, entry and holding names — is never translated. Amounts stay in R$ either way.
- Backup & restore · Your data lives locally. Export a JSON copy or restore from one. · Export · Import · Restore default categories
- Import from CSV · (blurb in §7.3) · Choose a CSV file · Date column · Description column · Amount column · Income or expense · By sign (negative = expense) · All rows are expenses · All rows are income · File expenses under · File income under · Payment method · First rows, as they will be created · Import {n} entries · {n} rows skipped — no readable date or amount. · Imported {n} entries. · That file has no rows this can read.

### Default data a fresh install shows
- **Expense categories:** Groceries, Rent, Transport, Utilities, Dining Out, Entertainment, Health, Shopping, Other
- **Income categories:** Salary, Freelance, Investment, Gift, Other
- **Payment methods:** Debit Card, Credit Card, Cash, Bank Transfer, Other

---

*Portuguese:* every string above has a translation in the `pt` dictionary in `src/lib/i18n.ts`. Portuguese runs noticeably longer ("Categorias que precisam de atenção", "Estimativas por rendimento usam…"), so leave room in buttons, pills and table headers.
