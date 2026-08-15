import { SUBSCRIPTION_PERIODS } from '@/common/constants/subscription.constants';
import { CustomerService } from '@/customer/customer.service';
import { PaymentService } from '@/payment/payment.service';
import { ReferralService } from '@/referral/referral.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { TariffService } from '@/tariff/tariff.service';
import { TelegramContext } from '@/telegram/interfaces/telegraf-context.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ctx, InjectBot, On, Start, Update } from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';

@Update()
@Injectable()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<TelegramContext>,
    private readonly configService: ConfigService,
    private readonly subscriptionService: SubscriptionService,
    private readonly customerService: CustomerService,
    private readonly referralService: ReferralService,
    private readonly paymentService: PaymentService,
    private readonly tariffService: TariffService,
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

    await ctx.replyWithPhoto(
      {
        url: 'https://s.iimg.su/s/27/gpekwpSxQR7DeWL95WZzhea0XDoC3z1eiPACcXRe.png',
      },
      {
        caption: `👋 Добро пожаловать в NexerVPN!
    
🔐 Здесь вы сможете:
— Подключаться к VPN без ограничений
— Управлять подпиской прямо в приложении
— Получать быстрый и стабильный доступ в сеть

📰 Новости: <a href="https://t.me/nexervpn">наш канал</a>
🆘 Поддержка: <a href="https://t.me/nexervpn_support">сюда</a>

🚀 Начните с выбора тарифа и наслаждайтесь свободным интернетом`,
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.webApp(
              '🌐 Открыть Mini App',
              'https://app.nexervpn.com',
            ),
          ],
          [
            Markup.button.url('📰 Новости', 'https://t.me/nexervpn'),
            Markup.button.url('🆘 Поддержка', 'https://t.me/nexervpn_support'),
          ],
        ]),
      },
    );
  }

  /**
   * Payload инвойса: `tariff:<code>:<timestamp>` — см. InvoiceService.
   */
  private parseTariffCode(payload: string | undefined): string | null {
    const code = payload?.split(':')[1];
    return code ? code : null;
  }

  @On('pre_checkout_query')
  async onPayment(@Ctx() ctx: Context): Promise<void> {
    const query = (ctx as any).preCheckoutQuery;
    const code = this.parseTariffCode(query?.invoice_payload);

    // Раньше подтверждали безусловно. Если тариф успели удалить или
    // переименовать между выпуском ссылки и оплатой, деньги списывались за
    // то, что мы потом не сможем выдать.
    if (!code) {
      await ctx.answerPreCheckoutQuery(false, 'Некорректный платёж');
      return;
    }

    try {
      await this.tariffService.findTariffByCode(code);
    } catch {
      this.logger.warn(`[TELEGRAM] Pre-checkout for unknown tariff: ${code}`);
      await ctx.answerPreCheckoutQuery(false, 'Тариф больше недоступен');
      return;
    }

    await ctx.answerPreCheckoutQuery(true);
  }

  hasSuccessfulPayment(msg: any): msg is { successful_payment: any } {
    return !!msg && typeof msg === 'object' && 'successful_payment' in msg;
  }

  @On('successful_payment')
  async onSuccessfulPayment(@Ctx() ctx: Context): Promise<void> {
    const { update } = ctx;

    if ('message' in update && this.hasSuccessfulPayment(update.message)) {
      const payment = update.message.successful_payment;
      const user = ctx.from;
      if (!user) {
        this.logger.warn('[TELEGRAM] Telegram user not found');
        return;
      }

      this.logger.log(
        `[TELEGRAM] Payment successful: user=${user?.id} username=${user?.username ?? ''} amount=${payment.total_amount} ${payment.currency} payload=${payment.invoice_payload}`,
      );
      this.logger.debug(
        '[TELEGRAM] Full payment object:',
        JSON.stringify(payment, null, 2),
      );

      const code = this.parseTariffCode(payment.invoice_payload);
      const days = code ? SUBSCRIPTION_PERIODS[code] : undefined;

      if (!code || !days) {
        this.logger.error(
          `[TELEGRAM] Unknown tariff in payload: ${payment.invoice_payload}`,
        );
        await ctx.reply(
          'Оплата получена, но тариф распознать не удалось. Напишите в поддержку — разберёмся вручную.',
        );
        return;
      }

      // Сверка суммы: payload задаём мы, но платёж приходит извне. Если
      // заплатили меньше цены тарифа — выдавать доступ нельзя.
      const tariff = await this.tariffService.findTariffByCode(code);
      if (payment.total_amount < tariff.priceStars) {
        this.logger.error(
          `[TELEGRAM] Amount mismatch for ${code}: paid=${payment.total_amount} expected=${tariff.priceStars}`,
        );
        await ctx.reply(
          'Оплата получена, но сумма не совпала с тарифом. Напишите в поддержку.',
        );
        return;
      }

      const customer = await this.customerService.findOneByTelegramId(
        user.id.toString(),
      );
      if (!customer) {
        this.logger.warn('[TELEGRAM] Customer not found');
        return;
      }

      await this.paymentService.create({
        customer,
        amount: payment.total_amount,
        currency: 'stars',
        method: 'telegram_stars',
      });

      // Без await продление терялось молча: платёж записан, пользователю
      // отрапортовано об успехе, а подписка не выдана.
      await this.subscriptionService.upsertUserSubscription({
        telegramId: user.id.toString(),
        period: code,
        createdVia: 'paid',
        platform: 'telegram_stars',
        amount: payment.total_amount,
      });

      await ctx.reply(
        `🎉 Оплата прошла успешно!\nВы получили премиум на ${days} дней. 🔥\nСпасибо, что выбираете нас 💙`,
      );
    } else {
      this.logger.warn(
        '[TELEGRAM] successful_payment event received, but no payment info found:',
        JSON.stringify(update),
      );
    }
  }
}
