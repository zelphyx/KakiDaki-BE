import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpsertFitnessProfileDto {
  @ApiProperty({ example: 15, required: false, description: 'Weekly distance (km)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyDistanceKm?: number;

  @ApiProperty({ example: 800, required: false, description: 'Weekly elevation gain (m)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyElevationM?: number;

  @ApiProperty({ example: 12, required: false, description: 'Longest recent hike (km)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  longestHikeKm?: number;

  @ApiProperty({ example: 6.5, required: false, description: 'Average pace (min/km)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  avgPaceMinPerKm?: number;

  @ApiProperty({ example: 60, required: false, description: 'Resting heart rate (bpm)' })
  @IsOptional()
  @IsInt()
  @Min(30)
  restingHeartRate?: number;

  @ApiProperty({
    example: 'intermediate',
    required: false,
    enum: ['beginner', 'intermediate', 'advanced'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  experienceLevel?: string;
}
