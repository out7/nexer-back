import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { serialize } from '@/common/helpers/serialize';
import { CustomerResponseDto } from '@/customer/dto/customer-response.dto';
import { SubscriptionService } from '@/subscription/subscription.service';
import { Controller, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Claim unclaimed bonus days',
    description:
      'Converts all unclaimed bonus days into subscription time for the authenticated user and returns the updated customer.',
  })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiBadRequestResponse({ description: 'No unclaimed bonus days' })
  @UseGuards(JwtAuthGuard)
  @Post('bonus/claim')
  async claimMyBonus(@Request() req): Promise<CustomerResponseDto> {
    const telegramId = String(req.user.telegramId);

    const customer = await this.subscriptionService.claimBonusDays(telegramId);
    return serialize(CustomerResponseDto, customer);
  }
}
