import { RefreshTokenDto } from '@/auth/dto/refresh-token.dto';
import { RefreshAuthGuard } from '@/auth/guards/refresh-auth.guard';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
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
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { TelegramAuthGuard } from './guards/tma-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Authorization via TMA',
    description: 'Authorizes the user and returns access tokens.',
  })
  @ApiOkResponse({ type: AuthTokensDto })
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

  @ApiOperation({
    summary: 'Refresh tokens',
    description:
      'This endpoint allows you to refresh the access token. Requires a valid refresh token.',
  })
  @ApiBody({
    description: 'Request body for token refresh',
    type: RefreshTokenDto,
  })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiBadRequestResponse({ description: 'Invalid refresh token format' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user.telegramId);
  }
}
