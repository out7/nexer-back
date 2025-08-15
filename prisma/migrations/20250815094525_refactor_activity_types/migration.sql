/*
  Warnings:

  - The values [purchased,referral_bonus_accrued] on the enum `ActivityLogType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ActivityLogType_new" AS ENUM ('subscription_purchased', 'subscription_extended', 'subscription_expired', 'trial_activated', 'bonus_claimed', 'referral_bonus_added');
ALTER TABLE "public"."activity_log" ALTER COLUMN "type" TYPE "public"."ActivityLogType_new" USING ("type"::text::"public"."ActivityLogType_new");
ALTER TYPE "public"."ActivityLogType" RENAME TO "ActivityLogType_old";
ALTER TYPE "public"."ActivityLogType_new" RENAME TO "ActivityLogType";
DROP TYPE "public"."ActivityLogType_old";
COMMIT;
