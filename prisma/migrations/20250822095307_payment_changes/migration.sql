/*
  Warnings:

  - The values [tribute] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `referral_bonus_processed_at` on the `payment` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PaymentMethod_new" AS ENUM ('telegram_stars', 'trbt');
ALTER TABLE "public"."payment" ALTER COLUMN "method" TYPE "public"."PaymentMethod_new" USING ("method"::text::"public"."PaymentMethod_new");
ALTER TYPE "public"."PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "public"."PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."payment" DROP COLUMN "referral_bonus_processed_at";
