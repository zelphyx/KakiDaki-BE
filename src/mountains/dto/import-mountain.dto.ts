import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ImportMountainDto {
  @ApiProperty({ example: 'Gunung Semeru' })
  @IsString()
  name: string;

  @ApiProperty({ example: 3676 })
  @IsNumber()
  @Min(0)
  elevationM: number;

  @ApiProperty({ example: -8.1077 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 112.922 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ enum: ['EASY', 'MODERATE', 'HARD', 'EXTREME'] })
  @IsEnum(['EASY', 'MODERATE', 'HARD', 'EXTREME'])
  @IsOptional()
  difficulty?: string;

  @ApiPropertyOptional({ example: 13.5 })
  @IsNumber()
  @IsOptional()
  distanceToPeakKm?: number;

  @ApiPropertyOptional({ example: 'Highest mountain in Java' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/semeru.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}