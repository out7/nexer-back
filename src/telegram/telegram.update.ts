import { TelegramContext } from '@/telegram/interfaces/telegraf-context.interface';
import { Injectable } from '@nestjs/common';
import { Ctx, InjectBot, On, Start, Update } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';

@Update()
@Injectable()
export class TelegramUpdate {
  constructor(@InjectBot() private readonly bot: Telegraf<TelegramContext>) {}

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply('Hello, world!');
  }

  @On('pre_checkout_query')
  async onPayment(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerPreCheckoutQuery(true);
  }

  @On('successful_payment')
  async onSuccessfulPayment(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply('Payment successful!');
  }
}
