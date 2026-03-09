// bookings/dto/create-booking.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsArray,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  questId: number;

  @ApiProperty({ example: '2025-06-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '15:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Время должно быть в формате HH:MM',
  })
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Время должно быть в формате HH:MM',
  })
  endTime: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  childrenCount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[а-яА-ЯёЁa-zA-Z0-9\s\-\.\,!?]*$/, {
    message: 'Комментарий содержит недопустимые символы',
  })
  comment?: string;

  @ApiProperty({ type: [Number], required: false })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  serviceIds?: number[];
}