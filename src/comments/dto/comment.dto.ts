import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'uuid-of-mountain' })
  @IsString()
  @IsNotEmpty()
  mountainId: string;

  @ApiProperty({ example: 'Jalur via Ranu Pani cukup licin saat hujan.' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class VoteDto {
  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  @IsString()
  @IsIn(['up', 'down'])
  vote: 'up' | 'down';
}
