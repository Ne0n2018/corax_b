import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../session/redis.provider';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private userService: UserService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.session?.userId) {
      throw new UnauthorizedException(
        'Пользователь не авторизован пожалуйста войдите в систему,чтобы получить доступ к этому ресурсу',
      );
    }
    const isBlocked = await this.redisClient.exists(
      `blocked_user:${request.session?.userId}`,
    );

    if (isBlocked) {
      // Уничтожаем сессию в Express, чтобы очистить куки на клиенте
      request.session.destroy((err) => {
        if (err) {
          console.error(
            'Ошибка при удалении сессии заблокированного пользователя:',
            err,
          );
        }
      });
      throw new UnauthorizedException('Ваша учетная запись заблокирована');
    }
    request.user = await this.userService.findById(request.session.userId);
    return true;
  }
}
