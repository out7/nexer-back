/**
 * Сборка ссылки на подписку. Приложению и базе не нужна — чистые функции.
 *
 *   bun run test/subscription-url.test.ts
 *
 * Появилась после боевого случая: у панели сменился домен, а в базе лежали
 * готовые URL со старым доменом, и «Добавить подписку» в Mini App вело на
 * мёртвый nexervpn.run у всех, кому доступ выдали до переезда.
 */
import assert from 'node:assert';
import {
  buildSubscriptionUrl,
  shortUuidFromUrl,
} from '../src/common/helpers/subscription-url';

const cases: Array<[string, () => void]> = [
  [
    'домен берётся из окружения, а не из сохранённой ссылки',
    () => {
      process.env.SUBSCRIPTION_BASE_URL = 'https://sub.nexervpn.com';
      assert.equal(
        buildSubscriptionUrl('rA8F5bqj9hnwHS0-', 'https://sub.nexervpn.run/rA8F5bqj9hnwHS0-'),
        'https://sub.nexervpn.com/rA8F5bqj9hnwHS0-',
      );
    },
  ],
  [
    'строки без short_uuid чинятся из старой ссылки',
    () => {
      process.env.SUBSCRIPTION_BASE_URL = 'https://sub.nexervpn.com';
      assert.equal(
        buildSubscriptionUrl(null, 'https://sub.nexervpn.run/rA8F5bqj9hnwHS0-'),
        'https://sub.nexervpn.com/rA8F5bqj9hnwHS0-',
      );
    },
  ],
  [
    'хвостовой слэш в базовом URL не удваивается',
    () => {
      process.env.SUBSCRIPTION_BASE_URL = 'https://sub.nexervpn.com/';
      assert.equal(
        buildSubscriptionUrl('abc', null),
        'https://sub.nexervpn.com/abc',
      );
    },
  ],
  [
    'подписки нет — null, а не ссылка в никуда',
    () => {
      process.env.SUBSCRIPTION_BASE_URL = 'https://sub.nexervpn.com';
      assert.equal(buildSubscriptionUrl(null, null), null);
    },
  ],
  [
    'без переменной окружения отдаём то, что было сохранено',
    () => {
      delete process.env.SUBSCRIPTION_BASE_URL;
      assert.equal(
        buildSubscriptionUrl('abc', 'https://sub.nexervpn.run/abc'),
        'https://sub.nexervpn.run/abc',
      );
    },
  ],
  [
    'панель с префиксом пути: shortUuid — последний сегмент',
    () => {
      assert.equal(shortUuidFromUrl('https://sub.example.com/api/sub/xyz'), 'xyz');
      assert.equal(shortUuidFromUrl('https://sub.example.com/xyz/'), 'xyz');
      assert.equal(shortUuidFromUrl('https://sub.example.com'), null);
      assert.equal(shortUuidFromUrl(null), null);
    },
  ],
];

let failed = 0;
for (const [name, run] of cases) {
  try {
    run();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
  }
}

console.log(failed ? `\n${failed} из ${cases.length} упало` : `\nвсе ${cases.length} прошли`);
process.exit(failed ? 1 : 0);
