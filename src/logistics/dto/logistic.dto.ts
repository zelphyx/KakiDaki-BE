import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { LogisticCategory } from '@prisma/client';

export class CreateLogisticDto {
  @ApiProperty({ example: 'Tenda 4 orang' })
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @ApiProperty({ example: '1 unit' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ enum: LogisticCategory, example: LogisticCategory.SHELTER })
  @IsEnum(LogisticCategory)
  category: LogisticCategory;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateLogisticDto extends PartialType(CreateLogisticDto) {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isPacked?: boolean;
}
