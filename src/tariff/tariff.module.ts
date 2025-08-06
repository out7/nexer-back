import { TariffController } from '@/tariff/tariff.controller';
import { TariffService } from '@/tariff/tariff.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [TariffController],
  providers: [TariffService],
  exports: [TariffService],
})
export class TariffModule {}
