import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StravaService } from './strava.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Strava')
@Controller('strava')
export class StravaController {
  constructor(private readonly stravaService: StravaService) {}

  @Get('connect')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Strava OAuth authorization URL' })
  connect(@CurrentUser('userId') userId: string) {
    return { url: this.stravaService.getAuthUrl(userId) };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Strava OAuth callback (redirect target)' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const result = await this.stravaService.handleCallback(code, state);
    return res.json(result);
  }

  @Post('sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sync recent Strava activities into training logs' })
  sync(@CurrentUser('userId') userId: string) {
    return this.stravaService.syncActivities(userId);
  }

  @Get('training-logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List synced training logs' })
  logs(@CurrentUser('userId') userId: string) {
    return this.stravaService.getTrainingLogs(userId);
  }
}
