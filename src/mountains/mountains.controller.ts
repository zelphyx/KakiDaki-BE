import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MountainsService } from './mountains.service';
import { CreateMountainDto } from './dto/create-mountain.dto';
import { UpdateMountainDto } from './dto/update-mountain.dto';
import { ImportMountainDto } from './dto/import-mountain.dto';

@ApiTags('Mountains')
@Controller('mountains')
export class MountainsController {
  constructor(private mountainsService: MountainsService) {}

  @Get()
  @ApiOperation({ summary: 'List all mountains' })
  findAll() {
    return this.mountainsService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search peaks via OpenStreetMap (Indonesia only)' })
  search(@Query('q') q: string) {
    return this.mountainsService.search(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get mountain by ID' })
  findOne(@Param('id') id: string) {
    return this.mountainsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create mountain manually' })
  create(@Body() dto: CreateMountainDto) {
    return this.mountainsService.create(dto);
  }

  @Post('import')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Import mountain from search results' })
  import(@Body() dto: ImportMountainDto) {
    return this.mountainsService.import(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update mountain' })
  update(@Param('id') id: string, @Body() dto: UpdateMountainDto) {
    return this.mountainsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete mountain' })
  remove(@Param('id') id: string) {
    return this.mountainsService.remove(id);
  }
}