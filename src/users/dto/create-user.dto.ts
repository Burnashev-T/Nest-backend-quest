// users/dto/create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: '+79001234567' })
  @IsString()
  @Matches(/^\+7\d{10}$/, {
    message: 'Телефон должен быть в формате +7XXXXXXXXXX',
  })
  phone: string;

  @ApiProperty({ example: 'StrongPassword123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ required: false, example: 'Иван' })
  @IsString()
  name?: string;
}
