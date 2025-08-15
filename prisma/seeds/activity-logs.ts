import { ActivityLogType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isoDaysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function seedLogsForUser(customerId: string) {
  // Для теста делаем 5 записей: purchased, extended, expired, trial_activated, bonus_claimed.
  // (Если используешь referral_bonus_added — добавь ниже аналогично.)

  const nowIso = new Date().toISOString();

  // subscription_purchased — новая покупка на 30 дней
  await prisma.activityLog.create({
    data: {
      customerId,
      type: ActivityLogType.subscription_purchased,
      meta: {
        period: 30,
        platform: 'trbt',
        amount: 10100,
        newEndDate: isoDaysFromNow(30),
      },
      createdAt: nowIso,
    },
  });

  // subscription_extended — продление активной (добавили 30 дней)
  await prisma.activityLog.create({
    data: {
      customerId,
      type: ActivityLogType.subscription_extended,
      meta: {
        daysAdded: 30,
        platform: 'telegram_stars',
        amount: 5000,
        previousEndDate: isoDaysFromNow(30),
        newEndDate: isoDaysFromNow(60),
      },
      createdAt: nowIso,
    },
  });

  // subscription_expired — подписка истекла вчера
  await prisma.activityLog.create({
    data: {
      customerId,
      type: ActivityLogType.subscription_expired,
      meta: {
        expiredAt: isoDaysFromNow(-1),
      },
      createdAt: nowIso,
    },
  });

  // trial_activated — активировали триал на 3 дня
  await prisma.activityLog.create({
    data: {
      customerId,
      type: ActivityLogType.trial_activated,
      meta: {
        grantedDays: 3,
      },
      createdAt: nowIso,
    },
  });

  // bonus_claimed — пользователь забрал 7 бонусных дней
  await prisma.activityLog.create({
    data: {
      customerId,
      type: ActivityLogType.bonus_claimed,
      meta: {
        days: 7,
        previousEndDate: isoDaysFromNow(10),
        newEndDate: isoDaysFromNow(17),
      },
      createdAt: nowIso,
    },
  });

  // referral_bonus_added — пользователь получил бонусные дни за реферала
  await prisma.activityLog.create({
    data: {
      customerId,
      type: ActivityLogType.referral_bonus_added,
      meta: {
        days: 7,
        refereeTelegramId: '123456789',
        sourcePaymentId: 'trbt_134760',
      },
      createdAt: nowIso,
    },
  });
}

export async function seedActivityLogs() {
  console.log('Seeding activity logs...');
  const customers = await prisma.customer.findMany({ select: { id: true } });

  if (!customers.length) {
    console.warn('No customers found. Skipping activity logs seed.');
    return;
  }

  // опционально: очищать логи перед заполнением для повторяемости
  if (process.env.CLEAR_LOGS === 'true') {
    console.log('CLEAR_LOGS=true → deleting existing logs…');
    await prisma.activityLog.deleteMany({});
  }

  for (const c of customers) {
    await seedLogsForUser(c.id);
  }

  console.log(`Activity logs seeded for ${customers.length} customer(s).`);
}

if (require.main === module) {
  seedActivityLogs()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
