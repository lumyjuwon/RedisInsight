import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TimeoutInterceptor } from 'src/modules/core/interceptors/timeout.interceptor';
import {
  RedisSentinelBusinessService,
} from 'src/modules/shared/services/redis-sentinel-business/redis-sentinel-business.service';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { SentinelMaster } from 'src/modules/redis-sentinel/models/sentinel';
import { ApiEndpoint } from 'src/decorators/api-endpoint.decorator';
import { CreateDatabaseDto } from 'src/modules/database/dto/create.database.dto';
import { Database } from 'src/modules/database/models/database';

@ApiTags('Redis OSS Sentinel')
@Controller('')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class SentinelController {
  constructor(private redisSentinelService: RedisSentinelBusinessService) {}

  @Post('get-masters')
  @UseInterceptors(new TimeoutInterceptor(ERROR_MESSAGES.CONNECTION_TIMEOUT))
  @ApiEndpoint({
    description: 'Get master groups',
    statusCode: 200,
    responses: [
      {
        status: 200,
        type: SentinelMaster,
        isArray: true,
      },
    ],
  })
  async getMasters(
    @Body() dto: CreateDatabaseDto,
  ): Promise<SentinelMaster[]> {
    return await this.redisSentinelService.connectAndGetMasters(dto as Database);
  }
}
