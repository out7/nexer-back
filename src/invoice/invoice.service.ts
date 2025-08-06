import { TariffService } from '@/tariff/tariff.service';
import { TelegramService } from '@/telegram/telegram.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly tariffService: TariffService,
  ) {}

  async createTariffInvoice(code: string) {
    const tariff = await this.tariffService.findTariffByCode(code);

    const payload = `tariff:${tariff.code}:${Date.now()}`;

    const url = await this.telegramService.createInvoiceLink({
      title: 'VPN',
      description: 'VPN-доступ',
      payload,
      currency: 'XTR',
      provider_token: '',
      prices: [{ label: tariff.code, amount: tariff.priceStars }],
    });

    return { url };
  }
}
