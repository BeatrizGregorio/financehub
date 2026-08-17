import {
  getAccentColor,
  getBudgets,
  getCategories,
  getCycleStartDay,
  getLanguage,
  getPaymentMethods,
} from "@/lib/data";
import { CategoryManager } from "./CategoryManager";
import { PaymentMethodManager } from "./PaymentMethodManager";
import { BudgetEditor } from "./BudgetEditor";
import { BackupPanel } from "./BackupPanel";
import { CycleSettingsCard } from "./CycleSettingsCard";
import { AccentColorCard } from "./AccentColorCard";
import { LanguageCard } from "./LanguageCard";
import { dict } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * Settings is grouped into three headed sections rather than one flat grid of
 * cards. With eight cards at equal visual weight, "Language" read as being as
 * important as "Monthly budgets"; the headings give the page a hierarchy and
 * mean a new setting has an obvious home instead of being appended to the end.
 */
function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3.5">
      <div>
        <h2 className="font-mono text-[11px] font-bold tracking-[0.12em] text-[var(--color-muted-2)] uppercase">
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">{blurb}</p>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const [{ expense, income }, methods, budgets, cycleStartDay, accentColor, lang] =
    await Promise.all([
      getCategories(),
      getPaymentMethods(),
      getBudgets(),
      getCycleStartDay(),
      getAccentColor(),
      getLanguage(),
    ]);
  const t = dict(lang);

  return (
    <div className="flex flex-col gap-9">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">
          {t.settings.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{t.settings.subtitle}</p>
      </div>

      <Section title={t.settings.sectionMoney} blurb={t.settings.sectionMoneyBlurb}>
        <CategoryManager
          type="expense"
          title={t.settings.expenseCategories}
          subtitle={t.settings.expenseCategoriesBlurb}
          categories={expense}
        />
        <CategoryManager
          type="income"
          title={t.settings.incomeCategories}
          subtitle={t.settings.incomeCategoriesBlurb}
          categories={income}
        />
        <BudgetEditor categories={expense} budgets={budgets} />
        <PaymentMethodManager methods={methods} />
      </Section>

      <Section title={t.settings.sectionPreferences} blurb={t.settings.sectionPreferencesBlurb}>
        <CycleSettingsCard cycleStartDay={cycleStartDay} />
        {/* Colour and language are both "how it looks", so they sit side by
            side in the same row rather than being separated by the cycle card. */}
        <div className="flex flex-col gap-5">
          <AccentColorCard accentColor={accentColor} />
          <LanguageCard language={lang} />
        </div>
      </Section>

      <Section title={t.settings.sectionData} blurb={t.settings.sectionDataBlurb}>
        <div className="md:col-span-2">
          <BackupPanel />
        </div>
      </Section>
    </div>
  );
}
