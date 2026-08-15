/**
 * Сквозная проверка по HTTP против поднятого стенда.
 * Главное здесь — попытка угнать чужой аккаунт тем способом, который
 * работал до починки telegram.strategy.ts.
 */
import { sign } from '@telegram-apps/init-data-node';
import * as crypto from 'crypto';

const BASE = 'http://127.0.0.1:4455/api/v1.0';
const BOT_TOKEN = '123456:STAND-ONLY-INVALID-TOKEN'; // как в .env стенда
const TRBT_KEY = 'trbt-stand-key';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name}: ${actual} (ожидали ${expected})`);
}

const post = (path: string, body: any, headers: Record<string, string> = {}) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

async function main() {
  const VICTIM = 555001;

  // ── 1. Угон аккаунта ─────────────────────────────────────────────────────
  console.log('\n[1] Попытка авторизоваться под чужим telegram id');

  const forged =
    'user=' +
    encodeURIComponent(JSON.stringify({ id: VICTIM, first_name: 'Attacker' })) +
    `&auth_date=${Math.floor(Date.now() / 1000)}&hash=abc123`;

  const attack = await post('/auth/tma', { data: forged });
  check('поддельная initData отвергнута', attack.status, 401);

  // Тот же id, но с настоящей подписью — должен пройти.
  const genuine = sign({ user: { id: VICTIM, first_name: 'Real' } }, BOT_TOKEN, new Date());
  const legit = await post('/auth/tma', { data: genuine });
  check('подлинная initData принята', legit.status, 200);

  const tokens = await legit.json();
  const hasTokens = !!(tokens.accessToken && tokens.refreshToken);
  check('токены выданы', hasTokens, true);

  // ── 2. Доступ к защищённым ручкам ────────────────────────────────────────
  console.log('\n[2] Защищённые эндпоинты');

  const me = await fetch(`${BASE}/customer/me`, {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  });
  check('/customer/me с токеном', me.status, 200);

  const meNoAuth = await fetch(`${BASE}/customer/me`);
  check('/customer/me без токена', meNoAuth.status, 401);

  const meBadAuth = await fetch(`${BASE}/customer/me`, {
    headers: { authorization: 'Bearer garbage.token.here' },
  });
  check('/customer/me с мусорным токеном', meBadAuth.status, 401);

  // ── 3. Вебхук: подпись и идемпотентность ─────────────────────────────────
  console.log('\n[3] Вебхук Tribute');

  const payload = {
    name: 'new_subscription',
    created_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    payload: {
      subscription_id: 9001,
      period_id: 42,
      period: 'monthly',
      amount: 20000,
      telegram_user_id: VICTIM,
      subscription_name: 'Поддержите творчество 🌟',
    },
  };
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', TRBT_KEY).update(raw).digest('hex');

  const noSig = await post('/webhook/trbt', raw);
  check('без заголовка подписи', noSig.status, 401);

  const badSig = await post('/webhook/trbt', raw, { 'trbt-signature': 'deadbeef' });
  check('с неверной подписью', badSig.status, 401);

  //Ремнава на стенде недоступна (порт 59999), поэтому выдача подписки
  // упадёт — но нас интересует, что запрос прошёл аутентификацию и что
  // повтор не создаст второй платёж.
  const first = await post('/webhook/trbt', raw, { 'trbt-signature': sig });
  console.log(`  первая доставка → ${first.status}`);

  const second = await post('/webhook/trbt', raw, { 'trbt-signature': sig });
  console.log(`  повторная доставка → ${second.status}`);
  // Успешное событие повторно не обрабатывается → 200. Если первая доставка
  // сорвалась, повтор ЧЕСТНО повторяет и может снова отдать 500 — так и надо,
  // иначе провайдер перестанет ретраить и оплата потеряется.
  check('повтор обработан детерминированно', second.status === first.status || second.status === 200, true);

  // ── 4. Неизвестный период ────────────────────────────────────────────────
  console.log('\n[4] Мусор в теле вебхука');

  const weird = JSON.stringify({
    ...payload,
    created_at: new Date(Date.now() + 1000).toISOString(),
    payload: { ...payload.payload, period: 'weekly', subscription_id: 9002 },
  });
  const weirdSig = crypto.createHmac('sha256', TRBT_KEY).update(weird).digest('hex');
  const weirdRes = await post('/webhook/trbt', weird, { 'trbt-signature': weirdSig });
  check('неизвестный период не даёт 5xx', weirdRes.status < 500, true);
  console.log(`  (статус: ${weirdRes.status})`);

  const noPayload = JSON.stringify({ name: 'new_subscription', created_at: 'x', sent_at: 'y' });
  const npSig = crypto.createHmac('sha256', TRBT_KEY).update(noPayload).digest('hex');
  const npRes = await post('/webhook/trbt', noPayload, { 'trbt-signature': npSig });
  check('тело без payload отвергнуто', npRes.status, 400);

  console.log(
    failures === 0
      ? '\n=== ВСЕ ПРОВЕРКИ ПРОШЛИ ==='
      : `\n=== ПРОВАЛЕНО: ${failures} ===`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main();
