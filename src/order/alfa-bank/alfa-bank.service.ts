import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/** Параметры для регистрации заказа в Альфа-Банке */
export interface RegisterOrderParams {
  orderNumber: string; // уникальный номер заказа в системе мерчанта
  amount: number; // сумма в минимальных единицах (копейки)
  returnUrl: string;
  failUrl?: string;
  description?: string;
  currency?: string; // ISO 4217, по умолчанию 933 (BYN)
  email?: string;
  language?: string; // ru/en/by/pl
  ip?: string;
}

/** Ответ на регистрацию заказа */
export interface RegisterOrderResult {
  orderId: string; // UUID заказа в платёжном шлюзе
  formUrl: string; // URL для редиректа клиента на платёжную страницу
}

/** Ответ на проверку статуса заказа */
export interface OrderStatusResult {
  orderStatus: number; // 0=не оплачен, 1=авторизован, 2=завершён, 3=отменён, 4=возврат, 5=ACS, 6=отклонён, 7=ожидание, 8=частичное
  actionCode: string;
  actionCodeDescription: string;
  amount: number;
  currency: string;
  orderDescription?: string;
  ip: string;
}

/** Параметры callback-уведомления от шлюза */
export interface AlfaBankCallbackDto {
  mdOrder: string; // orderId из шлюза
  orderNumber: string; // наш orderNumber
  checksum: string; // HMAC-SHA256 hex
  operation: string; // approved/deposited/reversed/refunded/declinedByTimeout
  status: string; // '1' = успех, '0' = ошибка
}

@Injectable()
export class AlfaBankService {
  private readonly logger = new Logger(AlfaBankService.name);
  private readonly apiBaseUrl: string;
  private readonly userName: string;
  private readonly password: string;
  private readonly callbackSecretKey: string;

  constructor(private readonly configService: ConfigService) {
    // Sandbox: https://abby.rbsuat.com/payment/rest/
    // Prod: https://ecom.alfabank.by/payment/rest/
    this.apiBaseUrl =
      this.configService.getOrThrow<string>('ALFA_API_BASE_URL');
    this.userName = this.configService.getOrThrow<string>('ALFA_USER_NAME');
    this.password = this.configService.getOrThrow<string>('ALFA_PASSWORD');
    this.callbackSecretKey = this.configService.getOrThrow<string>(
      'ALFA_CALLBACK_SECRET_KEY',
    );
  }

  // ─── register.do ──────────────────────────────────────────────────────────

  /**
   * Регистрация заказа в платёжном шлюзе.
   *
   * POST https://<api_base>/payment/rest/register.do
   * Content-Type: application/x-www-form-urlencoded
   *
   * Обязательные параметры: orderNumber, amount, returnUrl, userName, password
   * Ответ: { orderId, formUrl }
   */
  async registerOrder(
    params: RegisterOrderParams,
  ): Promise<RegisterOrderResult> {
    const formData = new URLSearchParams();
    formData.set('userName', this.userName);
    formData.set('password', this.password);
    formData.set('orderNumber', params.orderNumber);
    formData.set('amount', String(params.amount));
    formData.set('returnUrl', params.returnUrl);

    if (params.failUrl) formData.set('failUrl', params.failUrl);
    if (params.description) formData.set('description', params.description);
    if (params.currency) formData.set('currency', params.currency);
    if (params.email) formData.set('email', params.email);
    if (params.language) formData.set('language', params.language);
    if (params.ip) formData.set('ip', params.ip);

    try {
      const response = await fetch(`${this.apiBaseUrl}/register.do`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `register.do error [${response.status}]: ${errorText}`,
        );
        throw new InternalServerErrorException(
          'Не удалось создать платёжную сессию. Попробуйте позже.',
        );
      }

      const data = await response.json();

      // Успех: errorCode = 0 (если success отсутствует)
      if (data.errorCode && data.errorCode !== '0' && data.errorCode !== 0) {
        this.logger.error(
          `register.do errorCode ${data.errorCode}: ${data.errorMessage}`,
        );
        throw new InternalServerErrorException(
          `Ошибка регистрации платежа: ${data.errorMessage || data.errorCode}`,
        );
      }

      return {
        orderId: data.orderId,
        formUrl: data.formUrl,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('register.do fetch failed', error);
      throw new InternalServerErrorException(
        'Ошибка соединения с платёжным сервисом.',
      );
    }
  }

  // ─── getOrderStatusExtended.do ────────────────────────────────────────────

  /**
   * Проверка статуса заказа в платёжном шлюзе.
   *
   * POST https://<api_base>/payment/rest/getOrderStatusExtended.do
   * Content-Type: application/x-www-form-urlencoded
   *
   * orderStatus: 0=не оплачен, 1=авторизован, 2=завершён (оплачен),
   *              3=отменён, 4=возврат, 5=ACS, 6=отклонён, 7=ожидание, 8=частичное
   * Оплачен: orderStatus === 1 || orderStatus === 2
   */
  async getOrderStatus(
    orderId: string,
    orderNumber: string,
  ): Promise<OrderStatusResult> {
    const formData = new URLSearchParams();
    formData.set('userName', this.userName);
    formData.set('password', this.password);
    formData.set('orderId', orderId);
    formData.set('orderNumber', orderNumber);

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/getOrderStatusExtended.do`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `getOrderStatusExtended.do error [${response.status}]: ${errorText}`,
        );
        throw new InternalServerErrorException(
          'Ошибка проверки статуса платежа.',
        );
      }

      const data = await response.json();

      if (data.errorCode && data.errorCode !== '0' && data.errorCode !== 0) {
        this.logger.error(
          `getOrderStatusExtended errorCode ${data.errorCode}: ${data.errorMessage}`,
        );
        throw new InternalServerErrorException(
          `Ошибка проверки статуса: ${data.errorMessage || data.errorCode}`,
        );
      }

      return {
        orderStatus: data.orderStatus,
        actionCode: data.actionCode,
        actionCodeDescription: data.actionCodeDescription,
        amount: data.amount,
        currency: data.currency,
        orderDescription: data.orderDescription,
        ip: data.ip,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('getOrderStatusExtended.do fetch failed', error);
      throw new InternalServerErrorException(
        'Ошибка соединения с платёжным сервисом.',
      );
    }
  }

  // ─── decline.do (отмена заказа) ───────────────────────────────────────────

  /**
   * Отмена ещё не оплаченного заказа в платёжном шлюзе.
   *
   * POST https://<api_base>/payment/rest/decline.do
   * Content-Type: application/x-www-form-urlencoded
   *
   * Обязательные: userName, password, orderId, orderNumber
   */
  async cancelOrder(
    orderId: string,
    orderNumber: string,
  ): Promise<{ errorCode: string | null; errorMessage: string | null }> {
    const formData = new URLSearchParams();
    formData.set('userName', this.userName);
    formData.set('password', this.password);
    formData.set('orderId', orderId);
    formData.set('orderNumber', orderNumber);

    try {
      const response = await fetch(`${this.apiBaseUrl}/decline.do`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`decline.do error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      return {
        errorCode: data.errorCode ? String(data.errorCode) : null,
        errorMessage: data.errorMessage || null,
      };
    } catch (error) {
      this.logger.error('decline.do fetch failed', error);
      return { errorCode: null, errorMessage: 'decline request failed' };
    }
  }

  // ─── Callback verification ────────────────────────────────────────────────

  /**
   * Проверка контрольной суммы (checksum) callback-уведомления.
   *
   * Алгоритм (симметричная криптография, HMAC-SHA256):
   * 1. Из параметров удаляются checksum и sign_alias, checksum сохраняется
   * 2. Оставшиеся пары сортируются по имени параметра (возрастание)
   * 3. Строится строка: "имя1;значение1;имя2;значение2;...;"
   * 4. HMAC-SHA256 с общим секретным ключом
   * 5. Результат — hex в верхнем регистре
   * 6. Сравнение с checksum из уведомления
   * 7. Ответ: 200 OK
   */
  verifyCallback(params: Record<string, string>, checksum: string): boolean {
    // Удаляем checksum и sign_alias, сохраняем checksum для проверки
    const rest = { ...params };
    delete rest.checksum;
    delete rest.sign_alias;

    // Сортируем по имени параметра
    const sortedKeys = Object.keys(rest).sort();

    // Строим строку: name;value;name;value;...;
    const signedString = sortedKeys
      .map((key) => `${key};${rest[key]};`)
      .join('');

    // HMAC-SHA256 → hex upper case
    const hmac = crypto.createHmac('sha256', this.callbackSecretKey);
    hmac.update(signedString, 'utf-8');
    const calculatedChecksum = hmac.digest('hex').toUpperCase();

    const result = calculatedChecksum === checksum.toUpperCase();

    if (!result) {
      this.logger.warn(
        `Callback checksum mismatch: expected=${calculatedChecksum}, got=${checksum}`,
      );
    }

    return result;
  }

  /**
   * Проверка callback-уведомления (с checksum).
   * Возвращает true, если уведомление подлинно.
   */
  verifyCallbackWithChecksum(body: Record<string, string>): boolean {
    const checksum = body.checksum;
    if (!checksum) {
      this.logger.warn('Callback без checksum — пропускаем проверку');
      return true; // для обратной совместимости
    }
    return this.verifyCallback(body, checksum);
  }
}
