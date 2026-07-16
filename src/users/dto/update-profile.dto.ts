import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Budi Santoso' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsInt()
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ example: '+6281234567890' })
  @IsString()
  @IsOptional()
  phone?: string;
}