import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';

@Injectable()
export class TelegramService {
  private token: string | null | undefined;
  private adminChatId: string | null | undefined; // группа для броней
  private superAdminChatId: string | null | undefined; // личка суперадмина
  private agent: any = null;

  constructor(private configService: ConfigService) {
    this.token = this.configService.get('TELEGRAM_BOT_TOKEN');
    this.adminChatId = this.configService.get('TELEGRAM_ADMIN_CHAT_ID');
    this.superAdminChatId = this.configService.get(
      'TELEGRAM_SUPERADMIN_CHAT_ID',
    );

    const proxyUrl = this.configService.get('TELEGRAM_PROXY');
    if (proxyUrl) {
      this.agent = new SocksProxyAgent(proxyUrl, { timeout: 20000 });
      console.log('Telegram proxy configured:', proxyUrl);
    }

    if (!this.token) {
      console.warn('Telegram bot token missing');
    }
    if (!this.adminChatId) {
      console.warn('Telegram admin chat ID (group) missing');
    }
    if (!this.superAdminChatId) {
      console.warn('Telegram superadmin chat ID (private) missing');
    }
  }

  // Отправка в группу (брони)
  async sendMessage(message: string): Promise<void> {
    if (!this.token || !this.adminChatId) return;
    await this.sendMessageToChat(this.adminChatId, message);
  }

  // Добавьте в класс TelegramService
  async sendMessageToSuperAdmin(message: string): Promise<void> {
    if (!this.token || !this.superAdminChatId) return;
    await this.sendMessageToChat(this.superAdminChatId, message);
    this.superAdminChatId = this.configService.get(
      'TELEGRAM_SUPERADMIN_CHAT_ID',
    );
  }

  private async sendMessageToChat(
    chatId: string,
    message: string,
  ): Promise<void> {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const payload = { chat_id: chatId, text: message, parse_mode: 'Markdown' };

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config: any = {
          method: 'post',
          url,
          data: payload,
          headers: { 'Content-Type': 'application/json' },
          timeout: 20000,
        };

        if (this.agent) {
          config.httpsAgent = this.agent;
          config.httpAgent = this.agent;
        }

        const response = await axios(config);
        if (response.data.ok) {
          console.log(`Telegram message sent to ${chatId} successfully`);
          return;
        } else {
          console.error('Telegram API error:', response.data);
        }
      } catch (err: any) {
        console.error(`Telegram send attempt ${attempt} failed:`, err.message);
        if (attempt === 2) {
          console.error('Telegram send FULL ERROR (final):', err);
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }
  async sendMessageWithButton(
    message: string,
    buttonText: string,
    callbackData: string,
  ): Promise<void> {
    if (!this.token || !this.adminChatId) return;
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const payload = {
      chat_id: this.adminChatId,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: buttonText, callback_data: callbackData }]],
      },
    };
    try {
      const config: any = {
        method: 'post',
        url,
        data: payload,
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      };
      if (this.agent) {
        config.httpsAgent = this.agent;
        config.httpAgent = this.agent;
      }
      const response = await axios(config);
      if (!response.data.ok)
        console.error('Telegram API error:', response.data);
    } catch (err) {
      console.error('Telegram send error:', err.message);
    }
  }
  async sendInviteCodeMessage(
    phone: string,
    name: string,
    code: string,
  ): Promise<number | null> {
    if (!this.token || !this.superAdminChatId) return null;
    const message = `🔐 *Новый запрос на приглашение*\n\n👤 Имя: ${name}\n📞 Телефон: ${phone}\n🔢 Код: \`${code}\`\n\nКод действителен 24 часа.`;
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const payload = {
      chat_id: this.superAdminChatId,
      text: message,
      parse_mode: 'Markdown',
    };
    try {
      const response = await axios.post(url, payload, {
        timeout: 20000,
        ...(this.agent && { httpsAgent: this.agent, httpAgent: this.agent }),
      });
      if (response.data.ok) {
        const messageId = response.data.result.message_id;
        // Планируем удаление через 24 часа
        setTimeout(() => this.deleteMessage(messageId), 24 * 60 * 60 * 1000);
        return messageId;
      }
    } catch (err) {
      console.error('Telegram send error:', err.message);
    }
    return null;
  }

  async deleteMessage(messageId: number): Promise<void> {
    if (!this.token || !this.superAdminChatId) return;
    const url = `https://api.telegram.org/bot${this.token}/deleteMessage`;
    try {
      await axios.post(
        url,
        { chat_id: this.superAdminChatId, message_id: messageId },
        {
          timeout: 10000,
          ...(this.agent && { httpsAgent: this.agent, httpAgent: this.agent }),
        },
      );
    } catch (err) {
      console.error('Failed to delete message:', err.message);
    }
  }
}
