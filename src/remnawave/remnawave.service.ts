import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateUserCommand,
  GetUserByTelegramIdCommand,
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
    // вместе с подменённым baseURL. Условие ниже — страховка ровно от этого.
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

  async findUserByTelegramId(
    telegramId: string,
  ): Promise<GetUserByTelegramIdCommand.Response['response'][0] | null> {
    try {
      const userRaw = await firstValueFrom(
        this.httpService.request<GetUserByTelegramIdCommand.Response>({
          method: GetUserByTelegramIdCommand.endpointDetails.REQUEST_METHOD,
          url: GetUserByTelegramIdCommand.url(telegramId),
        }),
      );
      const user = userRaw.data.response[0];
      return user || null;
    } catch (err) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to find user by Telegram ID (${telegramId}): ${err.message || err}`,
      );
    }
  }

  async activateVpnAccess(telegramId: string, ExpirationDate: Date) {
    const user = await this.findUserByTelegramId(telegramId);

    if (user) {
      const updatedUserRaw = await firstValueFrom(
        this.httpService.request<UpdateUserCommand.Response>({
          method: UpdateUserCommand.endpointDetails.REQUEST_METHOD,
          url: UpdateUserCommand.url,
          data: {
            uuid: user.uuid,
            status: 'ACTIVE',
            expireAt: ExpirationDate,
          },
        }),
      );

      return updatedUserRaw.data;
    }

    const createdUserRaw = await firstValueFrom(
      this.httpService.request<CreateUserCommand.Response>({
        method: CreateUserCommand.endpointDetails.REQUEST_METHOD,
        url: CreateUserCommand.url,
        data: {
          username: `customer-${telegramId}`,
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
    const user = await this.findUserByTelegramId(telegramId);

    if (user) {
      const updatedUserRaw = await firstValueFrom(
        this.httpService.request<UpdateUserCommand.Response>({
          method: UpdateUserCommand.endpointDetails.REQUEST_METHOD,
          url: UpdateUserCommand.url,
          data: {
            uuid: user.uuid,
            status: 'DISABLED',
          },
        }),
      );

      return updatedUserRaw.data;
    }
  }
}
