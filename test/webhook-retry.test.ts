/**
 * Сценарий, который поймал стенд: панель недоступна в момент оплаты.
 *
 * Проверяем, что:
 *   - сорвавшееся событие НЕ помечается обработанным;
 *   - ретрай провайдера доводит подписку до выдачи;
 *   - платёж при этом не задваивается;
 *   - а вот успешно завершённое событие повторно не обрабатывается.
 */
import { sign } from '@telegram-apps/init-data-node';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const BASE = 'http://127.0.0.1:4455/api/v1.0';
const BOT_TOKEN = '123456:STAND-ONLY-INVALID-TOKEN';
const TRBT_KEY = 'trbt-stand-key';
const TG = 555002;

const prisma = new PrismaClient();
let failures = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name}: ${actual} (ожидали ${expected})`);
};

const panel = (healthy: boolean) =>
  fetch(`http://127.0.0.1:59999/__control?healthy=${healthy}`).then((r) => r.json());

const deliver = (raw: string) =>
  fetch(`${BASE}/webhook/trbt`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'trbt-signature': crypto.createHmac('sha256', TRBT_KEY).update(raw).digest('hex'),
    },
    body: raw,
  });

async function state() {
  const ev = await prisma.webhookEvent.findFirst({ orderBy: { createdAt: 'desc' } });
  const payments = await prisma.payment.count();
  const sub = await prisma.customerSubscription.findFirst({
    where: { customer: { telegramId: BigInt(TG) } },
  });
  return { status: ev?.status, attempts: ev?.attempts, payments, sub: sub?.status };
}

async function main() {
  // Клиент должен существовать — заводим через легальную авторизацию.
  const initData = sign({ user: { id: TG, first_name: 'Payer' } }, BOT_TOKEN, new Date());
  const auth = await fetch(`${BASE}/auth/tma`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: initData }),
  });
  check('клиент заведён', auth.status, 200);

  const raw = JSON.stringify({
    name: 'new_subscription',
    created_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    payload: {
      subscription_id: 7001,
      period_id: 11,
      period: 'monthly',
      amount: 20000,
      telegram_user_id: TG,
    },
  });

  // ── Доставка 1: панель лежит ──────────────────────────────────────────────
  console.log('\n[1] Панель недоступна в момент оплаты');
  await panel(false);
  const first = await deliver(raw);
  const s1 = await state();
  console.log(`  ответ: ${first.status}, событие: ${s1.status}, платежей: ${s1.payments}, подписка: ${s1.sub}`);

  check('событие НЕ помечено обработанным', s1.status, 'failed');
  check('платёж записан', s1.payments, 1);
  check('подписка ещё не выдана', s1.sub, 'none');

  // ── Доставка 2: ретрай, панель поднялась ──────────────────────────────────
  console.log('\n[2] Ретрай провайдера, панель ожила');
  await panel(true);
  const second = await deliver(raw);
  const s2 = await state();
  console.log(`  ответ: ${second.status}, событие: ${s2.status}, попыток: ${s2.attempts}`);

  check('ретрай принят', second.status, 200);
  check('событие доведено', s2.status, 'completed');
  check('подписка выдана', s2.sub, 'active');
  check('платёж НЕ задвоился', s2.payments, 1);

  // ── Доставка 3: лишний повтор уже завершённого ────────────────────────────
  console.log('\n[3] Ещё один повтор того же события');
  const third = await deliver(raw);
  const s3 = await state();
  check('повтор принят без ошибки', third.status, 200);
  check('платежей по-прежнему', s3.payments, 1);
  check('попыток не прибавилось', s3.attempts, s2.attempts);

  // ── Параллельные доставки ─────────────────────────────────────────────────
  console.log('\n[4] Пять параллельных доставок нового события');
  const raw2 = JSON.stringify({
    name: 'new_subscription',
    created_at: new Date(Date.now() + 5000).toISOString(),
    sent_at: new Date().toISOString(),
    payload: {
      subscription_id: 7002,
      period_id: 11,
      period: 'monthly',
      amount: 20000,
      telegram_user_id: TG,
    },
  });
  await Promise.all(Array.from({ length: 5 }, () => deliver(raw2)));
  const total = await prisma.payment.count();
  check('платежей всего', total, 2);

  console.log(failures === 0 ? '\n=== ВСЕ ПРОВЕРКИ ПРОШЛИ ===' : `\n=== ПРОВАЛЕНО: ${failures} ===`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main();
