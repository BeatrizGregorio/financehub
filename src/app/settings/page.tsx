import { getBudgets, getCategories, getPaymentMethods } from "@/lib/data";
import { CategoryManager } from "./CategoryManager";
import { PaymentMethodManager } from "./PaymentMethodManager";
import { BudgetEditor } from "./BudgetEditor";
import { BackupPanel } from "./BackupPanel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [{ expense, income }, methods, budgets] = await Promise.all([
    getCategories(),
    getPaymentMethods(),
    getBudgets(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">Settings</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Manage categories, budgets and backups.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
        <CategoryManager
          type="expense"
          title="Expense categories"
          subtitle="Used when logging an expense."
          categories={expense}
        />
        <CategoryManager
          type="income"
          title="Income categories"
          subtitle="Used when logging income."
          categories={income}
        />
        <BudgetEditor categories={expense} budgets={budgets} />
        <PaymentMethodManager methods={methods} />
        <div className="md:col-span-2">
          <BackupPanel />
        </div>
      </div>
    </div>
  );
}
