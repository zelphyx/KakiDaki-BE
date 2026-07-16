import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Budi Pendaki', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 25, required: false })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  age?: number;

  @ApiProperty({ example: '+628123456789', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class AssessmentDto {
  @ApiProperty({ example: 170, description: 'Height in cm (tb)' })
  @IsNumber()
  @Min(50)
  @Max(250)
  heightCm: number;

  @ApiProperty({ example: 65, description: 'Weight in kg (bb)' })
  @IsNumber()
  @Min(20)
  @Max(300)
  weightKg: number;

  @ApiProperty({
    example: 'Asthma, controlled. No heart conditions.',
    description: 'Medical history (history medic)',
  })
  @IsString()
  medicalHistory: string;
}
