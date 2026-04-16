import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { BotService } from './bot.service';
import { SocksProxyAgent } from 'socks-proxy-agent';
import BookingsService from '../bookings/bookings.service';
import { ScheduleService } from '../schedule/schedule.service';
import { text } from 'node:stream/consumers';
import { keyboard } from 'telegraf/markup';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private bot: Telegraf;
  private readonly logger = new Logger(TelegramBotService.name);
  private token: string;
  private adminChatId: string;
  private agent: any = null;
  private editRolesState = new Map<number, number>(); // userId -> eventId
  private allowedIds: number[] = [];
  constructor(
    private configService: ConfigService,
    private botService: BotService,
    private bookingsService: BookingsService,
    private scheduleService: ScheduleService,
  ) {
    this.token = this.configService.get('TELEGRAM_BOT_TOKEN') || '';
    this.adminChatId = this.configService.get('TELEGRAM_ADMIN_CHAT_ID') || '';
    const proxyUrl = this.configService.get('TELEGRAM_PROXY');
    const allowedIdsStr = this.configService.get('TELEGRAM_ALLOWED_IDS');
    if (allowedIdsStr) {
      this.allowedIds = allowedIdsStr
        .split(',')
        .map((id) => parseInt(id.trim(), 10));
    }
    if (proxyUrl) {
      this.agent = new SocksProxyAgent(proxyUrl);
      this.logger.log(`Using proxy: ${proxyUrl}`);
    }
  }

  private async deleteAfter(
    chatId: number,
    messageId: number,
    seconds: number = 30,
  ) {
    setTimeout(async () => {
      try {
        await this.bot.telegram.deleteMessage(chatId, messageId);
      } catch (err) {
        // Игнорируем ошибки (сообщение уже могло быть удалено)
      }
    }, seconds * 1000);
  }

  // Функция экранирования HTML
  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  private isAllowed(ctx: any): boolean {
    if (this.allowedIds.length === 0) return true;
    return this.allowedIds.includes(ctx.from.id);
  }
  private formatDateWithWeekday(dateStr: string): string {
    // Если уже содержит день недели, переформатируем числа с ведущими нулями
    if (/[а-яё]/i.test(dateStr)) {
      const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\s+(.+)$/);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const weekday = match[3];
        return `${day}.${month} ${weekday}`;
      }
      return dateStr;
    }

    let parsedDate: Date | null = null;
    if (dateStr.includes('-')) {
      parsedDate = new Date(dateStr);
    } else if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else if (parts.length === 2) {
        const now = new Date();
        parsedDate = new Date(`${now.getFullYear()}-${parts[1]}-${parts[0]}`);
      }
    }
    if (!parsedDate || isNaN(parsedDate.getTime())) return dateStr;

    const day = parsedDate.getDate().toString().padStart(2, '0');
    const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
    const weekday = parsedDate.toLocaleDateString('ru-RU', { weekday: 'long' });
    return `${day}.${month} ${weekday}`;
  }
  async onModuleInit() {
    if (!this.token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set');
      return;
    }

    this.bot = new Telegraf(this.token, { telegram: { agent: this.agent } });

    // --- Команда /today ---
    this.bot.command('today', async (ctx) => {
      if (!this.isAllowed(ctx)) {
        await ctx.reply('⛔️ У вас нет доступа к этому боту.');
        return;
      }
      this.deleteAfter(ctx.chat.id, ctx.message.message_id, 30);
      const bookings = await this.botService.getTodaysBookings();
      if (!bookings.length) {
        await ctx.reply('Нет броней на сегодня.');
        return;
      }
      // Получаем события за сегодня
      const todayStr = new Date().toISOString().split('T')[0];
      const events = await this.scheduleService.findByDateRange(
        todayStr,
        todayStr,
      );
      const rolesMap = new Map<string, boolean>();
      for (const ev of events) {
        const key = `${ev.date}_${ev.startTime}_${ev.endTime}_${ev.questTitle}`;
        rolesMap.set(key, !!ev.rolesDescription);
      }
      await this.sendBookingsWithButtons(ctx, bookings, rolesMap);
    });

    // --- Команда /week ---
    this.bot.command('week', async (ctx) => {
      if (!this.isAllowed(ctx)) {
        await ctx.reply('⛔️ У вас нет доступа к этому боту.');
        return;
      }
      this.deleteAfter(ctx.chat.id, ctx.message.message_id, 30);
      const bookings = await this.botService.getWeekBookings();
      if (!bookings.length) {
        await ctx.reply('Нет броней на эту неделю.');
        return;
      }
      const today = new Date();
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 6);
      const startStr = today.toISOString().split('T')[0];
      const endStr = endOfWeek.toISOString().split('T')[0];
      const events = await this.scheduleService.findByDateRange(
        startStr,
        endStr,
      );
      const rolesMap = new Map<string, boolean>();
      for (const ev of events) {
        const key = `${ev.date}_${ev.startTime}_${ev.endTime}_${ev.questTitle}`;
        rolesMap.set(key, !!ev.rolesDescription);
      }
      await this.sendBookingsWithButtons(ctx, bookings, rolesMap);
    });




    // --- Команда /schedule ---
    this.bot.command('schedule', async (ctx) => {
      // Удаляем команду пользователя через 10 секунд
      if (!this.isAllowed(ctx)) {
        await ctx.reply('⛔️ У вас нет доступа к этому боту.');
        return;
      }
      this.deleteAfter(ctx.chat.id, ctx.message.message_id, 10);

      const events = await this.scheduleService.getUpcomingEventsWithRoles();
      if (!events.length) {
        const reply = await ctx.reply(
          '📭 Нет предстоящих событий с распределёнными ролями.',
        );
        // Удаляем сообщение "нет событий" через 30 секунд
        this.deleteAfter(ctx.chat.id, reply.message_id, 30);
        return;
      }

      let message = '';
      let currentDate = '';

      for (const ev of events) {
        const displayDate = this.formatDateWithWeekday(ev.date); // функция форматирования с ведущими нулями
        if (displayDate !== currentDate) {
          currentDate = displayDate;
          message += `\n📌 <b>${this.escapeHtml(currentDate)}</b>\n`;
        }

        message += `• <b>${this.escapeHtml(ev.startTime)} – ${this.escapeHtml(ev.endTime)}</b> — <b>${this.escapeHtml(ev.questTitle)}</b>\n`;

        if (ev.rolesDescription && ev.rolesDescription.trim()) {
          const rolesLines = ev.rolesDescription.split('\n');
          for (const line of rolesLines) {
            if (line.trim()) {
              message += `   ${this.escapeHtml(line)}\n`;
            }
          }
        } else {
          message += `   <i>(роли не назначены)</i>\n`;
        }

        message += `\n`; // отступ между квестами
      }

      // Отправляем расписание
      const reply = await ctx.reply(message, { parse_mode: 'HTML' });
      // Удаляем сообщение с расписанием через 2 минуты (120 секунд)
      this.deleteAfter(ctx.chat.id, reply.message_id, 120);
    });

    // --- Обработка кнопки "Распределить роли" ---
    this.bot.action(/assign_roles_(\d+)/, async (ctx) => {
      await ctx.deleteMessage();
      const bookingId = parseInt(ctx.match[1]);
      await ctx.answerCbQuery();
      const booking = await this.bookingsService.findOne(bookingId);
      const event = await this.scheduleService.findByBooking(booking);
      if (!event) {
        await ctx.reply('Событие не найдено в расписании.');
        return;
      }
      this.editRolesState.set(ctx.from.id, event.id);
      await ctx.reply(`Введите роли для события "${event.questTitle}" (${event.date} ${event.startTime}-${event.endTime}):
Формат: Имя - роль (каждый участник с новой строки)`);
    });

    // --- Обработка текстового ввода ролей ---
    this.bot.on('text', async (ctx) => {
      if (!this.isAllowed(ctx)) {
        await ctx.reply('⛔️ У вас нет доступа к этому боту.');
        return;
      }
      const userId = ctx.from.id;
      const eventId = this.editRolesState.get(userId);
      if (eventId) {
        this.deleteAfter(ctx.chat.id, ctx.message.message_id, 30);
        if (ctx.message.text.startsWith('/')) {
          await ctx.reply(
            '⛔️ Нельзя использовать команды. Введите роли в формате "Имя - роль".',
          );
          return;
        }
        const roles = ctx.message.text;
        await this.scheduleService.updateRoles(eventId, roles);
        const reply = await ctx.reply(`✅ Роли сохранены.`);
        this.deleteAfter(ctx.chat.id, reply.message_id, 30);
        this.editRolesState.delete(userId);
        setTimeout(() => ctx.deleteMessage().catch(() => {}), 10000);
      }
    });

    // Запуск бота
    this.bot
      .launch()
      .then(() => this.logger.log('Telegram bot started'))
      .catch((err) => this.logger.error('Failed to start bot', err));
  }

  // Отправка списка броней с инлайн-кнопками "Распределить роли"
  private async sendBookingsWithButtons(
    ctx: any,
    bookings: any[],
    rolesMap: Map<string, boolean>,
  ) {
    if (!bookings.length) {
      const reply = await ctx.reply('Нет броней на этот период.');
      this.deleteAfter(ctx.chat.id, reply.message_id, 30);
      return;
    }
    for (const booking of bookings) {
      const key = `${booking.date}_${booking.startTime}_${booking.endTime}_${booking.quest.title}`;
      const hasRoles = rolesMap.get(key) || false;
      const buttonText = hasRoles
        ? '✏️ Редактировать роли'
        : '📝 Распределить роли';
      const text = `<b>${this.escapeHtml(booking.quest.title)}</b>\n📅 ${booking.date} ${booking.startTime}-${booking.endTime}\n👤 ${this.escapeHtml(booking.clientName)}\n📞 ${booking.clientPhone}`;
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(buttonText, `assign_roles_${booking.id}`)],
      ]);
      const reply = await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
      this.deleteAfter(ctx.chat.id, reply.message_id, 60);
    }
  }
}
