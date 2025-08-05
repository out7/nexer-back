import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { serialize } from '@/common/helpers/serialize';
import { TariffDto } from '@/tariff/dto/tariff.dto';
import { TariffService } from '@/tariff/tariff.service';
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('tariffs')
export class TariffController {
  constructor(private readonly tariffService: TariffService) {}

  @ApiOperation({
    summary: 'Get available tariff plans',
    description:
      'Returns a list of available tariff (subscription) plans with pricing in RUB and Telegram Stars, including discounts if available.',
  })
  @ApiOkResponse({
    description: 'List of tariff plans',
    type: [TariffDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllTariffs() {
    const tariffs = await this.tariffService.getTariffs();
    return serialize(TariffDto, tariffs);
  }
}
