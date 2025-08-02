import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { serialize } from '../common/helpers/serialize';
import { CustomerService } from './customer.service';
import { CustomerResponseDto } from './dto/customer-response.dto';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @ApiOperation({
    summary: 'Получить данные пользователя',
    description:
      'Этот эндпоинт доступен только для авторизованных пользователей. Возвращает данные пользователя.',
  })
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Неавторизованный доступ' })
  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    const customer = this.customerService.getProfile(req.user.telegramId);
    return serialize(CustomerResponseDto, customer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('trial')
  @ApiResponse({ status: 201, description: 'Trial activated' })
  @ApiResponse({ status: 400, description: 'Trial already used' })
  async activateTrial(@Request() req) {
    const customerUser = req.user as { telegramId: string };
    const customer = await this.customerService.activateTrial(
      customerUser.telegramId,
    );
    return serialize(CustomerResponseDto, customer);
  }
}
