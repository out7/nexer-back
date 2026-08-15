/**
 * Проверка нового remnawave.service против НАСТОЯЩЕЙ панели v3.
 *
 * Панель поднимается из test/docker-compose.panel-v3.yaml. Токен и сквад
 * передаются через окружение — их выдаёт test/setup-v3-panel.ts.
 *
 * Проверяем ровно те вызовы, что делает бэкенд при оплате и истечении:
 * найти по username (которого сначала нет), создать, продлить, отключить.
 * И главное — что в ответе есть subscriptionUrl, который читает
 * subscription.service.
 */
import {
  CreateUserCommand,
  GetUserByUsernameCommand,
  UpdateUserCommand,
} from '@remnawave/backend-contract';
import axios from 'axios';

const PANEL = process.env.PANEL_URL || 'http://127.0.0.1:3100';
const TOKEN = process.env.PANEL_TOKEN!;
const SQUAD = process.env.PANEL_SQUAD!;
const TG = String(700000 + Math.floor((Date.now() / 1000) % 90000));
const USERNAME = `customer-${TG}`;

let failures = 0;
const check = (name: string, ok: boolean, extra = '') => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ': ' + extra : ''}`);
};

// Тот же инстанс-подход, что в сервисе: baseURL + Bearer. Плюс заголовки
// прокси — на реальном проде их ставит Angie, локально панель их требует.
const api = axios.create({
  baseURL: PANEL,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'X-Forwarded-Proto': 'https',
    'X-Forwarded-For': '203.0.113.5',
  },
});

const future = () => new Date(Date.now() + 30 * 864e5);

async function findByUsername(username: string) {
  try {
    const res = await api.request<GetUserByUsernameCommand.Response>({
      method: GetUserByUsernameCommand.endpointDetails.REQUEST_METHOD,
      url: GetUserByUsernameCommand.url(username),
    });
    return res.data.response ?? null;
  } catch (e: any) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

async function main() {
  console.log(`\nПанель v3, пользователь ${USERNAME}`);

  // 1. Пользователя ещё нет — by-username даёт 404 → null.
  const before = await findByUsername(USERNAME);
  check('до создания by-username = null', before === null);

  // 2. Создание — то, что делает activateVpnAccess на новом клиенте.
  const created = await api.request<CreateUserCommand.Response>({
    method: CreateUserCommand.endpointDetails.REQUEST_METHOD,
    url: CreateUserCommand.url,
    data: {
      username: USERNAME,
      telegramId: Number(TG),
      status: 'ACTIVE',
      expireAt: future(),
      activeInternalSquads: [SQUAD],
    },
  });
  const cu = created.data.response;
  check('create вернул пользователя', !!cu?.username, cu?.username);
  check('create дал subscriptionUrl', !!cu?.subscriptionUrl, cu?.subscriptionUrl?.slice(0, 40));
  check('create статус ACTIVE', cu?.status === 'ACTIVE', cu?.status);

  // 3. Теперь by-username находит.
  const found = await findByUsername(USERNAME);
  check('by-username находит созданного', found?.username === USERNAME);

  // 4. Продление — update по USERNAME (не по uuid, как было в v2).
  const newExpire = new Date(Date.now() + 60 * 864e5);
  const updated = await api.request<UpdateUserCommand.Response>({
    method: UpdateUserCommand.endpointDetails.REQUEST_METHOD,
    url: UpdateUserCommand.url,
    data: { username: USERNAME, status: 'ACTIVE', expireAt: newExpire },
  });
  const uu = updated.data.response;
  check('update по username прошёл', !!uu?.username, uu?.username);
  check('update продлил дату', new Date(uu.expireAt).getTime() > Date.now() + 45 * 864e5);
  check('update сохранил subscriptionUrl', !!uu?.subscriptionUrl);

  // 5. Отключение — update статуса в DISABLED.
  const disabled = await api.request<UpdateUserCommand.Response>({
    method: UpdateUserCommand.endpointDetails.REQUEST_METHOD,
    url: UpdateUserCommand.url,
    data: { username: USERNAME, status: 'DISABLED' },
  });
  check('disable перевёл в DISABLED', disabled.data.response?.status === 'DISABLED');

  // 6. Реактивация существующего — второй путь activateVpnAccess (нашли → update).
  const react = await api.request<UpdateUserCommand.Response>({
    method: UpdateUserCommand.endpointDetails.REQUEST_METHOD,
    url: UpdateUserCommand.url,
    data: { username: USERNAME, status: 'ACTIVE', expireAt: future() },
  });
  check('реактивация вернула ACTIVE', react.data.response?.status === 'ACTIVE');

  console.log(
    failures === 0
      ? '\n=== ПАНЕЛЬ v3: ВСЕ ВЫЗОВЫ РАБОТАЮТ ==='
      : `\n=== ПРОВАЛЕНО: ${failures} ===`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Ошибка:', e.response?.status, JSON.stringify(e.response?.data)?.slice(0, 300) || e.message);
  process.exit(1);
});
