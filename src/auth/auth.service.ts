import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  // Генерация 6-значного кода
  private generateCode(): string {
    return randomInt(100000, 999999).toString();
  }

  // Отправка SMS (заглушка)
  private async sendSms(phone: string, code: string): Promise<void> {
    // В реальности здесь вызов API SMS-провайдера
    console.log(`[SMS] To ${phone}: Ваш код подтверждения: ${code}`);
    // Для теста можно просто залогировать
  }

  // Шаг 1: отправка кода
  async sendCode(phone: string): Promise<{ success: boolean }> {
    // Проверка, не зарегистрирован ли уже номер
    const existing = await this.usersService.findByPhone(phone);
    if (existing) {
      throw new BadRequestException('Номер уже зарегистрирован');
    }

    // Проверка лимитов (можно реализовать через Redis счётчик)
    // Упрощённо: сохраняем код с TTL 5 минут
    const code = this.generateCode();
    await this.redisService.set(`sms:${phone}`, code, 300); // 5 минут

    // Отправляем SMS
    await this.sendSms(phone, code);

    return { success: true };
  }

  // Шаг 2: подтверждение кода и создание пользователя
  async verifyCode(
    phone: string,
    code: string,
    password: string,
    name?: string,
  ) {
    const storedCode = await this.redisService.get(`sms:${phone}`);
    if (!storedCode || storedCode !== code) {
      throw new BadRequestException('Неверный или просроченный код');
    }

    // Код верен – удаляем его
    await this.redisService.del(`sms:${phone}`);

    // Создаём пользователя
    const user = await this.usersService.create(phone, password, name);

    // Генерируем токены
    const tokens = await this.generateTokens(user.id, user.role);
    return tokens;
  }

  // Вход по паролю
  async login(phone: string, password: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) throw new UnauthorizedException('Неверный телефон или пароль');
    if (!user.isPhoneConfirmed)
      throw new UnauthorizedException('Номер не подтверждён');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid)
      throw new UnauthorizedException('Неверный телефон или пароль');

    return this.generateTokens(user.id, user.role);
  }

  // Генерация access и refresh токенов
  async generateTokens(userId: number, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // Сохраняем refresh токен в Redis (можно хранить хеш или просто метку)
    await this.redisService.set(
      `refresh:${userId}:${refreshToken}`,
      'valid',
      7 * 24 * 60 * 60, // 7 дней
    );

    return { accessToken, refreshToken };
  }

  // Обновление токенов по refresh
  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      const userId = payload.sub;

      // Проверяем, что такой refresh токен существует в Redis
      const stored = await this.redisService.get(
        `refresh:${userId}:${refreshToken}`,
      );
      if (!stored)
        throw new UnauthorizedException('Недействительный refresh токен');

      // Удаляем старый токен
      await this.redisService.del(`refresh:${userId}:${refreshToken}`);

      // Генерируем новую пару
      return this.generateTokens(userId, payload.role);
    } catch (e) {
      throw new UnauthorizedException('Недействительный refresh токен');
    }
  }

  // Выход (удаляем refresh токен)
  async logout(userId: number, refreshToken: string) {
    await this.redisService.del(`refresh:${userId}:${refreshToken}`);
    return { success: true };
  }
}
