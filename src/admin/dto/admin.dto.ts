import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Difficulty } from '@prisma/client';

export class BlockCommentDto {
  @ApiProperty({ example: 'Inappropriate language', description: 'Reason for blocking the comment' })
  @IsString()
  @IsNotEmpty()
  blockReason: string;
}

export class AdminCreateMountainDto {
  @ApiProperty({ example: 'Gunung Rinjani' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 3726, description: 'Elevation in meters' })
  @IsNumber()
  @Min(1)
  elevationM: number;

  @ApiProperty({ enum: Difficulty, example: Difficulty.HARD })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @ApiProperty({ example: 10.5, description: 'Distance from basecamp to peak in km' })
  @IsNumber()
  @Min(0.1)
  distanceToPeakKm: number;

  @ApiPropertyOptional({ example: -8.411, description: 'Latitude for weather' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 116.457, description: 'Longitude for weather' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 15, description: 'Reference base temperature in C' })
  @IsNumber()
  @IsOptional()
  baseTempC?: number;

  @ApiPropertyOptional({ example: 'Gunung berapi tertinggi kedua di Indonesia' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/rinjani.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
