import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

export class CreateExpeditionDto {
  @ApiProperty({ example: 'uuid-of-mountain' })
  @IsString()
  @IsNotEmpty()
  mountainId: string;

  @ApiProperty({ example: '2026-08-17' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-19' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 4, description: 'Number of members' })
  @IsInt()
  @Min(1)
  memberCount: number;
}
