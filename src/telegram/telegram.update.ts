import { TelegramContext } from '@/telegram/interfaces/telegraf-context.interface';
import { Injectable, Logger } from '@nestjs/common';
import { Ctx, InjectBot, On, Start, Update } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';

@Update()
@Injectable()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(@InjectBot() private readonly bot: Telegraf<TelegramContext>) {}

  // TODO: add beautiful message for start bot
  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply('Hello, world!');
  }

  @On('pre_checkout_query')
  async onPayment(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerPreCheckoutQuery(true);
  }

  // TODO: beautiful message for successful payment
  // Понять как вытащить пейлоад из ctx
  @On('successful_payment')
  async onSuccessfulPayment(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply('Payment successful!');
    this.logger.log('Payment successful!', ctx);
    ctx.message;
  }
}
