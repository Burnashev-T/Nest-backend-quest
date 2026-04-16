import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { TelegramService } from '../telegram/telegram/telegram.service';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly DAILY_INVITE_LIMIT = 5;
  private readonly INVITE_CODE_TTL = 86400; // 24 часа

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private telegramService: TelegramService,
  ) {}

  private generateCode(): string {
    return randomInt(100000, 999999).toString();
  }

  // ==================== ЗАПРОС ПРИГЛАШЕНИЯ ====================
  async requestInvite(phone: string, name: string) {
    // Никакой нормализации на бэке — принимаем телефон как есть
    const cleanPhone = phone.trim();

    console.log(`[DEBUG] requestInvite - received phone: "${cleanPhone}"`);

    const existing = await this.usersService.findByPhone(cleanPhone);
    if (existing) {
      throw new BadRequestException('Этот номер телефона уже зарегистрирован');
    }

    const today = new Date().toISOString().split('T')[0];
    const limitKey = `invite:limit:${today}`;
    const currentCount = (await this.redisService.get(limitKey)) || '0';

    if (parseInt(currentCount) >= this.DAILY_INVITE_LIMIT) {
      throw new BadRequestException(
        'Сегодня лимит приглашений исчерпан (5 шт). Попробуйте завтра.',
      );
    }

    const code = this.generateCode();

    // Сохраняем код по телефону "как есть"
    await this.redisService.set(
      `invite:${cleanPhone}`,
      code,
      this.INVITE_CODE_TTL,
    );

    await this.redisService.set(
      limitKey,
      (parseInt(currentCount) + 1).toString(),
      86400,
    );

    console.log(`[DEBUG] Code ${code} saved for phone: "${cleanPhone}"`);

    const messageId = await this.telegramService.sendInviteCodeMessage(
      phone,
      name,
      code,
    );

    if (messageId) {
      await this.redisService.set(
        `invite:msg:${cleanPhone}`,
        messageId.toString(),
        this.INVITE_CODE_TTL,
      );
    }

    return {
      success: true,
      message: 'Код приглашения отправлен супер админу в Telegram',
    };
  }

  // ==================== РЕГИСТРАЦИЯ ПО ПРИГЛАШЕНИЮ ====================
  async registerWithInvite(
    phone: string,
    name: string,
    code: string,
    password: string,
  ) {
    const cleanPhone = phone.trim();
    const cleanCode = code.trim();

    console.log(
      `[DEBUG] RegisterWithInvite - received phone: "${cleanPhone}", code: "${cleanCode}"`,
    );

    const storedCode = await this.redisService.get(`invite:${cleanPhone}`);

    console.log(`[DEBUG] Stored code for "${cleanPhone}": "${storedCode}"`);

    if (!storedCode) {
      throw new BadRequestException(
        'Код приглашения не найден или уже использован',
      );
    }

    if (storedCode !== cleanCode) {
      throw new BadRequestException('Неверный код приглашения');
    }

    const user = await this.usersService.create(cleanPhone, password, name);

    await this.redisService.del(`invite:${cleanPhone}`);

    const messageIdStr = await this.redisService.get(
      `invite:msg:${cleanPhone}`,
    );
    if (messageIdStr) {
      await this.telegramService
        .deleteMessage(parseInt(messageIdStr))
        .catch(() => {});
      await this.redisService.del(`invite:msg:${cleanPhone}`);
    }

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  // ==================== ВХОД ====================
  async login(phone: string, password: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) throw new UnauthorizedException('Неверный телефон или пароль');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid)
      throw new UnauthorizedException('Неверный телефон или пароль');

    return this.generateTokens(user.id, user.role);
  }

  // ==================== ГЕНЕРАЦИЯ ТОКЕНОВ ====================
  private async generateTokens(userId: number, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '60m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    await this.redisService.set(
      `refresh:${userId}:${refreshToken}`,
      'valid',
      7 * 24 * 60 * 60,
    );

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const userId = payload.sub;
      const stored = await this.redisService.get(
        `refresh:${userId}:${refreshToken}`,
      );
      if (!stored)
        throw new UnauthorizedException('Недействительный refresh токен');

      await this.redisService.del(`refresh:${userId}:${refreshToken}`);

      return this.generateTokens(userId, payload.role);
    } catch (e) {
      throw new UnauthorizedException('Недействительный refresh токен');
    }
  }

  async logout(userId: number, refreshToken: string) {
    await this.redisService.del(`refresh:${userId}:${refreshToken}`);
    return { success: true };
  }

  async getProfile(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name,
      isPhoneConfirmed: user.isPhoneConfirmed,
    };
  }
}
