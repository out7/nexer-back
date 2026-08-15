import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateUserCommand,
  GetUserByUsernameCommand,
  UpdateUserCommand,
} from '@remnawave/backend-contract';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RemnawaveService {
  private readonly logger = new Logger(RemnawaveService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Интерцептор вешается на инстанс, который HttpModule раздаёт этому
    // модулю. Сейчас Nest даёт отдельный инстанс на каждый импорт HttpModule,
    // но полагаться на это опасно: TelegramModule импортирует его тоже, и
    // при изменении этой детали токен панели уехал бы в api.telegram.org
    // с подменённым baseURL. Условие ниже — страховка ровно от этого.
    this.httpService.axiosRef.interceptors.request.use((config) => {
      const panelUrl =
        this.configService.getOrThrow<string>('REMNAWAVE_PANEL_URL');

      // Абсолютный чужой URL не трогаем — ни baseURL, ни заголовка.
      if (config.url && /^https?:\/\//i.test(config.url)) {
        return config;
      }

      config.baseURL = panelUrl;
      config.headers.Authorization = `Bearer ${this.configService.getOrThrow('REMNAWAVE_API_TOKEN')}`;
      return config;
    });
  }

  private squadUuid(): string {
    return this.configService.getOrThrow<string>('REMNAWAVE_SQUAD_UUID');
  }

  /**
   * Имя пользователя в панели. Мы сами его задаём и по нему же ищем — в v3
   * это единственный способ найти пользователя без хранения его id у себя:
   * поиск по telegram id из API вырезан (был GetUserByTelegramIdCommand).
   */
  private username(telegramId: string): string {
    return `customer-${telegramId}`;
  }

  /**
   * Проверено против настоящей панели v3 (test/remnawave-v3.test.ts):
   * by-username даёт 404 → null, если пользователя нет.
   */
  async findUserByTelegramId(telegramId: string) {
    try {
      const res = await firstValueFrom(
        this.httpService.request<GetUserByUsernameCommand.Response>({
          method: GetUserByUsernameCommand.endpointDetails.REQUEST_METHOD,
          url: GetUserByUsernameCommand.url(this.username(telegramId)),
        }),
      );
      return res.data.response ?? null;
    } catch (err) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to find user by username (${this.username(telegramId)}): ${err.message || err}`,
      );
    }
  }

  async activateVpnAccess(telegramId: string, ExpirationDate: Date) {
    const user = await this.findUserByTelegramId(telegramId);

    // Существующий — продлеваем одним PATCH по username. В v2 здесь был поиск
    // ради uuid и update по uuid; v3 принимает username напрямую.
    if (user) {
      const updatedUserRaw = await firstValueFrom(
        this.httpService.request<UpdateUserCommand.Response>({
          method: UpdateUserCommand.endpointDetails.REQUEST_METHOD,
          url: UpdateUserCommand.url,
          data: {
            username: this.username(telegramId),
            status: 'ACTIVE',
            expireAt: ExpirationDate,
          },
        }),
      );

      return updatedUserRaw.data;
    }

    // Нового — создаём и зачисляем в сквад.
    const createdUserRaw = await firstValueFrom(
      this.httpService.request<CreateUserCommand.Response>({
        method: CreateUserCommand.endpointDetails.REQUEST_METHOD,
        url: CreateUserCommand.url,
        data: {
          username: this.username(telegramId),
          telegramId: Number(telegramId),
          status: 'ACTIVE',
          expireAt: ExpirationDate,
          // Был захардкожен в коде: при пересоздании сквада в панели выдача
          // доступа ломалась молча, и починка требовала пересборки образа.
          activeInternalSquads: [this.squadUuid()],
        },
      }),
    );

    return createdUserRaw.data;
  }

  async disableVpnAccess(telegramId: string) {
    // Существование проверяем всё тем же by-username: слать DISABLED на
    // отсутствующего смысла нет, а 404 из update ловить дороже.
    const user = await this.findUserByTelegramId(telegramId);

    if (user) {
      const updatedUserRaw = await firstValueFrom(
        this.httpService.request<UpdateUserCommand.Response>({
          method: UpdateUserCommand.endpointDetails.REQUEST_METHOD,
          url: UpdateUserCommand.url,
          data: {
            username: this.username(telegramId),
            status: 'DISABLED',
          },
        }),
      );

      return updatedUserRaw.data;
    }
  }
}
