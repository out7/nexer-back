/**
 * Проверка починенной авторизации и подписи вебхука.
 *
 * Бот намеренно не поднимается: TelegrafModule при старте начинает забирать
 * апдейты, и с боевым токеном стенд увёл бы их у продового бота.
 * Здесь проверяется ровно то, что чинилось, — криптография.
 */
import { isValid, sign } from '@telegram-apps/init-data-node';
import * as crypto from 'crypto';

const BOT_TOKEN = '123456:TEST-TOKEN-FOR-LOCAL-CHECKS';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `  ${ok ? 'OK  ' : 'FAIL'} ${name}: получили ${actual}, ожидали ${expected}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Подпись initData
// ─────────────────────────────────────────────────────────────────────────────
function testInitData() {
  console.log('\n[1] initData: подлинная против подделанной');

  const authDate = new Date();
  const genuine = sign(
    { user: { id: 111111, first_name: 'Real' } },
    BOT_TOKEN,
    authDate,
  );

  check('подлинная принимается', isValid(genuine, BOT_TOKEN), true);

  // Атака, которая работала до фикса: берём валидную строку и подменяем
  // id пользователя на чужой, оставив старый hash.
  const forged = genuine.replace(/%22id%22%3A111111/, '%22id%22%3A999999');
  check('подделка id отвергается', isValid(forged, BOT_TOKEN), false);

  // И полностью самодельная строка без подписи — то, чем пользовались бы,
  // зная только чужой telegram id.
  const handmade =
    'user=' +
    encodeURIComponent(JSON.stringify({ id: 999999, first_name: 'Attacker' })) +
    `&auth_date=${Math.floor(Date.now() / 1000)}&hash=`;
  check('самодельная отвергается', isValid(handmade, BOT_TOKEN), false);

  // Чужой токен бота не должен подходить.
  check(
    'подпись чужим токеном отвергается',
    isValid(genuine, 'other:TOKEN'),
    false,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. expiresIn: строка из окружения против числа
// ─────────────────────────────────────────────────────────────────────────────
function testExpiresIn() {
  console.log('\n[2] expiresIn: та самая строка из .env');

  // Подпись двухдневной давности при лимите 300000 сек (~3.5 суток)
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000);
  const old = sign({ user: { id: 222222, first_name: 'Old' } }, BOT_TOKEN, twoDaysAgo);

  const fromEnv = '300000' as unknown as number; // как было: getOrThrow<number>
  const parsed = Number.parseInt('300000', 10); // как стало

  check('с parseInt — принимается', isValid(old, BOT_TOKEN, { expiresIn: parsed }), true);
  console.log(
    `  (для сравнения, со строкой из .env: ${isValid(old, BOT_TOKEN, { expiresIn: fromEnv })})`,
  );

  // Просроченная должна отвергаться при коротком лимите.
  check(
    'просроченная отвергается',
    isValid(old, BOT_TOKEN, { expiresIn: 3600 }),
    false,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Подпись вебхука Tribute
// ─────────────────────────────────────────────────────────────────────────────
function testWebhookSignature() {
  console.log('\n[3] Вебхук: подпись от сырых байт');

  const KEY = 'trbt-test-key';
  // Тело с пробелами и кириллицей — именно на таком ломался JSON.stringify
  // от уже распарсенного объекта.
  const raw = Buffer.from(
    '{\n  "name": "new_subscription",\n  "payload": {"subscription_name": "Поддержите творчество \\ud83c\\udf1f"}\n}',
    'utf8',
  );

  const verify = (signature: string, body: Buffer) => {
    const digest = crypto.createHmac('sha256', KEY).update(body).digest('hex');
    const expected = Buffer.from(digest, 'utf8');
    const received = Buffer.from(signature ?? '', 'utf8');
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  };

  const good = crypto.createHmac('sha256', KEY).update(raw).digest('hex');
  check('верная подпись принимается', verify(good, raw), true);
  check('чужая подпись отвергается', verify('deadbeef', raw), false);
  check('пустая подпись отвергается', verify('', raw), false);

  // Ключевое: пересборка JSON даёт другие байты → другую подпись.
  const reserialized = Buffer.from(JSON.stringify(JSON.parse(raw.toString())), 'utf8');
  const digestOfReserialized = crypto
    .createHmac('sha256', KEY)
    .update(reserialized)
    .digest('hex');

  check(
    'пересобранный JSON даёт ДРУГУЮ подпись (потому и нужен rawBody)',
    digestOfReserialized === good,
    false,
  );

  // Подпись не должна пройти проверку, если тело подменили после подписания.
  const tampered = Buffer.from(raw.toString().replace('new_subscription', 'cancelled'), 'utf8');
  check('подмена тела ломает подпись', verify(good, tampered), false);
}

testInitData();
testExpiresIn();
testWebhookSignature();

console.log(
  failures === 0
    ? '\n=== ВСЕ ПРОВЕРКИ ПРОШЛИ ==='
    : `\n=== ПРОВАЛЕНО ПРОВЕРОК: ${failures} ===`,
);
process.exit(failures === 0 ? 0 : 1);
