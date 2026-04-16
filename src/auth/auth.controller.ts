import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RequestInviteDto } from './dto/request-invite.dto';
import { Throttle } from '@nestjs/throttler';
import { RegisterWithInviteDto } from './dto/register-with-invite.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.phone, dto.password);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any, @Body() dto: RefreshDto) {
    return this.authService.logout(req.user.userId, dto.refreshToken);
  }

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.userId);
  }

  @Post('request-invite')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async requestInvite(@Body() dto: RequestInviteDto) {
    if (!dto || !dto.phone || !dto.name) {
      throw new BadRequestException('Не указаны телефон или имя');
    }
    return this.authService.requestInvite(dto.phone, dto.name);
  }

@Post('register-with-invite')
async registerWithInvite(@Body() dto: RegisterWithInviteDto) {
  return this.authService.registerWithInvite(dto.phone, dto.name, dto.code, dto.password);
}
}
