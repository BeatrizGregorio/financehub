import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getAccentColor, getCycleStartDay, getLanguage, getReferenceRates } from "@/lib/data";
import { clampCycleStartDay } from "@/lib/format";
import { clampAccentColor } from "@/lib/theme";
import { clampLanguage } from "@/lib/i18n";

/**
 * Everything about the backup file lives here: building it, restoring it, and
 * writing dated copies to disk automatically.
 *
 * It used to be split between the export Route Handler and the import server
 * action. Automatic backups need the same builder from a third place, and each
 * new model has to be added to both directions at once — having one file for
 * that is what stops export and import drifting apart.
 *
 * Server-only: this touches the filesystem.
 */

// ─── File shape ─────────────────────────────────────────────────────────────

export type BackupEntry = {
  name?: string;
  amount: number;
  date: string;
  type: string;
  category: string;
  note?: string | null;
  method?: string | null;
  groupId?: string | null;
  seriesType?: string | null;
  installmentNum?: number | null;
  installmentTotal?: number | null;
};

type BackupPricePoint = { date: string; price: number };
type BackupCouponPayment = { date: string; amount: number };
type BackupTransaction = { date: string; kind: string; amount: number; quantity?: number | null };

type BackupInvestment = {
  name: string;
  type?: string;
  subtype?: string | null;
  indexador?: string | null;
  annualRate?: number | null;
  spread?: number | null;
  adminFee?: number | null;
  perfFee?: number | null;
  amountInvested?: number;
  startDate?: string;
  maturityDate?: string | null;
  symbol?: string | null;
  quantity?: number | null;
  purchaseRef?: number | null;
  expectedReturn?: number | null;
  corretagem?: number | null;
  institution?: string | null;
  notes?: string | null;
  prices?: BackupPricePoint[];
  coupons?: BackupCouponPayment[];
  transactions?: BackupTransaction[];
};

export type Backup = {
  app?: string;
  version?: number;
  entries?: BackupEntry[];
  categories?: { name: string; type: string }[];
  budgets?: { category: string; limit: number }[];
  paymentMethods?: { name: string }[];
  investments?: BackupInvestment[];
  referenceRates?: { cdi: number; selic: number; ipca: number };
  settings?: { cycleStartDay?: number; accentColor?: string; language?: string };
};

// ─── Build ──────────────────────────────────────────────────────────────────

export async function buildBackup() {
  const [entries, categories, budgets, paymentMethods, investments, rates, cycleStartDay, accentColor, language] =
    await Promise.all([
      prisma.entry.findMany(),
      prisma.category.findMany(),
      prisma.budget.findMany(),
      prisma.paymentMethod.findMany(),
      prisma.investment.findMany({ include: { prices: true, coupons: true, transactions: true } }),
      getReferenceRates(),
      getCycleStartDay(),
      getAccentColor(),
      getLanguage(),
    ]);

  return {
    app: "FinanceHub",
    version: 3,
    exportedAt: new Date().toISOString(),
    entries,
    categories: categories.map((c) => ({ name: c.name, type: c.type })),
    budgets: budgets.map((b) => ({ category: b.category, limit: b.limit })),
    paymentMethods: paymentMethods.map((m) => ({ name: m.name })),
    investments: investments.map((inv) => ({
      name: inv.name,
      type: inv.type,
      subtype: inv.subtype,
      indexador: inv.indexador,
      annualRate: inv.annualRate,
      spread: inv.spread,
      adminFee: inv.adminFee,
      perfFee: inv.perfFee,
      amountInvested: inv.amountInvested,
      startDate: inv.startDate,
      maturityDate: inv.maturityDate,
      symbol: inv.symbol,
      quantity: inv.quantity,
      purchaseRef: inv.purchaseRef,
      expectedReturn: inv.expectedReturn,
      corretagem: inv.corretagem,
      institution: inv.institution,
      notes: inv.notes,
      prices: inv.prices.map((p) => ({ date: p.date, price: p.price })),
      coupons: inv.coupons.map((c) => ({ date: c.date, amount: c.amount })),
      transactions: inv.transactions.map((tx) => ({
        date: tx.date,
        kind: tx.kind,
        amount: tx.amount,
        quantity: tx.quantity,
      })),
    })),
    referenceRates: { cdi: rates.cdi, selic: rates.selic, ipca: rates.ipca },
    // Additive keys stay `version: 3`: an older backup without them simply
    // leaves the current value alone on import.
    settings: { cycleStartDay, accentColor, language },
  };
}

// ─── Restore ────────────────────────────────────────────────────────────────

/** Returns an error message, or null when the object is restorable. */
export function validateBackup(backup: unknown): string | null {
  const b = backup as Backup | null;
  if (!b || b.app !== "FinanceHub" || !Array.isArray(b.entries)) {
    return "That doesn't look like a FinanceHub backup file.";
  }
  return null;
}

/**
 * Replace **all** data with the backup's contents. Destructive by design — the
 * caller takes a safety copy first (see writeBackupFile("pre-import")).
 */
export async function restoreBackup(backup: Backup) {
  // NOTE: `License` is deliberately absent from this wipe, and from the backup
  // export. A backup is for moving the owner's own data between machines;
  // carrying the licence inside it would make "send me your backup file" a way
  // to hand someone a paid copy, and wiping it here would deactivate the app
  // every time someone restored a backup.
  await prisma.entry.deleteMany();
  await prisma.category.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.paymentMethod.deleteMany();
  // Children first: SQLite only enforces ON DELETE CASCADE when foreign key
  // checks are on for the connection, so don't rely on it.
  await prisma.pricePoint.deleteMany();
  await prisma.couponPayment.deleteMany();
  await prisma.investmentTransaction.deleteMany();
  await prisma.investment.deleteMany();

  if (backup.categories?.length) {
    await prisma.category.createMany({
      data: backup.categories.map((c) => ({ name: c.name, type: c.type })),
    });
  }
  if (backup.paymentMethods?.length) {
    await prisma.paymentMethod.createMany({
      data: backup.paymentMethods.map((m) => ({ name: m.name })),
    });
  }
  if (backup.budgets?.length) {
    await prisma.budget.createMany({
      data: backup.budgets.map((b) => ({ category: b.category, limit: b.limit })),
    });
  }
  if (backup.entries?.length) {
    await prisma.entry.createMany({
      data: backup.entries.map((e) => ({
        name: e.name?.trim() || e.category,
        amount: e.amount,
        date: new Date(e.date),
        type: e.type,
        category: e.category,
        note: e.note ?? null,
        method: e.method ?? null,
        groupId: e.groupId ?? null,
        seriesType: e.seriesType ?? null,
        installmentNum: e.installmentNum ?? null,
        installmentTotal: e.installmentTotal ?? null,
      })),
    });
  }

  // Only restore investments that match the current (V1.7) schema shape — an
  // older backup's assetClass/quantity/avgCost model has no sensible automatic
  // mapping, so those are skipped rather than guessed.
  const restorable = (backup.investments ?? []).filter(
    (inv): inv is BackupInvestment & { type: string; amountInvested: number; startDate: string } =>
      Boolean(inv.type && inv.amountInvested != null && inv.startDate),
  );

  for (const inv of restorable) {
    await prisma.investment.create({
      data: {
        name: inv.name,
        type: inv.type,
        subtype: inv.subtype ?? null,
        indexador: inv.indexador ?? null,
        annualRate: inv.annualRate ?? null,
        spread: inv.spread ?? null,
        adminFee: inv.adminFee ?? null,
        perfFee: inv.perfFee ?? null,
        amountInvested: inv.amountInvested,
        startDate: new Date(inv.startDate),
        maturityDate: inv.maturityDate ? new Date(inv.maturityDate) : null,
        symbol: inv.symbol ?? null,
        quantity: inv.quantity ?? null,
        purchaseRef: inv.purchaseRef ?? null,
        expectedReturn: inv.expectedReturn ?? null,
        corretagem: inv.corretagem ?? null,
        institution: inv.institution ?? null,
        notes: inv.notes ?? null,
        prices: inv.prices?.length
          ? { create: inv.prices.map((p) => ({ date: new Date(p.date), price: p.price })) }
          : undefined,
        transactions: inv.transactions?.length
          ? {
              create: inv.transactions.map((tx) => ({
                date: new Date(tx.date),
                kind: tx.kind === "sell" ? "sell" : "buy",
                amount: tx.amount,
                quantity: tx.quantity ?? null,
              })),
            }
          : undefined,
        coupons: inv.coupons?.length
          ? { create: inv.coupons.map((c) => ({ date: new Date(c.date), amount: c.amount })) }
          : undefined,
      },
    });
  }

  if (backup.referenceRates) {
    await prisma.referenceRates.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...backup.referenceRates },
      update: backup.referenceRates,
    });
  }

  // Absent settings mean "leave the current value alone", not "reset".
  const s = backup.settings;
  const settingsUpdate: { cycleStartDay?: number; accentColor?: string; language?: string } = {};
  if (s?.cycleStartDay != null) settingsUpdate.cycleStartDay = clampCycleStartDay(s.cycleStartDay);
  if (s?.accentColor != null) settingsUpdate.accentColor = clampAccentColor(s.accentColor);
  if (s?.language != null) settingsUpdate.language = clampLanguage(s.language);
  if (Object.keys(settingsUpdate).length) {
    await prisma.appSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...settingsUpdate },
      update: settingsUpdate,
    });
  }
}

// ─── Automatic backups on disk ──────────────────────────────────────────────

export const AUTO_BACKUP_KEEP_DEFAULT = 14;
export const AUTO_BACKUP_KEEP_MAX = 365;

/** Only files this app wrote are ever listed or pruned — never anything else in the folder. */
const OWN_FILE = /^financehub-(auto|manual|pre-import)-\d{4}-\d{2}-\d{2}_\d{6}\.json$/;

export type BackupReason = "auto" | "manual" | "pre-import";

/**
 * The SQLite file's location, from the same DATABASE_URL the Prisma client
 * uses. In the desktop app that's the per-user data folder; in `npm run dev`
 * it's the project folder. Either way, backups default to a sibling folder.
 */
function databaseFilePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./financehub.db";
  return path.resolve(url.replace(/^file:/, ""));
}

export function defaultBackupDir(): string {
  return path.join(path.dirname(databaseFilePath()), "backups");
}

export async function getBackupSettings() {
  const s = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return {
    enabled: s?.autoBackupEnabled ?? true,
    dir: s?.autoBackupDir?.trim() || defaultBackupDir(),
    customDir: s?.autoBackupDir?.trim() || null,
    keep: Math.min(AUTO_BACKUP_KEEP_MAX, Math.max(1, s?.autoBackupKeep ?? AUTO_BACKUP_KEEP_DEFAULT)),
    lastAt: s?.lastAutoBackupAt ?? null,
  };
}

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export type BackupFile = { name: string; size: number; modifiedAt: Date };

export function listBackupFiles(dir: string): BackupFile[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((name) => OWN_FILE.test(name))
      .map((name) => {
        const st = fs.statSync(path.join(dir, name));
        return { name, size: st.size, modifiedAt: st.mtime };
      })
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  } catch {
    return [];
  }
}

/**
 * Write one dated backup file and prune old ones beyond the keep count.
 * Throws on a filesystem error so callers that *asked* for a backup can say
 * so; the automatic path catches it.
 */
export async function writeBackupFile(reason: BackupReason, dirOverride?: string): Promise<string> {
  const settings = await getBackupSettings();
  const dir = dirOverride ?? settings.dir;
  fs.mkdirSync(dir, { recursive: true });

  const backup = await buildBackup();
  const now = new Date();
  // Seconds in the name keep two backups in the same minute (a manual backup
  // straight before an import, say) from overwriting each other.
  const file = path.join(dir, `financehub-${reason}-${stamp(now)}.json`);
  // Write to a temp name then rename, so a crash mid-write can never leave a
  // truncated file that looks like a valid backup.
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(backup, null, 2));
  fs.renameSync(tmp, file);

  for (const old of listBackupFiles(dir).slice(settings.keep)) {
    try {
      fs.unlinkSync(path.join(dir, old.name));
    } catch {
      // A file we can't delete is not worth failing a backup over.
    }
  }

  // A pre-import safety copy captures the state *before* a change, so it must
  // not count as today's backup — otherwise the post-import data wouldn't be
  // backed up until tomorrow.
  if (reason !== "pre-import") {
    await prisma.appSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", lastAutoBackupAt: now },
      update: { lastAutoBackupAt: now },
    });
  }
  return file;
}

let inFlight: Promise<void> | null = null;

/**
 * Back up once per calendar day, on the first page load of that day.
 *
 * Called from the root layout. Never throws and never blocks a render on
 * failure — a backup problem must not take the app down with it. Skips an
 * empty database (nothing worth protecting, and it would fill the folder with
 * identical empty files on a fresh install), and skips `next build`, which
 * renders the layout at build time with no reason to write anything.
 */
export async function maybeAutoBackup(): Promise<void> {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const settings = await getBackupSettings();
      if (!settings.enabled) return;
      const now = new Date();
      if (settings.lastAt && settings.lastAt.toDateString() === now.toDateString()) return;

      const [entries, investments] = await Promise.all([
        prisma.entry.count(),
        prisma.investment.count(),
      ]);
      if (entries + investments === 0) return;

      await writeBackupFile("auto");
    } catch (err) {
      console.error("[auto-backup] failed:", err);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * A safety copy right before something destructive (restore, CSV import,
 * resetting categories). Best-effort: if it fails the operation still runs,
 * because refusing to restore a backup *because* backing up failed would be
 * the more harmful outcome. Respects the on/off setting.
 */
export async function safetyBackup(): Promise<void> {
  try {
    const settings = await getBackupSettings();
    if (!settings.enabled) return;
    const [entries, investments] = await Promise.all([prisma.entry.count(), prisma.investment.count()]);
    if (entries + investments === 0) return;
    await writeBackupFile("pre-import");
  } catch (err) {
    console.error("[safety-backup] failed:", err);
  }
}
