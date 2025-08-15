import { ActivityLogService } from '@/activity-log/activity-log.service';
import { ActivityLogDto } from '@/activity-log/dto/activity-log.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { serialize } from '@/common/helpers/serialize';
import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Activity')
@Controller('activity')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @ApiOperation({ summary: 'Get activity logs for customer' })
  @ApiOkResponse({ type: ActivityLogDto, isArray: true })
  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Request() req): Promise<ActivityLogDto[]> {
    const customerUser = req.user as { telegramId: string };
    const customerLogs = await this.activityLogService.findByCustomerId(
      customerUser.telegramId,
    );
    return serialize(ActivityLogDto, customerLogs);
  }
}
