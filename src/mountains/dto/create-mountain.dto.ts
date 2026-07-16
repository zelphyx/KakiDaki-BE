import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export enum Difficulty {
  EASY = 'EASY',
  MODERATE = 'MODERATE',
  HARD = 'HARD',
  EXTREME = 'EXTREME',
}

export class CreateMountainDto {
  @ApiProperty({ example: 'Gunung Semeru' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 3676, description: 'Elevation in meters' })
  @IsNumber()
  @Min(0)
  elevationM!: number;

  @ApiProperty({ enum: Difficulty, example: 'EXTREME' })
  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @ApiProperty({ example: 13.5, description: 'Distance to peak in km' })
  @IsNumber()
  @Min(0)
  distanceToPeakKm!: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  baseTempC?: number;

  @ApiProperty({ example: -8.1077 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 112.922 })
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ example: 'Highest mountain in Java' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/semeru.jpg' })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}
