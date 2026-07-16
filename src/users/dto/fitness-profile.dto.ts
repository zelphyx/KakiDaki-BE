import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FitnessProfileDto {
  @ApiPropertyOptional({ example: 20.5, description: 'Weekly distance in km' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weeklyDistanceKm?: number;

  @ApiPropertyOptional({ example: 1200, description: 'Weekly elevation gain in m' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weeklyElevationM?: number;

  @ApiPropertyOptional({ example: 15, description: 'Longest hike in km' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  longestHikeKm?: number;

  @ApiPropertyOptional({ example: 6.5, description: 'Average pace in min/km' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  avgPaceMinPerKm?: number;

  @ApiPropertyOptional({ example: 60, description: 'Resting heart rate bpm' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  restingHeartRate?: number;

  @ApiPropertyOptional({
    example: 'intermediate',
    enum: ['beginner', 'intermediate', 'advanced'],
  })
  @IsIn(['beginner', 'intermediate', 'advanced'])
  @IsOptional()
  experienceLevel?: string;
}