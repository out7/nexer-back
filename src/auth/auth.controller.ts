import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthDataDto } from './dto/auth-data.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { TelegramAuthGuard } from './guards/tma-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Авторизация через TMA',
    description: 'Авторизует пользователя и выдаёт токены доступа.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Telegram initData is missing' })
  @ApiUnauthorizedResponse({ description: 'Invalid Telegram initData' })
  @ApiInternalServerErrorResponse({
    description: 'Failed to find or create user',
  })
  @ApiBody({ type: AuthDataDto })
  @UseGuards(TelegramAuthGuard)
  @Post('tma')
  @HttpCode(HttpStatus.OK)
  authUser(@Body() authDataDto: AuthDataDto) {
    return this.authService.authUser(authDataDto);
  }
}
