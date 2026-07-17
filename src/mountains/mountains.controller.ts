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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { MountainsService } from './mountains.service';
import { CreateMountainDto, UpdateMountainDto } from './dto/mountain.dto';
import { ImportMountainDto } from './dto/discovery.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'mountains');
const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
];

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Create a mountain with image upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Gunung Semeru' },
        elevationM: { type: 'number', example: 3676 },
        difficulty: { type: 'string', enum: ['EASY', 'MODERATE', 'HARD', 'EXTREME'], example: 'HARD' },
        distanceToPeakKm: { type: 'number', example: 12.5 },
        latitude: { type: 'number', example: -8.1077 },
        longitude: { type: 'number', example: 112.922 },
        baseTempC: { type: 'number', example: 10 },
        description: { type: 'string', example: 'Gunung tertinggi di Jawa' },
        file: {
          type: 'string',
          format: 'binary',
          description: `Accepted: ${ALLOWED_MIMETYPES.join(', ')}. Max 10MB.`,
        },
      },
      required: ['name', 'elevationM', 'difficulty', 'distanceToPeakKm', 'latitude', 'longitude'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIMETYPES.join(', ')}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @Body() dto: CreateMountainDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl = dto.imageUrl;

    if (file) {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      const ext = path.extname(file.originalname) || `.${file.mimetype.split('/')[1]}`;
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(filepath, file.buffer);
      imageUrl = `/uploads/mountains/${filename}`;
    }

    return this.mountainsService.create({ ...dto, imageUrl });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Update a mountain (with optional image upload)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        elevationM: { type: 'number' },
        difficulty: { type: 'string', enum: ['EASY', 'MODERATE', 'HARD', 'EXTREME'] },
        distanceToPeakKm: { type: 'number' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        baseTempC: { type: 'number' },
        description: { type: 'string' },
        file: {
          type: 'string',
          format: 'binary',
          description: `Accepted: ${ALLOWED_MIMETYPES.join(', ')}. Max 10MB.`,
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIMETYPES.join(', ')}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMountainDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl = dto.imageUrl;

    if (file) {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      const ext = path.extname(file.originalname) || `.${file.mimetype.split('/')[1]}`;
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(filepath, file.buffer);
      imageUrl = `/uploads/mountains/${filename}`;
    }

    return this.mountainsService.update(id, { ...dto, imageUrl });
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Delete a mountain' })
  remove(@Param('id') id: string) {
    return this.mountainsService.remove(id);
  }
}
