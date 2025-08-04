-- CreateEnum
CREATE TYPE "public"."ActivityLogType" AS ENUM ('purchased', 'subscription_extended', 'bonus_claimed', 'trial_started', 'referral_bonus_added');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('active', 'expired', 'none');

-- CreateEnum
CREATE TYPE "public"."SubscriptionSource" AS ENUM ('paid', 'bonus', 'trial');

-- CreateEnum
CREATE TYPE "public"."PaymentCurrency" AS ENUM ('stars', 'rub', 'usd');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('telegram_stars', 'tribute');

-- CreateEnum
CREATE TYPE "public"."ReferralStatus" AS ENUM ('inactive', 'trial', 'purchased');

-- CreateTable
CREATE TABLE "public"."activity_log" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "public"."ActivityLogType" NOT NULL,
    "meta" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_subscription" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'none',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_via" "public"."SubscriptionSource",
    "subscription_url" TEXT,
    "trial_activated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer" (
    "id" TEXT NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "username" TEXT,
    "language" CHAR(2) NOT NULL,
    "refresh_token" TEXT,
    "referred_by_id" TEXT,
    "unclaimed_bonus_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "public"."PaymentCurrency" NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "referrer_id" TEXT,
    "referral_bonus_days" INTEGER,
    "referral_bonus_processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."referral" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referred_customer_id" TEXT NOT NULL,
    "status" "public"."ReferralStatus" NOT NULL DEFAULT 'inactive',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_subscription_customer_id_key" ON "public"."customer_subscription"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_telegram_id_key" ON "public"."customer"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_referred_customer_id_key" ON "public"."referral"("referred_customer_id");

-- AddForeignKey
ALTER TABLE "public"."activity_log" ADD CONSTRAINT "activity_log_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_subscription" ADD CONSTRAINT "customer_subscription_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer" ADD CONSTRAINT "customer_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "public"."customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment" ADD CONSTRAINT "payment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment" ADD CONSTRAINT "payment_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referral" ADD CONSTRAINT "referral_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referral" ADD CONSTRAINT "referral_referred_customer_id_fkey" FOREIGN KEY ("referred_customer_id") REFERENCES "public"."customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
