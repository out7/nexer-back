-- CreateTable
CREATE TABLE "public"."tariff" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "price_rub" INTEGER NOT NULL,
    "price_stars" INTEGER NOT NULL,
    "price_old_rub" INTEGER,
    "price_old_stars" INTEGER,
    "discount" INTEGER,
    "per_month" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tariff_code_key" ON "public"."tariff"("code");
