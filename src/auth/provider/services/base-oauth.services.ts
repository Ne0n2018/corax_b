import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import type { TypeBaseProviderOptions } from './types/base-provider.options.types';
import type { TypeUserInfo } from './types/user-info.types';

@Injectable()
export class BaseOAuthService {
  private BASE_URL: string;

  constructor(protected readonly options: TypeBaseProviderOptions) {}

  protected async extractUserInfo(data: any): Promise<TypeUserInfo> {
    return {
      ...data,
      provider: this.options.name,
    };
  }

  public getAuthUrl(): string {
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: this.options.client_id,
      redirect_uri: this.getRedirectUrl(),
      scope: (this.options.scopes ?? []).join(' '),
    });

    return `${this.options.authorize_url}?${query.toString()}`;
  }

  public async findUserByCode(code: string): Promise<TypeUserInfo> {
    if (!code) throw new BadRequestException('Authorization code is required');

    const tokenQuery = new URLSearchParams({
      client_id: this.options.client_id,
      client_secret: this.options.client_secret,
      code,
      redirect_uri: this.getRedirectUrl(),
      grant_type: 'authorization_code',
    });

    let tokens;
    try {
      const tokenRequest = await fetch(this.options.access_url, {
        method: 'POST',
        body: tokenQuery,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      });

      if (!tokenRequest.ok) {
        const errorText = await tokenRequest.text(); // Get text for debugging
        throw new InternalServerErrorException(
          `Token request failed. Status: ${tokenRequest.status}. Response: ${errorText}`,
        );
      }

      tokens = await tokenRequest.json();
    } catch (error) {
      throw new InternalServerErrorException(
        `Token fetch error: ${error.message}`,
      );
    }

    if (!tokens.access_token) {
      throw new BadRequestException(
        `No access token from ${this.options.access_url}. Ensure code is valid.`,
      );
    }

    let user;
    try {
      const userRequest = await fetch(this.options.profile_url, {
        headers: this.getProfileHeaders(tokens.access_token), // Override for provider-specific
      });

      if (!userRequest.ok) {
        const errorText = await userRequest.text();
        throw new UnauthorizedException(
          `Profile fetch failed. Status: ${userRequest.status}. Response: ${errorText}`,
        );
      }

      const contentType = userRequest.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await userRequest.text();
        throw new InternalServerErrorException(
          `Profile response not JSON. Content-Type: ${contentType}. Response: ${text.substring(0, 100)}...`,
        );
      }

      user = await userRequest.json();
    } catch (error) {
      throw new InternalServerErrorException(
        `Profile request failed: ${error.message}`,
      );
    }

    const userData = await this.extractUserInfo(user);

    const expiresIn = tokens.expires_in;

    return {
      ...userData,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: expiresIn,
      provider: this.options.name,
    };
  }

  protected getProfileHeaders(accessToken: string): Record<string, string> {
    // Default Bearer; override in subclasses if needed (e.g., Yandex uses OAuth)
    return { Authorization: `Bearer ${accessToken}` };
  }

  public getRedirectUrl(): string {
    return `${this.BASE_URL}/auth/oauth/callback/${this.options.name}`;
  }

  set baseUrl(value: string) {
    this.BASE_URL = value;
  }

  get name() {
    return this.options.name;
  }

  get access_url() {
    return this.options.access_url;
  }

  get profile_url() {
    return this.options.profile_url;
  }

  get scopes() {
    return this.options.scopes;
  }
}
