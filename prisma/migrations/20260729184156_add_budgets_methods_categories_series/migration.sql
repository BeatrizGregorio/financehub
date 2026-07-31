-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "groupId" TEXT;
ALTER TABLE "Entry" ADD COLUMN "installmentNum" INTEGER;
ALTER TABLE "Entry" ADD COLUMN "installmentTotal" INTEGER;
ALTER TABLE "Entry" ADD COLUMN "method" TEXT;
ALTER TABLE "Entry" ADD COLUMN "seriesType" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "limit" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_type_key" ON "Category"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_category_key" ON "Budget"("category");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_name_key" ON "PaymentMethod"("name");
