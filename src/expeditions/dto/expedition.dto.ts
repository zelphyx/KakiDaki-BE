import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Hiking preparation form.
 *
 * Target Gunung + Tanggal Pendakian are required. The personal fields
 * (umur, jenis kelamin, tinggi, berat, riwayat medis, alergi) are pulled
 * from the user's profile/assessment automatically. They can optionally be
 * overridden per-expedition using the fields below.
 */
export class CreateExpeditionDto {
  @ApiProperty({ example: 'uuid-of-mountain', description: 'Target Gunung' })
  @IsString()
  @IsNotEmpty()
  mountainId: string;

  @ApiProperty({ example: '2026-08-17', description: 'Tanggal mulai pendakian' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-19', description: 'Tanggal selesai pendakian' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 4, description: 'Jumlah anggota' })
  @IsInt()
  @Min(1)
  memberCount: number;


  @ApiProperty({ example: 28, required: false, description: 'Override umur' })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  age?: number;

  @ApiProperty({
    example: 170,
    required: false,
    description: 'Override tinggi badan (cm)',
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(250)
  heightCm?: number;

  @ApiProperty({
    example: 65,
    required: false,
    description: 'Override berat badan (kg)',
  })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  weightKg?: number;
}
