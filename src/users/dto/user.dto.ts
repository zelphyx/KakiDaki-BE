import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Gender } from '@prisma/client';

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

  @ApiProperty({ enum: Gender, example: Gender.MALE, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
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
    required: false,
    description: 'Free-text medical summary (legacy/optional)',
  })
  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @ApiProperty({
    example: 'Asma ringan, terkontrol dengan inhaler.',
    required: false,
    description: 'Riwayat penyakit pernapasan/jantung',
  })
  @IsOptional()
  @IsString()
  respiratoryHeartHistory?: string;

  @ApiProperty({
    example: 'Pernah cedera lutut kiri 2023, sudah pulih.',
    required: false,
    description: 'Riwayat cedera fisik (sendi/tulang)',
  })
  @IsOptional()
  @IsString()
  physicalInjuryHistory?: string;

  @ApiProperty({
    example: 'Alergi dingin, alergi obat golongan penisilin.',
    required: false,
    description: 'Alergi cuaca/obat (opsional)',
  })
  @IsOptional()
  @IsString()
  weatherDrugAllergy?: string;
}
