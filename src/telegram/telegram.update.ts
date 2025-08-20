import { SUBSCRIPTION_PERIODS } from '@/common/constants/subscription.constants';
import { CustomerService } from '@/customer/customer.service';
import { ReferralService } from '@/referral/referral.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { TelegramContext } from '@/telegram/interfaces/telegraf-context.interface';
import { Injectable, Logger } from '@nestjs/common';
import { Ctx, InjectBot, On, Start, Update } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';

@Update()
@Injectable()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<TelegramContext>,
    private readonly subscriptionService: SubscriptionService,
    private readonly customerService: CustomerService,
    private readonly referralService: ReferralService,
  ) {}

  // TODO: add beautiful message for start bot
  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const payload = text?.startsWith('/start') ? text.split(' ')[1] : undefined;

    const m = payload?.match(/^ref_(?:u)?(\d+)$/);
    const referrerTgId = m ? m[1] : null;
    const referredTgId = String(from.id);

    let customer = await this.customerService.findOneByTelegramId(referredTgId);

    if (!customer) {
      const inviter = referrerTgId
        ? await this.customerService.findOneByTelegramId(referrerTgId)
        : null;

      customer = await this.customerService.create({
        telegramId: referredTgId,
        username: from.username ?? null,
        language: from.language_code ?? 'ru',
        referredById: inviter ? inviter.id : null,
      });

      if (inviter) {
        await this.referralService.create({
          referrerId: inviter.id,
          referredId: customer.id,
          status: 'inactive',
        });
      }
    } else {
      await this.customerService.update({
        telegramId: referredTgId,
        username: from.username ?? null,
        language: from.language_code ?? 'ru',
      });
    }

    await ctx.reply('Добро пожаловать! 🚀');
  }

  @On('pre_checkout_query')
  async onPayment(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerPreCheckoutQuery(true);
  }
  hasSuccessfulPayment(msg: any): msg is { successful_payment: any } {
    return !!msg && typeof msg === 'object' && 'successful_payment' in msg;
  }

  // TODO: beautiful message for successful payment
  @On('successful_payment')
  async onSuccessfulPayment(@Ctx() ctx: Context): Promise<void> {
    const { update } = ctx;

    if ('message' in update && this.hasSuccessfulPayment(update.message)) {
      const payment = update.message.successful_payment;
      const user = ctx.from;
      if (!user) {
        this.logger.warn('[TELEGRAM] User not found');
        return;
      }

      this.logger.log(
        `[TELEGRAM] Payment successful: user=${user?.id} username=${user?.username ?? ''} amount=${payment.total_amount} ${payment.currency} payload=${payment.invoice_payload}`,
      );
      this.logger.debug(
        '[TELEGRAM] Full payment object:',
        JSON.stringify(payment, null, 2),
      );

      const period = payment.invoice_payload?.split(
        ':',
      )[1] as keyof typeof SUBSCRIPTION_PERIODS;
      const days = SUBSCRIPTION_PERIODS[period];

      this.subscriptionService.upsertUserSubscription({
        telegramId: user.id.toString(),
        period: period,
        createdVia: 'paid',
      });

      await ctx.reply('Платёж успешно получен!');
    } else {
      this.logger.warn(
        '[TELEGRAM] successful_payment event received, but no payment info found:',
        JSON.stringify(update),
      );
    }
  }
}
