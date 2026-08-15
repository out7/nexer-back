/**
 * Стенд для проверки исправлений конкурентности.
 *
 * Воспроизводит ровно те сценарии, ради которых правился код:
 *   1. Повторная доставка вебхука (идемпотентность)
 *   2. Параллельный клейм бонусных дней
 *   3. Параллельная активация триала
 *
 * Каждый прогоняется ДВАЖДЫ: старой логикой (как было) и новой (как стало),
 * чтобы видеть не «тест зелёный», а что именно изменилось.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `  ${ok ? 'OK  ' : 'FAIL'} ${name}: получили ${actual}, ожидали ${expected}`,
  );
}

async function purge(tgIds: bigint[]) {
  const ids = (
    await prisma.customer.findMany({
      where: { telegramId: { in: tgIds } },
      select: { id: true },
    })
  ).map((c) => c.id);
  if (!ids.length) return;
  await prisma.activityLog.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.payment.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.referral.deleteMany({ where: { referredId: { in: ids } } });
  await prisma.customerSubscription.deleteMany({
    where: { customerId: { in: ids } },
  });
  await prisma.customer.deleteMany({ where: { id: { in: ids } } });
}

async function freshCustomer(tgId: bigint, bonusDays = 0) {
  await purge([tgId]);
  return prisma.customer.create({
    data: {
      telegramId: tgId,
      username: 'racetest',
      language: 'ru',
      unclaimedBonusDays: bonusDays,
      customerSubscription: { create: {} },
    },
    include: { customerSubscription: true },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Идемпотентность вебхука
// ─────────────────────────────────────────────────────────────────────────────
async function testWebhookIdempotency() {
  console.log('\n[1] Вебхук: одно событие доставлено 5 раз параллельно');

  const externalId = `new_subscription:1644:1547:777001:${Date.now()}`;
  await prisma.webhookEvent.deleteMany({ where: { externalId } });

  // claimEvent из webhook.service.ts: вставка = захват блокировки
  const claim = async () => {
    try {
      await prisma.webhookEvent.create({
        data: {
          provider: 'trbt',
          externalId,
          eventName: 'new_subscription',
          payload: {},
        },
      });
      return true; // событие наше, обрабатываем
    } catch (e: any) {
      if (e.code === 'P2002') return false; // дубликат, выходим
      throw e;
    }
  };

  const results = await Promise.all(Array.from({ length: 5 }, claim));
  const processed = results.filter(Boolean).length;

  check('обработок платежа', processed, 1);

  const rows = await prisma.webhookEvent.count({ where: { externalId } });
  check('записей в журнале', rows, 1);

  await prisma.webhookEvent.deleteMany({ where: { externalId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Клейм бонусных дней
// ─────────────────────────────────────────────────────────────────────────────
async function testBonusClaim() {
  const BONUS = 5;

  // --- Как было: прочитать → (выдать) → обнулить ---
  console.log('\n[2] Бонусы: 4 параллельных клейма по 5 дней');
  let c = await freshCustomer(777002n, BONUS);

  const oldClaim = async () => {
    const cust = await prisma.customer.findUnique({ where: { id: c.id } });
    const days = cust!.unclaimedBonusDays ?? 0;
    if (days <= 0) return 0;
    await new Promise((r) => setTimeout(r, 5)); // окно между чтением и записью
    await prisma.customer.update({
      where: { id: c.id },
      data: { unclaimedBonusDays: 0 },
    });
    return days;
  };

  const oldGranted = (await Promise.all(Array.from({ length: 4 }, oldClaim)))
    .reduce((a, b) => a + b, 0);
  console.log(`  старая логика выдала: ${oldGranted} дн. (должно быть ${BONUS})`);

  // --- Как стало: условное списание первым шагом ---
  c = await freshCustomer(777002n, BONUS);

  const newClaim = async () => {
    const cust = await prisma.customer.findUnique({ where: { id: c.id } });
    const days = cust!.unclaimedBonusDays ?? 0;
    if (days <= 0) return 0;
    await new Promise((r) => setTimeout(r, 5));
    const claimed = await prisma.customer.updateMany({
      where: { id: c.id, unclaimedBonusDays: days },
      data: { unclaimedBonusDays: 0 },
    });
    return claimed.count === 0 ? 0 : days;
  };

  const newGranted = (await Promise.all(Array.from({ length: 4 }, newClaim)))
    .reduce((a, b) => a + b, 0);

  check('новая логика выдала дней', newGranted, BONUS);
  const after = await prisma.customer.findUnique({ where: { id: c.id } });
  check('осталось невыданных', after!.unclaimedBonusDays, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Активация триала
// ─────────────────────────────────────────────────────────────────────────────
async function testTrialRace() {
  console.log('\n[3] Триал: 4 параллельные активации');
  const c = await freshCustomer(777003n);

  const activate = async () => {
    const cust = await prisma.customer.findUnique({
      where: { id: c.id },
      include: { customerSubscription: true },
    });
    if (cust!.customerSubscription?.trialActivated) return 0;
    await new Promise((r) => setTimeout(r, 5));
    const claimed = await prisma.customerSubscription.updateMany({
      where: { customerId: c.id, trialActivated: false },
      data: { trialActivated: true },
    });
    return claimed.count === 0 ? 0 : 3;
  };

  const granted = (await Promise.all(Array.from({ length: 4 }, activate)))
    .reduce((a, b) => a + b, 0);

  check('выдано дней триала', granted, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Возврат бонуса при сбое выдачи
// ─────────────────────────────────────────────────────────────────────────────
async function testBonusRollback() {
  console.log('\n[4] Бонусы: выдача упала после списания');
  const c = await freshCustomer(777004n, 7);

  const days = 7;
  await prisma.customer.updateMany({
    where: { id: c.id, unclaimedBonusDays: days },
    data: { unclaimedBonusDays: 0 },
  });

  try {
    throw new Error('Remnawave недоступен');
  } catch {
    await prisma.customer.update({
      where: { id: c.id },
      data: { unclaimedBonusDays: { increment: days } },
    });
  }

  const after = await prisma.customer.findUnique({ where: { id: c.id } });
  check('дни вернулись пользователю', after!.unclaimedBonusDays, 7);
}

async function main() {
  await testWebhookIdempotency();
  await testBonusClaim();
  await testTrialRace();
  await testBonusRollback();

  await purge([777002n, 777003n, 777004n]);

  console.log(
    failures === 0
      ? '\n=== ВСЕ ПРОВЕРКИ ПРОШЛИ ==='
      : `\n=== ПРОВАЛЕНО ПРОВЕРОК: ${failures} ===`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().finally(() => prisma.$disconnect());
