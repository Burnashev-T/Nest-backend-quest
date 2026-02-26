import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({ example: '+79001234567' })
  @IsString()
  @Matches(/^\+7\d{10}$/)
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;

  @ApiProperty({ example: 'StrongPassword123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Иван', required: false })
  @IsString()
  name?: string;
}
