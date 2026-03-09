import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  MaxLength,
  Matches,
  IsPositive,
  IsUrl,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuestDto {
  @ApiProperty({ example: 'Пиратский квест' })
  @IsString()
  @MaxLength(255)
  @Matches(/^[а-яА-ЯёЁa-zA-Z0-9\s\-\.\,!?]+$/, {
    message:
      'Название может содержать только буквы, цифры, пробелы и знаки препинания',
  })
  title: string;

  @ApiProperty({ example: 'Описание...' })
  @IsString()
  @MaxLength(2000)
  @Matches(/^[^<>]*$/, {
    message: 'Описание не должно содержать символы < и >',
  })
  description: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @IsPositive()
  @Min(0)
  @Type(() => Number)
  basePricePerHour: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  extraPlayerPrice: number;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @IsPositive()
  @Min(0)
  @Type(() => Number)
  depositPerHour: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  maxParticipants: number;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-zA-Z0-9\/\-_]+$/, {
    each: true,
    message: 'Ключ изображения содержит недопустимые символы',
  })
  images?: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
