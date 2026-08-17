import { categoryColor, categoryIconName } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { CARD } from "@/lib/ui";
import { Icon } from "./CategoryIcon";
import type { Dict } from "@/lib/i18n";

type RecentEntry = {
  id: string;
  name: string;
  amount: number;
  date: Date;
  type: string;
  category: string;
  note: string | null;
  method: string | null;
};

export function RecentEntriesCard({ entries, t }: { entries: RecentEntry[]; t: Dict }) {
  const recent = [...entries].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  return (
    <div className={`${CARD} p-[18px]`}>
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[17px] font-extrabold tracking-tight">{t.dashboard.recent}</span>
        <span className="rounded-full bg-[var(--color-brand-tint)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-brand)]">
          {entries.length}
        </span>
      </div>

      {recent.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--color-muted-2)]">{t.dashboard.noEntriesYet}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {recent.map((t) => (
            <div key={t.id} className="flex items-center gap-[11px] py-2">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white"
                style={{ backgroundColor: categoryColor(t.category) }}
              >
                <Icon name={categoryIconName(t.category)} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold">{t.name}</div>
                <div className="truncate text-[11px] text-[var(--color-muted-2)]">
                  {t.category}
                  {t.method ? ` · ${t.method}` : ""}
                </div>
              </div>
              <span
                className="font-mono text-[12.5px] font-medium"
                style={{ color: t.type === "income" ? "var(--color-positive)" : "var(--color-ink)" }}
              >
                {t.type === "income" ? "+" : "−"}
                {formatCurrency(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
