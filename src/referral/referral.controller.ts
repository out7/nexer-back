import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { serialize } from '@/common/helpers/serialize';
import { CustomerService } from '@/customer/customer.service';
import { ReferralDto } from '@/referral/dto/referral.dto';
import {
  Controller,
  Get,
  NotFoundException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ReferralService } from './referral.service';

@Controller('referrals')
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly customerService: CustomerService,
  ) {}

  @ApiOperation({
    summary: 'Get my referrals',
    description:
      'Returns a list of customers invited by the current authenticated user',
  })
  @ApiOkResponse({ type: [ReferralDto] })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyReferrals(@Request() req): Promise<ReferralDto[]> {
    const telegramId = req.user.telegramId;

    const customer = await this.customerService.findOneByTelegramId(
      String(telegramId),
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const referrals = await this.referralService.listByReferrer(customer.id);
    return serialize(ReferralDto, referrals);
  }
}
