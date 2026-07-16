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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MountainsService } from './mountains.service';
import { CreateMountainDto, UpdateMountainDto } from './dto/mountain.dto';
import { ImportMountainDto } from './dto/discovery.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Mountains')
@Controller('mountains')
export class MountainsController {
  constructor(private readonly mountainsService: MountainsService) {}

  @Get()
  @ApiOperation({ summary: 'List all mountains' })
  findAll() {
    return this.mountainsService.findAll();
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search public peaks from OpenStreetMap (with import status)',
  })
  @ApiQuery({ name: 'q', example: 'semeru' })
  searchExternal(@Query('q') q: string) {
    return this.mountainsService.searchExternal(q);
  }

  @Post('import')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Import a peak from search results into the catalog',
  })
  importMountain(@Body() dto: ImportMountainDto) {
    return this.mountainsService.importMountain(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a mountain by id' })
  findOne(@Param('id') id: string) {
    return this.mountainsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a mountain' })
  create(@Body() dto: CreateMountainDto) {
    return this.mountainsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a mountain' })
  update(@Param('id') id: string, @Body() dto: UpdateMountainDto) {
    return this.mountainsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a mountain' })
  remove(@Param('id') id: string) {
    return this.mountainsService.remove(id);
  }
}
