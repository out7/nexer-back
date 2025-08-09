import { ActivityLogService } from '@/activity-log/activity-log.service';
import { ActivityLogDto } from '@/activity-log/dto/activity-log.dto';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Activity')
@Controller('activity')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get activity logs for customer' })
  @ApiOkResponse({ type: ActivityLogDto, isArray: true })
  async list(
    @Param('customerId') customerId: string,
  ): Promise<ActivityLogDto[]> {
    return this.activityLogService.findByCustomerId(customerId);
  }
}
