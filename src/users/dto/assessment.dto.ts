import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AssessmentDto {
  @ApiProperty({ example: 170, description: 'Height in cm' })
  @IsNumber()
  @Min(1)
  heightCm: number;

  @ApiProperty({ example: 65, description: 'Weight in kg' })
  @IsNumber()
  @Min(1)
  weightKg: number;

  @ApiPropertyOptional({ example: 'No known allergies or conditions' })
  @IsString()
  @IsOptional()
  medicalHistory?: string;
}