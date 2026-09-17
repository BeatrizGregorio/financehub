-- Credit card bills. Additive: every existing payment method stays a plain
-- method until the owner sets one up as a card.
ALTER TABLE "PaymentMethod" ADD COLUMN "isCreditCard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PaymentMethod" ADD COLUMN "closingDay" INTEGER;
ALTER TABLE "PaymentMethod" ADD COLUMN "dueDay" INTEGER;

CREATE TABLE "CardPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentMethodId" TEXT NOT NULL,
    "billKey" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "fromAccountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CardPayment_paymentMethodId_billKey_idx" ON "CardPayment"("paymentMethodId", "billKey");
