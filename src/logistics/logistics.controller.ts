import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LogisticsService } from './logistics.service';
import { CreateLogisticDto, UpdateLogisticDto } from './dto/logistic.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Logistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Get('expeditions/:expeditionId/logistics')
  @ApiOperation({ summary: 'List logistics for an expedition' })
  list(
    @CurrentUser('userId') userId: string,
    @Param('expeditionId') expeditionId: string,
  ) {
    return this.logisticsService.listByExpedition(userId, expeditionId);
  }

  @Post('expeditions/:expeditionId/logistics/generate')
  @ApiOperation({
    summary: 'Generate AI-suggested packing list (replaces existing items)',
  })
  generate(
    @CurrentUser('userId') userId: string,
    @Param('expeditionId') expeditionId: string,
  ) {
    return this.logisticsService.generateSuggestions(userId, expeditionId);
  }

  @Post('expeditions/:expeditionId/logistics')
  @ApiOperation({ summary: 'Add a logistic item manually' })
  add(
    @CurrentUser('userId') userId: string,
    @Param('expeditionId') expeditionId: string,
    @Body() dto: CreateLogisticDto,
  ) {
    return this.logisticsService.addItem(userId, expeditionId, dto);
  }

  @Patch('logistics/:itemId')
  @ApiOperation({ summary: 'Update a logistic item (e.g. mark as packed)' })
  update(
    @CurrentUser('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateLogisticDto,
  ) {
    return this.logisticsService.updateItem(userId, itemId, dto);
  }

  @Delete('logistics/:itemId')
  @ApiOperation({ summary: 'Remove a logistic item' })
  remove(
    @CurrentUser('userId') userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.logisticsService.removeItem(userId, itemId);
  }
}
