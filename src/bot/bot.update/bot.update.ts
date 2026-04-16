import { Command, Ctx, Update, Action, Hears } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { BotService } from '../bot.service';
import BookingsService from '../../bookings/bookings.service';

@Update()
export class BotUpdate {
  constructor(
    private readonly botService: BotService,
    private readonly bookingsService: BookingsService,
  ) {}

  private async sendScheduleWithButtons(ctx: Context, bookings: any[]) {
    if (!bookings.length) {
      await ctx.reply('Нет броней на этот период.');
      return;
    }
    for (const booking of bookings) {
      const text = `🎭 *${booking.quest.title}*\n📅 ${booking.date} ${booking.startTime}-${booking.endTime}\n👤 ${booking.clientName}\n📞 ${booking.clientPhone}`;
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('✏️ Изменить время', `edit_${booking.id}`),
          Markup.button.callback('❌ Отменить', `cancel_${booking.id}`),
        ],
      ]);
      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
  }

  @Command('today')
  async onToday(@Ctx() ctx: Context) {
    if (
      !ctx.from ||
      ctx.from.id.toString() !== process.env.TELEGRAM_ADMIN_CHAT_ID
    )
      return;
    const bookings = await this.botService.getTodaysBookings();
    await this.sendScheduleWithButtons(ctx, bookings);
  }

  @Command('week')
  async onWeek(@Ctx() ctx: Context) {
    if (
      !ctx.from ||
      ctx.from.id.toString() !== process.env.TELEGRAM_ADMIN_CHAT_ID
    )
      return;
    const bookings = await this.botService.getWeekBookings();
    await this.sendScheduleWithButtons(ctx, bookings);
  }

  @Command('month')
  async onMonth(@Ctx() ctx: Context) {
    if (
      !ctx.from ||
      ctx.from.id.toString() !== process.env.TELEGRAM_ADMIN_CHAT_ID
    )
      return;
    const bookings = await this.botService.getMonthBookings();
    await this.sendScheduleWithButtons(ctx, bookings);
  }

  private editState = new Map<number, number>();

  @Action(/edit_(\d+)/)
  async onEdit(@Ctx() ctx: Context) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    const match = ctx.callbackQuery.data.match(/edit_(\d+)/);
    if (!match) return;
    const bookingId = parseInt(match[1]);
    if (!ctx.from) return;
    this.editState.set(ctx.from.id, bookingId);
    await ctx.answerCbQuery();
    await ctx.reply(
      `Введите новое время для брони #${bookingId} в формате HH:MM-HH:MM (например, 15:00-16:00):`,
    );
  }

  @Hears(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
  async onTimeInput(@Ctx() ctx: Context) {
    if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;
    const userId = ctx.from.id;
    const bookingId = this.editState.get(userId);
    if (!bookingId) return;
    const [startTime, endTime] = ctx.message.text.split('-');
    try {
      await this.bookingsService.updateTime(bookingId, startTime, endTime);
      await ctx.reply(
        `✅ Время брони #${bookingId} изменено на ${startTime}-${endTime}.`,
      );
      this.editState.delete(userId);
    } catch (err) {
      await ctx.reply(`❌ Ошибка: ${err.message}`);
    }
  }

  @Action(/cancel_(\d+)/)
  async onCancel(@Ctx() ctx: Context) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    const match = ctx.callbackQuery.data.match(/cancel_(\d+)/);
    if (!match) return;
    const bookingId = parseInt(match[1]);
    await ctx.answerCbQuery();
    try {
      await this.bookingsService.cancel(bookingId);
      await ctx.reply(`✅ Бронь #${bookingId} отменена.`);
    } catch (err) {
      await ctx.reply(`❌ Ошибка: ${err.message}`);
    }
  }
}
