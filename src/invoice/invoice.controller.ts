import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { serialize } from '@/common/helpers/serialize';
import { InvoiceUrlDto } from '@/invoice/dto/invoice-url.dto';
import { InvoiceService } from '@/invoice/invoice.service';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Invoice')
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @ApiOperation({
    summary: 'Generate a payment link for a tariff using Telegram Stars',
  })
  @ApiParam({
    name: 'code',
    description: 'Unique tariff code (e.g., "quarterly")',
  })
  @ApiResponse({
    status: 200,
    description:
      'Direct payment URL for the selected tariff via Telegram Stars',
    type: InvoiceUrlDto,
  })
  @ApiNotFoundResponse({
    description: 'Tariff not found',
  })
  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('tariff/:code')
  async getInvoice(@Param('code') code: string): Promise<InvoiceUrlDto> {
    return serialize(
      InvoiceUrlDto,
      await this.invoiceService.createTariffInvoice(code),
    );
  }
}
