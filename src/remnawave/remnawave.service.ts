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

  public async createTrialSubscription(
    telegramId: string,
    newEnd: Date,
  ): Promise<UpdateUserCommand.Response> {
    let user: GetUserByTelegramIdCommand.Response['response'][0] | undefined;

    try {
      const userRaw = await firstValueFrom(
        this.httpService.request<GetUserByTelegramIdCommand.Response>({
          method: GetUserByTelegramIdCommand.endpointDetails.REQUEST_METHOD,
          url: GetUserByTelegramIdCommand.url(telegramId),
        }),
      );

      user = userRaw.data.response[0];
    } catch (err) {
      if (err?.response?.status !== 404) {
        throw err;
      }
    }

    if (user) {
      const updatedUserRaw = await firstValueFrom(
        this.httpService.request<UpdateUserCommand.Response>({
          method: UpdateUserCommand.endpointDetails.REQUEST_METHOD,
          url: UpdateUserCommand.url,
          data: {
            uuid: user.uuid,
            status: 'ACTIVE',
            expireAt: newEnd,
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
          expireAt: newEnd,
        },
      }),
    );

    return createdUserRaw.data;
  }

  public async getCustomer() {
    // const response = await this.httpService.post(
    //   `https://api.remnawave.com/v1/customers/${customerId}`,
    // );

    // CreateUserCommand.ResponseSchema
    // CreateUserCommand.RequestSchema

    this.logger.log('asd');

    const response = await firstValueFrom(
      this.httpService.request({
        method: CreateUserCommand.endpointDetails.REQUEST_METHOD,
        url: CreateUserCommand.url,
        data: {
          username: '111112',
          status: 'DISABLED',
          expireAt: new Date(Date.now() + 1000),
        },
      }),
    );

    this.logger.log(response.status, response.data, response.statusText);

    return response;
  }
}
