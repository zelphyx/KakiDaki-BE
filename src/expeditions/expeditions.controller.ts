import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExpeditionsService } from './expeditions.service';
import { CreateExpeditionDto } from './dto/create-expedition.dto';

@ApiTags('Expeditions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expeditions')
export class ExpeditionsController {
  constructor(private expeditionsService: ExpeditionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create expedition (consumes 1 credit)' })
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
  @ApiOperation({ summary: 'Get expedition detail' })
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.expeditionsService.findOne(userId, id);
  }

  @Post(':id/reanalyze')
  @ApiOperation({ summary: 'Re-run AI readiness + weather analysis' })
  reanalyze(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.expeditionsService.reanalyze(userId, id);
  }
}