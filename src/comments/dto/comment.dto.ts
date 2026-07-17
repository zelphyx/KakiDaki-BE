import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'uuid-of-mountain' })
  @IsString()
  @IsNotEmpty()
  mountainId: string;

  @ApiProperty({ example: 'via Purwosari', description: 'Jalur naik gunung' })
  @IsString()
  @IsNotEmpty()
  trailName: string;

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

export class BlockCommentDto {
  @ApiProperty({
    example: 'Komentar mengandung ujaran kebencian.',
    required: false,
    description: 'Alasan pemblokiran (opsional)',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
