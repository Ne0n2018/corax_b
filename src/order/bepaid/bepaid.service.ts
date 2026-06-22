import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BePaidCheckoutResult {
  token: string;
  redirectUrl: string;
}

@Injectable()
export class BePaidService {
  private readonly logger = new Logger(BePaidService.name);
  private readonly apiUrl = 'https://checkout.bepaid.by/ctp/api/checkouts';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Создаёт платёжную сессию bePaid.
   * @param orderId  - ID нашего заказа (используется как tracking_id)
   * @param amount   - Сумма в BYN (рубли)
   * @param email    - Email покупателя
   * @param description - Описание заказа
   */
  async createCheckout(
    orderId: string,
    amount: number,
    email: string,
    description: string,
  ): Promise<BePaidCheckoutResult> {
    const shopId = this.configService.getOrThrow<string>('BEPAID_SHOP_ID');
    const secretKey =
      this.configService.getOrThrow<string>('BEPAID_SECRET_KEY');
    const appUrl = this.configService.getOrThrow<string>('BEPAID_CALLBACK_URL');
    const clientUrl = this.configService.getOrThrow<string>('ALLOWED_ORIGIN');
    const isTest = this.configService.get<string>('NODE_ENV') !== 'production';

    // bePaid принимает сумму в копейках (целое число)
    const amountInCents = Math.round((amount * 100) / 2);

    const credentials = Buffer.from(`${shopId}:${secretKey}`).toString(
      'base64',
    );

    const payload = {
      checkout: {
        test: isTest,
        transaction_type: 'payment',
        attempts: 3,
        settings: {
          success_url: `${clientUrl}/orders/${orderId}/success`,
          fail_url: `${clientUrl}/orders/${orderId}/fail`,
          cancel_url: `${clientUrl}/orders/${orderId}/cancel`,
          notification_url: `${appUrl}/order/webhook/bepaid`,
          language: 'ru',
          customer_fields: {
            visible: ['email'],
            read_only: ['email'],
          },
        },
        order: {
          amount: amountInCents,
          currency: 'BYN',
          description,
          tracking_id: orderId,
        },
        customer: {
          email,
        },
      },
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`bePaid error [${response.status}]: ${errorText}`);
        throw new InternalServerErrorException(
          'Не удалось создать платёжную сессию. Попробуйте позже.',
        );
      }

      const data = (await response.json()) as {
        checkout: { token: string; redirect_url: string };
      };

      return {
        token: data.checkout.token,
        redirectUrl: data.checkout.redirect_url,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('bePaid fetch failed', error);
      throw new InternalServerErrorException(
        'Ошибка соединения с платёжным сервисом.',
      );
    }
  }
}
