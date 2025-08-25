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
    this.httpService.axiosRef.interceptors.request.use((config) => {
      config.baseURL = this.configService.getOrThrow('REMNAWAVE_PANEL_URL');
      config.headers.Authorization = `Bearer ${this.configService.getOrThrow('REMNAWAVE_API_TOKEN')}`;
      return config;
    });
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
          activeInternalSquads: ['80e426f1-ebf8-4a35-a183-2b103a3ab796'],
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
            status: 'EXPIRED',
          },
        }),
      );

      return updatedUserRaw.data;
    }
  }
}
