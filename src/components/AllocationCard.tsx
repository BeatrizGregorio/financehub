import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CARD } from "@/lib/ui";
import { AllocationChart } from "./AllocationChart";
import type { AllocationSlice } from "@/lib/investments";
import type { Dict } from "@/lib/i18n";

export function AllocationCard({ data, t }: { data: AllocationSlice[]; t: Dict }) {
  return (
    <div className={`${CARD} p-5`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[17px] font-extrabold tracking-tight">{t.dashboard.allocation}</span>
        <Link
          href="/investments"
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-brand-text)]"
        >
          {t.nav.investments} <ArrowRight size={12} />
        </Link>
      </div>
      <AllocationChart data={data} />
    </div>
  );
}
