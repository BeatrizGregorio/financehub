import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { methodIconName } from "@/lib/categories";
import { CARD } from "@/lib/ui";
import { Icon } from "./CategoryIcon";

const TILE_COLORS = ["#0c9e57", "#3b82f6", "#a855f7", "#f59e0b"];

export function PaymentMethodsCard({ methods }: { methods: { id: string; name: string }[] }) {
  const tiles = methods.slice(0, 4);

  return (
    <div className={`${CARD} flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:gap-5`}>
      <div className="min-w-0 flex-1">
        <h3 className="mb-1.5 text-[17px] font-extrabold tracking-tight">Payment methods</h3>
        <p className="mb-3 text-[12.5px] leading-snug text-[var(--color-muted)]">
          Track which card or account each expense is paid from.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--color-meadow)]"
        >
          Manage methods <ArrowRight size={14} />
        </Link>
      </div>
      {tiles.length > 0 && (
        <div className="grid shrink-0 grid-cols-2 gap-2.5">
          {tiles.map((m, i) => (
            <span
              key={m.id}
              title={m.name}
              className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[var(--color-inset-2)] shadow-[inset_0_0_0_1px_var(--color-border)]"
              style={{ color: TILE_COLORS[i % TILE_COLORS.length] }}
            >
              <Icon name={methodIconName(m.name)} size={22} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
