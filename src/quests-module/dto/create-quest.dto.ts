import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuestDto {
  @ApiProperty({ example: 'Пиратский квест' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Описание...' })
  @IsString()
  description: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePricePerHour: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(1000)
  @Max(5000)
  @Type(() => Number)
  extraPlayerPrice: number;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  depositPerHour: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxParticipants: number;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
