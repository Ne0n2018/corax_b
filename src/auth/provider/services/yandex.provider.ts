import { BaseOAuthService } from './base-oauth.services';
import type { TypesProviderOptions } from './types/provider-options.types';
import type { TypeUserInfo } from './types/user-info.types';

interface YandexProfile {
  login: string;
  id: string;
  client_id: string;
  psuid: string;
  emails?: string[];
  default_email?: string;
  is_avatar_empty?: boolean;
  default_avatar_id?: string;
  birthday?: string | null;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  real_name?: string;
  sex?: 'male' | 'female' | null;
  default_phone?: { id: number; number: string };
}

export class YandexProvider extends BaseOAuthService {
  constructor(options: TypesProviderOptions) {
    super({
      name: 'yandex',
      authorize_url: 'https://oauth.yandex.ru/authorize',
      access_url: 'https://oauth.yandex.ru/token',
      profile_url: 'https://login.yandex.ru/info', // Fixed URL
      scopes: options.scopes,
      client_id: options.client_id,
      client_secret: options.client_secret,
    });
  }

  protected getProfileHeaders(accessToken: string): Record<string, string> {
    return { Authorization: `OAuth ${accessToken}` }; // Yandex uses 'OAuth' not 'Bearer'
  }

  protected async extractUserInfo(data: YandexProfile): Promise<TypeUserInfo> {
    return {
      id: data.id,
      email: data.default_email,
      name:
        `${data.first_name || ''} ${data.last_name || ''}`.trim() ||
        data.display_name,
      provider: this.name,
    };
  }
}
