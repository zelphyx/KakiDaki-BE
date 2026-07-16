import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Difficulty } from '@prisma/client';

export class CreateMountainDto {
  @ApiProperty({ example: 'Gunung Semeru' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 3676, description: 'Elevation in meters' })
  @IsNumber()
  @Min(0)
  elevationM: number;

  @ApiProperty({ enum: Difficulty, example: Difficulty.HARD })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @ApiProperty({ example: 12.5, description: 'Distance to peak in km' })
  @IsNumber()
  @Min(0)
  distanceToPeakKm: number;

  @ApiProperty({ example: 10, required: false, description: 'Base temp °C' })
  @IsOptional()
  @IsNumber()
  baseTempC?: number;

  @ApiProperty({ example: -8.1077 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 112.922 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateMountainDto extends PartialType(CreateMountainDto) {}
