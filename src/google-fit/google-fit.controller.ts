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
import { GoogleFitService } from './google-fit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Google Fit')
@Controller('google-fit')
export class GoogleFitController {
  constructor(private readonly googleFitService: GoogleFitService) {}

  @Get('connect')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Google Fit OAuth authorization URL' })
  connect(@CurrentUser('userId') userId: string) {
    return { url: this.googleFitService.getAuthUrl(userId) };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Google Fit OAuth callback' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const result = await this.googleFitService.handleCallback(code, state);
    return res.json(result);
  }

  @Post('sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sync recent Google Fit activities into training logs' })
  sync(@CurrentUser('userId') userId: string) {
    return this.googleFitService.syncActivities(userId);
  }

  @Get('training-logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List synced training logs' })
  logs(@CurrentUser('userId') userId: string) {
    return this.googleFitService.getTrainingLogs(userId);
  }
}
