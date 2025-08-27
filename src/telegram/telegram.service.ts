import { PreparedMessageIdDto } from '@/invoice/dto/prepared-message-id.dto';
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { firstValueFrom } from 'rxjs';
import { Telegraf } from 'telegraf';
import { NewInvoiceLinkParameters } from 'telegraf/typings/telegram-types';
import { TelegramContext } from './interfaces/telegraf-context.interface';

@Injectable()
export class TelegramService {
  constructor(
    @InjectBot() private readonly bot: Telegraf<TelegramContext>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async createInvoiceLink(args: NewInvoiceLinkParameters): Promise<string> {
    const result = await this.bot.telegram.createInvoiceLink(args);

    return result;
  }

  async shareMessage(telegramId: string): Promise<PreparedMessageIdDto> {
    const token = this.configService.getOrThrow('TELEGRAM_TOKEN');

    const userId = Number(telegramId);
    if (!Number.isFinite(userId)) {
      throw new HttpException(
        { message: 'Invalid telegramId' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const payload = {
      user_id: userId,
      result: {
        type: 'photo',
        id: `nexer-vpn-share-${userId}`,
        photo_url: 'https://i.archi.ru/i/377429.jpg',
        thumb_url: 'https://i.archi.ru/i/377429.jpg',

        title: 'Присоединяйся к Nexer VPN',
        description: '🚀 Быстрый и надёжный VPN. Попробуй прямо сейчас!',
        caption: '🌐 Nexer VPN — подключайся и оставайся в безопасности!',

        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Open',
                url: `https://t.me/nexervpn_bot?start=ref_${telegramId}`,
              },
            ],
          ],
        },
      },

      allow_user_chats: true,
      allow_group_chats: true,
      allow_bot_chats: false,
      allow_channel_chats: false,
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          url: `https://api.telegram.org/bot${token}/savePreparedInlineMessage`,
          data: payload,
        }),
      );

      if (!data?.ok || !data.result?.id) {
        throw new HttpException(
          data ?? { message: 'Telegram API error' },
          HttpStatus.BAD_GATEWAY,
        );
      }

      return { id: data.result.id };
    } catch (error: any) {
      const status = error.response?.status ?? HttpStatus.BAD_GATEWAY;
      const payload = error.response?.data ?? { message: 'Telegram API error' };
      throw new HttpException(payload, status);
    }
  }

  async sendMessage(telegramId: string, message: string) {
    this.bot.telegram.sendMessage(telegramId, message);
  }
}
