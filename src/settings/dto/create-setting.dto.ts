import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSettingDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  value: string;
}
