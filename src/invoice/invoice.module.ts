import { TariffModule } from '@/tariff/tariff.module';
import { TelegramModule } from '@/telegram/telegram.module';
import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';

@Module({
  imports: [TelegramModule, TariffModule],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule {}
