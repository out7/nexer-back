import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { NewInvoiceLinkParameters } from 'telegraf/typings/telegram-types';
import { TelegramContext } from './interfaces/telegraf-context.interface';

@Injectable()
export class TelegramService {
  constructor(@InjectBot() private readonly bot: Telegraf<TelegramContext>) {}

  async createInvoiceLink(args: NewInvoiceLinkParameters): Promise<string> {
    const result = await this.bot.telegram.createInvoiceLink(args);

    return result;
  }
}
