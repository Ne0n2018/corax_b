import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { randomInt } from 'crypto';
import { REDIS_CLIENT } from '../session/redis.provider';
import { MailService } from '../libs/mail/mail.service';
import TwoFactorTemplate from '../libs/mail/templates/two-factor.confirm.template';

@Injectable()
export class TwoFactorService {
  public constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private readonly mailService: MailService,
  ) {}

  /**
   * Генерация и отправка 6-значного кода
   */
  public async sendTwoFactorCode(userId: string, email: string, name: string) {
    // Безопасная генерация случайного числа от 100000 до 999999
    const code = randomInt(100000, 999999).toString();
    const redisKey = `2fa_code:${userId}`;

    // Сохраняем код в Redis ровно на 5 минут (300 секунд)
    await this.redisClient.set(redisKey, code, 'EX', 300);

    const forTemp = {
      name: name,
      email: email,
      token: code,
    };
    // Отправляем письмо через существующий MailService
    await this.mailService.sendMail(
      email,
      'Код подтверждения входа в админ-панель',
      TwoFactorTemplate(forTemp),
    );

    return {
      message: 'Код двухфакторной аунтефикации отправлен на вашу почту',
    };
  }

  /**
   * Проверка переданного кода
   */
  public async verifyTwoFactorCode(
    userId: string,
    code: string,
  ): Promise<boolean> {
    const redisKey = `2fa_code:${userId}`;
    const savedCode = await this.redisClient.get(redisKey);

    if (!savedCode) {
      throw new BadRequestException(
        'Срок действия кода истек или код не запрашивался',
      );
    }

    if (savedCode !== code) {
      throw new UnauthorizedException('Неверный код подтверждения');
    }

    // Удаляем код из Redis сразу после успешной проверки
    await this.redisClient.del(redisKey);
    return true;
  }
}
