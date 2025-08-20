/*
  Warnings:

  - A unique constraint covering the columns `[referrer_id,referred_id]` on the table `referral` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "referral_referrer_id_status_created_at_idx" ON "public"."referral"("referrer_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "referral_referrer_id_referred_id_key" ON "public"."referral"("referrer_id", "referred_id");
