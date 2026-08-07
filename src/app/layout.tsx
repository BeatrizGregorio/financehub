import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { getCycleStartDay } from "@/lib/data";
import { currentCycleKey, cycleLabel, cycleRange } from "@/lib/format";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "FinanceHub",
  description: "A personal budget tracker.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cycleStartDay = await getCycleStartDay();
  const currentCycle = currentCycleKey(cycleStartDay);
  const { start, endExclusive } = cycleRange(currentCycle, cycleStartDay);
  const monthEntries = await prisma.entry.findMany({
    where: { date: { gte: start, lt: endExclusive } },
  });
  const income = monthEntries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
  const expense = monthEntries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <html lang="en" className={`${jakarta.variable} ${dmMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="relative h-screen w-full overflow-hidden bg-[var(--background)]">
          {/* Ambient background blobs */}
          <div
            className="pointer-events-none fixed -top-[15%] -left-[8%] z-0 h-[55vw] w-[55vw] rounded-full blur-[60px]"
            style={{ background: "radial-gradient(circle, rgba(12,158,87,0.12) 0%, transparent 65%)" }}
          />
          <div
            className="pointer-events-none fixed -right-[5%] -bottom-[10%] z-0 h-[45vw] w-[45vw] rounded-full blur-[60px]"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 65%)" }}
          />
          <div
            className="pointer-events-none fixed top-[35%] right-[18%] z-0 h-[28vw] w-[28vw] rounded-full blur-[50px]"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 65%)" }}
          />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-[1600px]">
            <Nav income={income} expense={expense} monthLabel={cycleLabel(currentCycle)} />
            <main className="min-w-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[1400px] px-6 py-6 sm:px-8 sm:py-8">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
