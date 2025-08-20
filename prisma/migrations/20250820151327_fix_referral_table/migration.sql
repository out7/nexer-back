/*
  Warnings:

  - You are about to drop the column `referred_customer_id` on the `referral` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[referred_id]` on the table `referral` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `referred_id` to the `referral` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."referral" DROP CONSTRAINT "referral_referred_customer_id_fkey";

-- DropIndex
DROP INDEX "public"."referral_referred_customer_id_key";

-- AlterTable
ALTER TABLE "public"."referral" DROP COLUMN "referred_customer_id",
ADD COLUMN     "referred_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "referral_referred_id_key" ON "public"."referral"("referred_id");

-- AddForeignKey
ALTER TABLE "public"."referral" ADD CONSTRAINT "referral_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "public"."customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
