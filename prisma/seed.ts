import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const baseRUB = 200;
  const baseStars = 230;

  await prisma.tariff.createMany({
    data: [
      {
        code: 'month',
        months: 1,
        priceRUB: baseRUB,
        priceStars: baseStars,
        priceOldRUB: null,
        priceOldStars: null,
        discount: 0,
        trbtCode: 'sz3y',
        perMonth: baseRUB,
      },
      {
        code: 'quarter',
        months: 3,
        priceRUB: Math.round(baseRUB * 3 * 0.85),
        priceStars: Math.round(baseStars * 3 * 0.85),
        priceOldRUB: baseRUB * 3,
        priceOldStars: baseStars * 3,
        discount: 15,
        trbtCode: 'sz9s',
        perMonth: Math.round(baseRUB * 0.85),
      },
      {
        code: 'half_year',
        months: 6,
        priceRUB: Math.round(baseRUB * 6 * 0.7),
        priceStars: Math.round(baseStars * 6 * 0.7),
        priceOldRUB: baseRUB * 6,
        priceOldStars: baseStars * 6,
        discount: 30,
        trbtCode: 'sz9u',
        perMonth: Math.round(baseRUB * 0.7),
      },
      {
        code: 'year',
        months: 12,
        priceRUB: Math.round(baseRUB * 12 * 0.6),
        priceStars: Math.round(baseStars * 12 * 0.6),
        priceOldRUB: baseRUB * 12,
        priceOldStars: baseStars * 12,
        discount: 40,
        trbtCode: 'sz9t',
        perMonth: Math.round(baseRUB * 0.6),
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
