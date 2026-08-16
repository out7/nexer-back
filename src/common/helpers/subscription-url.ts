/**
 * Ссылка на подписку собирается на чтении, а не хранится готовой.
 *
 * Раньше в customer_subscription лежал URL целиком — ровно тот, что вернула
 * панель в момент выдачи доступа. Переезд панели на nexervpn.com этих строк
 * не касался: домен протух у всех, кому доступ выдали раньше, а чинился
 * только следующим продлением (единственное место, где колонка пишется).
 *
 * Теперь в базе живёт shortUuid — он переезды домена переживает, — а домен
 * приходит из SUBSCRIPTION_BASE_URL. Смена домена становится правкой .env,
 * а не UPDATE по базе.
 */

/**
 * Строки, выданные до появления short_uuid: последний сегмент пути и есть
 * shortUuid. Работает и для панелей с префиксом (`/api/sub/<uuid>`).
 */
export function shortUuidFromUrl(url?: string | null): string | null {
  if (!url) return null;

  const path = url.trim().split('#')[0].split('?')[0];
  const segments = path
    .replace(/^https?:\/\/[^/]+/i, '')
    .split('/')
    .filter(Boolean);

  return segments.length ? segments[segments.length - 1] : null;
}

export function buildSubscriptionUrl(
  shortUuid?: string | null,
  storedUrl?: string | null,
): string | null {
  const uuid = shortUuid?.trim() || shortUuidFromUrl(storedUrl);
  if (!uuid) return storedUrl ?? null;

  // Без переменной сервис не стартует (см. config/env.validation.ts), но
  // чтение профиля не должно падать даже в таком мире — отдаём что было.
  const base = (process.env.SUBSCRIPTION_BASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '');
  if (!base) return storedUrl ?? null;

  return `${base}/${uuid}`;
}
