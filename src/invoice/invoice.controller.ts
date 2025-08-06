import { serialize } from '@/common/helpers/serialize';
import { InvoiceUrlDto } from '@/invoice/dto/invoice-url.dto';
import { InvoiceService } from '@/invoice/invoice.service';
import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Invoice')
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get('tariff/:code')
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
  async getInvoice(@Param('code') code: string): Promise<InvoiceUrlDto> {
    return serialize(
      InvoiceUrlDto,
      await this.invoiceService.createTariffInvoice(code),
    );
  }
}
