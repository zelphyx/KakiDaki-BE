import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    example: 1,
    description: 'Number of preparation credits to purchase',
  })
  @IsInt()
  @Min(1)
  credits: number;
}
