import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString, Min } from 'class-validator';

export class CreateExpeditionDto {
  @ApiProperty({ example: 'cmrnjhdky00014xus1m2p9csk' })
  @IsString()
  mountainId!: string;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 3, default: 1 })
  @IsInt()
  @Min(1)
  memberCount!: number;
}