import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { CreateBookingDto } from './create-booking.dto';

export class AdminCreateBookingDto extends CreateBookingDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  userId: number;
}
