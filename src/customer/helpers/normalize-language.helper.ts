/**
 * Колонка language — CHAR(2), а Telegram присылает и составные коды:
 * `pt-br`, `zh-hans`. Такие значения роняли вставку с
 * «value too long for type character(2)», то есть пользователь с такой
 * локалью просто не мог зарегистрироваться.
 *
 * Берём базовый языковой субтег — ровно то, для чего поле и заведено.
 */
export function normalizeLanguage(
  language: string | null | undefined,
  fallback = 'ru',
): string {
  const base = language?.trim().toLowerCase().split(/[-_]/)[0];

  return base && /^[a-z]{2}$/.test(base) ? base : fallback;
}
