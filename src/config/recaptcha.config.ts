import { ConfigService } from '@nestjs/config';
import type { GoogleRecaptchaModuleOptions } from '@nestlab/google-recaptcha';
import type { IncomingMessage } from 'http';

export const getRecaptchaConfig = (
  configService: ConfigService,
): GoogleRecaptchaModuleOptions => {
  const isDevelopment = configService.get('NODE_ENV');

  return {
    secretKey: configService.getOrThrow<string>('GOOGLE_RECAPTCHA_SECRET_KEY'),
    response: (req: IncomingMessage) =>
      (req.headers.recaptcha ?? '').toString(),
    skipIf: isDevelopment,
  };
};
