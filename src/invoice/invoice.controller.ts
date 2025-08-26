import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { serialize } from '@/common/helpers/serialize';
import { InvoiceUrlDto } from '@/invoice/dto/invoice-url.dto';
import { PreparedMessageIdDto } from '@/invoice/dto/prepared-message-id.dto';
import { InvoiceService } from '@/invoice/invoice.service';
import { TelegramService } from '@/telegram/telegram.service';
import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Invoice')
@Controller('invoice')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly telegramService: TelegramService,
  ) {}

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

  @ApiOperation({
    summary: 'Create a prepared inline message and return its identifier',
    description:
      'Calls Telegram Bot API savePreparedInlineMessage and returns only the prepared message id.',
  })
  @ApiOkResponse({
    description: 'Prepared message identifier.',
    type: PreparedMessageIdDto,
  })
  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('share')
  async shareMessage(@Request() req) {
    const telegramId = req.user.telegramId;
    const msg = await this.telegramService.shareMessage(telegramId);
    return serialize(PreparedMessageIdDto, msg);
  }
}
