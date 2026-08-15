-- CreateEnum
CREATE TYPE "public"."WebhookProvider" AS ENUM ('trbt');

-- CreateEnum
CREATE TYPE "public"."WebhookEventStatus" AS ENUM ('processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "public"."webhook_event" (
    "id" TEXT NOT NULL,
    "provider" "public"."WebhookProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "status" "public"."WebhookEventStatus" NOT NULL DEFAULT 'processing',
    "payment_id" TEXT,
    "last_error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_event_provider_external_id_key" ON "public"."webhook_event"("provider", "external_id");
