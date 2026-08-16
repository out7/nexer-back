/**
 * Проверка окружения на старте.
 *
 * Без неё отсутствующая переменная всплывает в момент использования:
 * REMNAWAVE_SQUAD_UUID, вынесенный из кода в конфиг, ронял не запуск, а
 * первую же оплату — сервис поднимался здоровым и падал на клиенте.
 * Лучше не стартовать вовсе, чем стартовать наполовину.
 */
const REQUIRED = [
  'DATABASE_URL',
  'ALLOWED_ORIGIN',
  'TELEGRAM_TOKEN',
  'TELEGRAM_INIT_DATA_EXPIRES_IN',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_SECRET',
  'JWT_REFRESH_EXPIRES_IN',
  'REMNAWAVE_PANEL_URL',
  'REMNAWAVE_API_TOKEN',
  'REMNAWAVE_SQUAD_UUID',
  // Домен страницы подписки. Ссылка собирается из него на каждом чтении, а не
  // хранится в базе: иначе переезд домена молча ломает выдачу у всех, кому
  // доступ выдали раньше (см. common/helpers/subscription-url.ts).
  'SUBSCRIPTION_BASE_URL',
  'TRBT_API_KEY',
  'REFERRAL_BONUS_DAYS',
] as const;

const POSITIVE_INTEGERS = [
  'TELEGRAM_INIT_DATA_EXPIRES_IN',
  'REFERRAL_BONUS_DAYS',
  'TRIAL_DURATION_DAYS',
] as const;

export function validateEnv(config: Record<string, unknown>) {
  const problems: string[] = [];

  for (const key of REQUIRED) {
    const value = config[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      problems.push(`${key}: не задана`);
    }
  }

  for (const key of POSITIVE_INTEGERS) {
    const raw = config[key];
    if (raw === undefined || String(raw).trim() === '') continue; // покрыто выше

    const parsed = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      problems.push(`${key}: ожидалось положительное число, получено "${raw}"`);
    }
  }

  for (const key of ['REMNAWAVE_PANEL_URL', 'SUBSCRIPTION_BASE_URL'] as const) {
    const value = config[key];
    if (value && !/^https?:\/\//i.test(String(value))) {
      problems.push(`${key}: ожидался абсолютный URL, получено "${value}"`);
    }
  }

  if (problems.length) {
    throw new Error(
      'Некорректное окружение:\n  - ' + problems.join('\n  - '),
    );
  }

  return config;
}
