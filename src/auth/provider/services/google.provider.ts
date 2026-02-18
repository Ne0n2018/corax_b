import { BaseOAuthService } from './base-oauth.services';
import type { TypesProviderOptions } from './types/provider-options.types';
import type { TypeUserInfo } from './types/user-info.types';

interface GoogleProfile {
  aud: string;
  azp: string;
  email: string;
  email_verified: boolean;
  exp: number;
  family_name: string;
  given_name: string;
  hd?: string;
  iat: number;
  iss: string;
  jti?: string;
  locale: string;
  name: string;
  nbf?: number;
  picture: string;
  sub: string;
}

export class GoogleProvider extends BaseOAuthService {
  constructor(options: TypesProviderOptions) {
    super({
      name: 'google',
      authorize_url: 'https://accounts.google.com/o/oauth2/v2/auth', // Fixed typo: 'o' not '0'
      access_url: 'https://oauth2.googleapis.com/token',
      profile_url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      scopes: options.scopes,
      client_id: options.client_id,
      client_secret: options.client_secret,
    });
  }

  protected async extractUserInfo(data: GoogleProfile): Promise<TypeUserInfo> {
    return {
      id: data.sub, // Map Google's 'sub' to 'id'
      email: data.email,
      name: data.name,
      provider: this.name,
    };
  }
}
