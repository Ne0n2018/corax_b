import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../../user/user.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.session.userId === 'undefined')
      throw new UnauthorizedException(
        'Пользователь не авторизован пожалуйста войдите в систему,чтобы получить доступ к этому ресурсу',
      );

    request.user = await this.userService.findById(
      <string>request.session.userId,
    );
    return true;
  }
}
