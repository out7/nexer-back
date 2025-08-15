import { seedActivityLogs } from './activity-logs';
import { seedTariffs } from './tariffs';

async function main() {
  await seedTariffs();
  await seedActivityLogs();
}

main()
  .then(() => {
    console.log('All seeds completed.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
