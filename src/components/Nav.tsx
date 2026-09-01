"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListOrdered, TrendingUp, Settings, ChartPie } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useT } from "@/components/LanguageProvider";

// Labels come from the dictionary at render time, so the array holds the key
// rather than the text.
const LINKS = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/entries", key: "entries", icon: ListOrdered },
  { href: "/investments", key: "investments", icon: TrendingUp },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function Nav({
  income,
  expense,
  monthLabel,
}: {
  income: number;
  expense: number;
  monthLabel: string;
}) {
  const pathname = usePathname();
  const { t } = useT();
  const [collapsed, setCollapsed] = useState(false);

  // Start collapsed on narrow viewports (phone/small-window widths) — the
  // expanded 240px sidebar plus content otherwise has nowhere near enough
  // room and everything overflows. Only checked once on mount, not on
  // resize, so a manual expand/collapse via the toggle always wins after
  // that — this only picks a sane starting point. Has to be an effect, not a
  // lazy useState initializer: window.innerWidth doesn't exist during SSR, so
  // computing it at initial-state time would make the client's first render
  // disagree with the server-rendered HTML and trigger a hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.innerWidth < 768) setCollapsed(true);
  }, []);

  return (
    <aside
      className="flex h-full shrink-0 flex-col gap-2 overflow-hidden border-r border-black/[0.07] bg-[var(--color-nav)] py-6 backdrop-blur-2xl transition-[width,padding] duration-300"
      style={{ width: collapsed ? 72 : 240, paddingLeft: collapsed ? 12 : 16, paddingRight: collapsed ? 12 : 16 }}
    >
      <div className={`mb-6 flex items-center ${collapsed ? "justify-center px-0" : "gap-2.5 px-2"}`}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-[var(--shadow-brand-logo)] transition-transform duration-150 hover:scale-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          <ChartPie size={18} />
        </button>
        {!collapsed && (
          <span className="overflow-hidden text-[17px] font-extrabold tracking-tight whitespace-nowrap text-[var(--color-ink)]">
            financehub
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {LINKS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href;
          const label = t.nav[key];
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="flex w-full items-center rounded-xl text-[13.5px] transition-all duration-150"
              style={{
                gap: collapsed ? 0 : 12,
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "var(--color-brand-tint)" : "transparent",
                color: active ? "var(--color-brand-text)" : "var(--color-muted-2)",
                fontWeight: active ? 600 : 500,
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.3 : 1.8} />
              {!collapsed && <span className="overflow-hidden whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className="rounded-xl border border-black/[0.06] bg-black/[0.03] px-3 py-3">
          <p className="mb-1 font-mono text-[10.5px] tracking-wide text-[var(--color-muted-2)] uppercase">
            {t.nav.currentMonth}
          </p>
          <p className="text-sm font-semibold text-[var(--color-ink)]">{monthLabel}</p>
          <div className="mt-2 flex gap-3">
            <div>
              <p className="font-mono text-[9.5px] text-[var(--color-muted-2)]">{t.nav.in}</p>
              <p className="text-xs font-semibold text-[var(--color-positive-text)]">{formatCurrency(income)}</p>
            </div>
            <div className="w-px bg-black/10" />
            <div>
              <p className="font-mono text-[9.5px] text-[var(--color-muted-2)]">{t.nav.out}</p>
              <p className="text-xs font-semibold text-[var(--color-rust-text)]">{formatCurrency(expense)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 pb-1">
          <div
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--color-brand)" }}
            title={`${monthLabel} — ${t.nav.net} ${formatCurrency(income - expense)}`}
          />
        </div>
      )}
    </aside>
  );
}
