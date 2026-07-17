import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VisionService } from './vision.service';

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

@ApiTags('Vision')
@Controller('vision')
export class VisionController {
  private readonly logger = new Logger(VisionController.name);

  constructor(private readonly visionService: VisionService) {}

  @Post('recognize')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload image file and recognize objects via AI' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: `Accepted: ${ALLOWED_MIMETYPES.join(', ')}. Max 10MB.`,
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
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
  async recognize(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.logger.log(
      `Recognizing image: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`,
    );

    const result = await this.visionService.recognizeImage(
      file.buffer,
      file.mimetype,
    );

    return {
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      ...result,
    };
  }
}