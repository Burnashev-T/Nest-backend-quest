// blocked-slots/dto/create-blocked-slot.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsDateString, IsString, IsOptional } from 'class-validator';

export class CreateBlockedSlotDto {
  @ApiProperty()
  @IsNumber()
  questId: number;

  @ApiProperty({ example: '2025-06-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
