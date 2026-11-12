import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { AlfaBankService } from './alfa-bank.service';

describe('AlfaBankService', () => {
  let service: AlfaBankService;

  const callbackSecretKey = 'test-callback-secret';

  beforeEach(() => {
    const mockConfigService = {
      getOrThrow: (key: string) => {
        if (key === 'ALFA_API_BASE_URL') {
          return 'https://abby.rbsuat.com/payment/rest';
        }
        if (key === 'ALFA_USER_NAME') return 'test_user';
        if (key === 'ALFA_PASSWORD') return 'test_password';
        if (key === 'ALFA_CALLBACK_SECRET_KEY') return callbackSecretKey;
        throw new Error(`Unknown config key: ${key}`);
      },
      get: (key: string) => {
        if (key === 'ALFA_CURRENCY') return '933';
        return undefined;
      },
    } as unknown as ConfigService;

    service = new AlfaBankService(mockConfigService);
  });

  describe('verifyCallback', () => {
    it('должна принимать корректную подпись (deposited success)', () => {
      const params = {
        amount: '123456',
        mdOrder: '3ff6962a-7dcc-4283-ab50-a6d7dd3386fe',
        operation: 'deposited',
        orderNumber: '10747',
        status: '1',
      };

      // Строим строку подписи по алфавиту: name;value;
      const signedString = Object.keys(params)
        .sort()
        .map((key) => `${key};${params[key]};`)
        .join('');

      // HMAC-SHA256 → hex upper case
      const checksum = createHmac('sha256', callbackSecretKey)
        .update(signedString, 'utf-8')
        .digest('hex')
        .toUpperCase();

      const withChecksum = { ...params, checksum };

      expect(service.verifyCallback(withChecksum, checksum)).toBe(true);
    });

    it('должна отклонять неверную подпись', () => {
      const params = {
        amount: '123456',
        mdOrder: '3ff6962a-7dcc-4283-ab50-a6d7dd3386fe',
        operation: 'deposited',
        orderNumber: '10747',
        status: '1',
      };

      const fakeChecksum = 'A'.repeat(64);

      expect(
        service.verifyCallback(
          { ...params, checksum: fakeChecksum },
          fakeChecksum,
        ),
      ).toBe(false);
    });

    it('пример подписи из документации', () => {
      // Из документации: https://mybestmerchantreturnurl.com/path?amount=123456&orderNumber=10747
      // &checksum=DBBE9E54D42072D8CAF32C7F660DEB82086A25C14FD813888E231A99E1220AB3
      // &mdOrder=3ff6962a-7dcc-4283-ab50-a6d7dd3386fe&operation=deposited&status=1
      // Порядок параметров в уведомлении может быть произвольным.

      const params = {
        amount: '123456',
        orderNumber: '10747',
        mdOrder: '3ff6962a-7dcc-4283-ab50-a6d7dd3386fe',
        operation: 'deposited',
        status: '1',
      };

      const signedString = Object.keys(params)
        .sort()
        .map((key) => `${key};${params[key]};`)
        .join('');

      // Проверяем, что строка подписи соответствует документации
      expect(signedString).toBe(
        'amount;123456;mdOrder;3ff6962a-7dcc-4283-ab50-a6d7dd3386fe;operation;deposited;orderNumber;10747;status;1;',
      );

      // А теперь проверяем работу метода с нашим ключом — подпись должна совпасть
      const ourChecksum = createHmac('sha256', callbackSecretKey)
        .update(signedString, 'utf-8')
        .digest('hex')
        .toUpperCase();

      expect(
        service.verifyCallback(
          { ...params, checksum: ourChecksum },
          ourChecksum,
        ),
      ).toBe(true);
    });
  });
});
