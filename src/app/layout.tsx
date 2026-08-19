import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import {
  getAccentColor,
  getCycleStartDay,
  getLanguage,
  getLicenseStatus,
  hasAnyData,
} from "@/lib/data";
import { LicenseGate } from "@/components/LicenseGate";
import { TrialBanner } from "@/components/TrialBanner";
import { LanguageProvider } from "@/components/LanguageProvider";
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
  const accentColor = await getAccentColor();
  const language = await getLanguage();
  const license = await getLicenseStatus();
  // Only asked when the gate will actually render — see hasAnyData().
  const showExport = license.state === "expired" ? await hasAnyData() : false;
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
    // data-accent selects the brand palette in globals.css. Set here, on the
    // server, so the chosen color is in the first painted frame — a client-side
    // swap would show a flash of the default green on every page load.
    <html
      lang={language === "pt" ? "pt-BR" : "en"}
      data-accent={accentColor}
      className={`${jakarta.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="relative h-screen w-full overflow-hidden bg-[var(--background)]">
          {/* Ambient background blobs */}
          <div
            className="pointer-events-none fixed -top-[15%] -left-[8%] z-0 h-[55vw] w-[55vw] rounded-full blur-[60px]"
            style={{ background: "radial-gradient(circle, rgb(var(--brand-rgb) / 0.12) 0%, transparent 65%)" }}
          />
          <div
            className="pointer-events-none fixed -right-[5%] -bottom-[10%] z-0 h-[45vw] w-[45vw] rounded-full blur-[60px]"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 65%)" }}
          />
          <div
            className="pointer-events-none fixed top-[35%] right-[18%] z-0 h-[28vw] w-[28vw] rounded-full blur-[50px]"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 65%)" }}
          />

          <LanguageProvider lang={language}>
            <div className="relative z-10 mx-auto flex h-full w-full max-w-[1600px]">
              <Nav
                income={income}
                expense={expense}
                monthLabel={cycleLabel(currentCycle, language)}
              />
              <main className="min-w-0 flex-1 overflow-y-auto">
                {/* The gate replaces the page content but keeps the chrome, so
                    an expired copy still looks like the app the buyer paid for
                    rather than an error screen. */}
                {license.state === "expired" ? (
                  <LicenseGate showExport={showExport} />
                ) : (
                  <div className="mx-auto max-w-[1400px] px-6 py-6 sm:px-8 sm:py-8">
                    {license.state === "trial" && <TrialBanner daysLeft={license.daysLeft} />}
                    {children}
                  </div>
                )}
              </main>
            </div>
          </LanguageProvider>
        </div>
      </body>
    </html>
  );
}
