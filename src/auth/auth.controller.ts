import { RefreshTokenDto } from '@/auth/dto/refresh-token.dto';
import { RefreshAuthGuard } from '@/auth/guards/refresh-auth.guard';
import { serialize } from '@/common/helpers/serialize';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
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
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Authorization via TMA',
    description: 'Authorizes the user and returns access tokens.',
  })
  @ApiOkResponse({ description: 'Tokens issued', type: AuthTokensDto })
  @ApiBadRequestResponse({ description: 'Telegram initData is missing' })
  @ApiUnauthorizedResponse({ description: 'Invalid Telegram initData' })
  @ApiInternalServerErrorResponse({
    description: 'Failed to find or create user',
  })
  @ApiBody({
    description: 'Request body for TMA authorization',
    type: AuthDataDto,
  })
  @UseGuards(TelegramAuthGuard)
  @Post('tma')
  @HttpCode(HttpStatus.OK)
  async authUser(@Body() authDataDto: AuthDataDto) {
    const tokens = await this.authService.authUser(authDataDto);
    return serialize(AuthTokensDto, tokens);
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
  @ApiOkResponse({ description: 'Tokens refreshed', type: AuthTokensDto })
  @ApiBadRequestResponse({ description: 'Invalid refresh token format' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  async refreshToken(@Request() req) {
    const tokens = await this.authService.refreshToken(req.user.telegramId);
    return serialize(AuthTokensDto, tokens);
  }
}
