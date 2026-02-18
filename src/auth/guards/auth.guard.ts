import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../../user/user.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.session?.userId) {
      throw new UnauthorizedException(
        'Пользователь не авторизован пожалуйста войдите в систему,чтобы получить доступ к этому ресурсу',
      );
    }
    request.user = await this.userService.findById(request.session.userId);
    return true;
  }
}
