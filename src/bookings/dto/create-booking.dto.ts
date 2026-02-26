// bookings/dto/create-booking.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsArray,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Type(() => Number)
  questId: number;

  @ApiProperty({ example: '2025-06-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '15:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  childrenCount: number;

  @ApiProperty({ required: false, example: 'Хотим праздничный декор' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ type: [Number], example: [1, 2], required: false })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  serviceIds?: number[];
}
