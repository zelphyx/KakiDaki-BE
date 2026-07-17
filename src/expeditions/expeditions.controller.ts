import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ExpeditionsService } from './expeditions.service';
import { CreateExpeditionDto } from './dto/expedition.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Expeditions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expeditions')
export class ExpeditionsController {
  constructor(private readonly expeditionsService: ExpeditionsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create an expedition preparation (consumes 1 credit, runs AI readiness + weather)',
  })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateExpeditionDto,
  ) {
    return this.expeditionsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my expeditions' })
  findAll(@CurrentUser('userId') userId: string) {
    return this.expeditionsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expedition detail with logistics and training plan' })
  @ApiResponse({
    status: 200,
    description: 'Returns the expedition details including the AI training plan.',
    schema: {
      example: {
        id: 'uuid',
        status: 'READY',
        readinessScore: 75,
        decision: 'GO',
        trainingPlan: {
          id: 'uuid',
          summary: 'Kondisi BMI Anda sedikit berlebih...',
          tasks: [
            {
              id: 'uuid',
              activityType: 'RUN',
              targetDistanceKm: 3,
              targetElevationM: 0,
              description: 'Lari santai 3km',
              isCompleted: false,
              matchedLogId: null,
            }
          ]
        }
      }
    }
  })
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.expeditionsService.findOne(userId, id);
  }

  @Post(':id/reanalyze')
  @ApiOperation({
    summary: 'Re-run AI readiness + weather analysis for an expedition',
  })
  reanalyze(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.expeditionsService.analyze(userId, id);
  }

  @Get(':id/weather')
  @ApiOperation({ summary: 'Get 7-day weather outlook up to climb day' })
  @ApiResponse({
    status: 200,
    description: 'Returns the 7-day weather outlook.',
    schema: {
      example: {
        weekOutlook: [
          {
            date: '2026-07-17',
            tempMaxC: 21.5,
            tempMinC: 12.0,
            tempMeanC: 15.8,
            precipitationMm: 0,
            windSpeedMax: 10.4,
            weatherCode: 1,
            summary: 'Mainly clear',
            sunrise: '2026-07-17T05:40',
            sunset: '2026-07-17T17:45'
          }
        ]
      }
    }
  })
  getWeather(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.expeditionsService.getWeather(userId, id);
  }
}
