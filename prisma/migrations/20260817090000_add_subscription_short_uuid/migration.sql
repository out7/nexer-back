-- AlterTable
ALTER TABLE "public"."customer_subscription" ADD COLUMN "short_uuid" TEXT;

-- Бэкфилл: у выданных раньше подписок shortUuid есть — он последний сегмент
-- пути в сохранённой ссылке. Домен из этой ссылки сознательно выбрасывается:
-- ровно он и протухал при переезде панели на другой домен.
UPDATE "public"."customer_subscription"
   SET "short_uuid" = regexp_replace("subscription_url", '^.*/([^/?#]+)/*$', '\1')
 WHERE "subscription_url" ~ '^https?://[^/]+/[^/?#]+'
   AND "short_uuid" IS NULL;
