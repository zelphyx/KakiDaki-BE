import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get expedition detail with logistics' })
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
}
