import { prisma } from "@/lib/db";
import { getCardContext } from "@/lib/data";
import { cardBills, cardDebt } from "@/lib/cards";
import { CardsClient } from "./CardsClient";

export const dynamic = "force-dynamic";

/**
 * Words that mean "I paid my card bill" in the owner's own entries. With cards
 * set up, an expense like that double-counts every purchase on the bill, so
 * the page points them out — it never changes them.
 */
const BILL_PAYMENT_WORDS = /fatura|credit card bill|card bill|pagamento (do |de )?cart/i;

export default async function CardsPage() {
  const [{ cards, payments }, methods, accounts, entries] = await Promise.all([
    getCardContext(),
    prisma.paymentMethod.findMany({ orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.entry.findMany({
      where: { type: "expense" },
      select: { id: true, amount: true, date: true, type: true, method: true, name: true, category: true },
    }),
  ]);

  const today = new Date();
  const cardViews = cards.map((card) => ({
    ...card,
    bills: cardBills(card, entries, payments, today),
    payments: payments
      .filter((p) => p.paymentMethodId === card.id)
      .sort((a, b) => b.date.getTime() - a.date.getTime()),
  }));

  const cardNames = new Set(cards.map((c) => c.name));
  const suspicious = cards.length
    ? entries.filter(
        (e) => !(e.method && cardNames.has(e.method)) && (BILL_PAYMENT_WORDS.test(e.name) || BILL_PAYMENT_WORDS.test(e.category)),
      )
    : [];

  return (
    <CardsClient
      cards={cardViews}
      debt={cardDebt(cards, entries, payments, today)}
      methods={methods.map((m) => ({ id: m.id, name: m.name, isCreditCard: m.isCreditCard }))}
      accounts={accounts}
      doubleCount={{ count: suspicious.length, total: suspicious.reduce((s, e) => s + e.amount, 0) }}
    />
  );
}
