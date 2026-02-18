import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProviderService } from '../provider/provider.service';
import type { Request } from 'express';

@Injectable()
export class AuthProviderGuard implements CanActivate {
  public constructor(private readonly providerService: ProviderService) {}

  public canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest() as Request;
    const provider = <string>request.params.provider;
    const providerInstance = this.providerService.FindByServices(provider);

    if (!providerInstance) {
      throw new NotFoundException(
        `Провайдер ${provider} не найденю. Пожалуйста, проверьте правильность введенных данных `,
      );
    }

    return true;
  }
}
