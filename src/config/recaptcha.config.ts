import { ConfigService } from '@nestjs/config';
import type { GoogleRecaptchaModuleOptions } from '@nestlab/google-recaptcha';

export const getRecaptchaConfig = async (
  configService: ConfigService,
): Promise<GoogleRecaptchaModuleOptions> => {
  const isDevelopment = configService.get('NODE_ENV');

  return {
    secretKey: configService.getOrThrow<string>('GOOGLE_RECAPTCHA_SECRET_KEY'),
    response: (req) => req.headers.recaptcha,
    skipIf: isDevelopment,
  };
};
