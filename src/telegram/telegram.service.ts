import { PreparedMessageIdDto } from '@/invoice/dto/prepared-message-id.dto';
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { firstValueFrom } from 'rxjs';
import { Telegraf } from 'telegraf';
import { NewInvoiceLinkParameters } from 'telegraf/typings/telegram-types';
import { TelegramContext } from './interfaces/telegraf-context.interface';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

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
        photo_url:
          'https://s.iimg.su/s/27/gpekwpSxQR7DeWL95WZzhea0XDoC3z1eiPACcXRe.png',
        thumb_url:
          'https://s.iimg.su/s/27/gpekwpSxQR7DeWL95WZzhea0XDoC3z1eiPACcXRe.png',

        title: 'Присоединяйся к Nexer VPN',
        description: '🚀 Быстрый и надёжный VPN. Попробуй прямо сейчас!',
        caption:
          '⚡ NexerVPN — быстрый доступ к интернету без блокировок.\n🔒 Надёжно. Удобно. Всегда рядом.',

        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Присоединяйся 🚀',
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

  /**
   * Ошибку отправки глушим намеренно: пользователь мог заблокировать бота или
   * не начинать с ним диалог. Раньше промис не ждали и не ловили — такой
   * случай давал unhandled rejection, а в Node 18+ это падение процесса.
   * Доставка сообщения не должна ронять оплату или истечение подписки.
   */
  async sendMessage(telegramId: string, message: string): Promise<boolean> {
    try {
      await this.bot.telegram.sendMessage(telegramId, message);
      return true;
    } catch (e) {
      this.logger.warn(
        `[TELEGRAM] Failed to send message to ${telegramId}: ${(e as Error).message}`,
      );
      return false;
    }
  }
}
