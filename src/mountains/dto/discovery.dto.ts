import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Difficulty } from '@prisma/client';

export class SearchMountainDto {
  @ApiProperty({ example: 'semeru', description: 'Peak name to search' })
  @IsString()
  @IsNotEmpty()
  q: string;
}

export class ImportMountainDto {
  @ApiProperty({ example: 'Gunung Merbabu' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 3145 })
  @IsNumber()
  elevationM: number;

  @ApiProperty({ example: -7.4546 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 110.4396 })
  @IsNumber()
  longitude: number;

  @ApiProperty({
    enum: Difficulty,
    required: false,
    description: 'Override auto-estimated difficulty',
  })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiProperty({
    example: 9,
    required: false,
    description: 'Override auto-estimated distance to peak (km)',
  })
  @IsOptional()
  @IsNumber()
  distanceToPeakKm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
