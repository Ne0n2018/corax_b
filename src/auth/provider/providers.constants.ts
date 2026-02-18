import type { BaseOAuthService } from './services/base-oauth.services';
import { FactoryProvider, ModuleMetadata } from '@nestjs/common';

export const ProviderOptionsSymbol = Symbol();

export type TypeOptions = {
  baseUrl: string;
  services: BaseOAuthService[];
};

export type TypeAsyncOptions = Pick<ModuleMetadata, 'imports'> &
  Pick<FactoryProvider<TypeOptions>, 'useFactory' | 'inject'>;
