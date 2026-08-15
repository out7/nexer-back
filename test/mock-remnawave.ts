/**
 * Заглушка панели Remnawave для стенда.
 *
 * Управляется через /__control?healthy=false|true — так проверяется, что
 * сорвавшаяся из-за недоступной панели оплата доедет на ретрае провайдера.
 *
 * На node:http, а не на Bun.serve, чтобы файл проходил общий typecheck
 * и запускался хоть под bun, хоть под node.
 */
import { createServer } from 'node:http';

let healthy = true;
const users = new Map<string, any>();

const readBody = (req: any): Promise<any> =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (c: Buffer) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });

const json = (res: any, status: number, body: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/__control') {
    healthy = url.searchParams.get('healthy') === 'true';
    console.log(`[mock] healthy=${healthy}`);
    return json(res, 200, { healthy });
  }

  if (!healthy) {
    return json(res, 502, { error: 'panel is down' });
  }

  // GET /api/users/by-telegram-id/<id>
  const byTg = url.pathname.match(/by-telegram-id\/(\d+)/);
  if (byTg) {
    const found = users.get(byTg[1]);
    return json(res, 200, { response: found ? [found] : [] });
  }

  if (url.pathname.endsWith('/api/users')) {
    const body = await readBody(req);

    // Создание
    if (req.method === 'POST' && body.telegramId !== undefined) {
      const tg = String(body.telegramId);
      const user = {
        uuid: `uuid-${tg}`,
        username: body.username,
        status: body.status,
        expireAt: body.expireAt,
        subscriptionUrl: `https://sub.nexervpn.com/${tg}`,
      };
      users.set(tg, user);
      return json(res, 200, { response: user });
    }

    // Обновление по uuid
    const entry = [...users.entries()].find(([, u]) => u.uuid === body.uuid);
    const user = {
      ...(entry?.[1] ?? { username: 'customer', subscriptionUrl: 'https://sub/x' }),
      uuid: body.uuid,
      status: body.status ?? 'ACTIVE',
      expireAt: body.expireAt,
    };
    if (entry) users.set(entry[0], user);
    return json(res, 200, { response: user });
  }

  return json(res, 200, { response: [] });
}).listen(59999, () => console.log('mock remnawave на :59999'));
