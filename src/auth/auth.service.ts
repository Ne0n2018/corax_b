import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { Request, Response } from 'express';
import { UserService } from '../user/user.service';
import { AuthMetod } from '../generated/prisma/enums';
import { User } from '../generated/prisma/client';
import { LoginDto } from './dto/login.dto';
import { verify } from 'argon2';
import { ConfigService } from '@nestjs/config';
import { ProviderService } from './provider/provider.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailConfirmationService } from './email-confirmation/email-confirmation.service';
import { REDIS_CLIENT } from '../session/redis.provider';
import { Redis } from 'ioredis';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class AuthService {
  public constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly providerService: ProviderService,
    private readonly prismaService: PrismaService,
    private readonly confirmationService: EmailConfirmationService,
    private readonly adminService: AdminService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}
  private logger = new Logger('AuthService');
  public async register(dto: RegisterDto) {
    const isExists = await this.userService.findByEmail(dto.email);
    if (isExists) {
      throw new ConflictException(
        'Регестрация не удалась.Пользователь с таким email уже существует.Пожалуйста используете другой email или войдите в систему',
      );
    }

    const newUser = await this.userService.create(
      dto.email,
      dto.password,
      dto.name,
      AuthMetod.CREDENTIALS,
      false,
    );

    await this.confirmationService.sendVerificationToken(newUser);

    return {
      message:
        'Вы успешно зарегистрировались.Пожалуйста, потвердите ваш email. Сообщение было отправлено на ваш почтовый адрес',
    };
  }
  public async login(req: Request, dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user || !user.password) {
      throw new NotFoundException('Не удалось найти пользователя');
    }
    const isValidPassword = await verify(user.password, dto.password);

    if (!user.isVerified) {
      await this.confirmationService.sendVerificationToken(user);
      throw new UnauthorizedException(
        'Ваш email не потвержден. Пожалуйста, проверьте вашу почту  и подтвердите адрес',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Ваша учетная запись заблокирована');
    }

    if (!isValidPassword) {
      const attemptsKey = `failed_attempts:${user.id}`;

      // Увеличиваем счетчик ошибок (создаст ключ со значением 1, если его нет)
      const attempts = await this.redisClient.incr(attemptsKey);

      // Если это первая ошибка, ставим таймер сброса (например, 15 минут = 900 секунд)
      if (attempts === 1) {
        await this.redisClient.expire(attemptsKey, 900);
      }

      // Если достигли 3 ошибок — блокируем
      if (attempts >= 3) {
        // Удаляем счетчик из Redis за ненадобностью
        await this.redisClient.del(attemptsKey);

        // Вызываем ваш существующий метод блокировки
        // (Так как user.isActive сейчас true, метод переключит его на false)
        await this.adminService.blockUser(user.id, {
          message:
            'Автоматическая система безопасности заблокировала ваш аккаунт из-за превышения лимита неверных попыток ввода пароля.',
        });

        throw new UnauthorizedException(
          'Учетная запись заблокирована из-за 3 неверных попыток',
        );
      }

      // Сообщаем, сколько попыток осталось
      throw new UnauthorizedException(
        `Неверный email или пароль. Осталось попыток: ${3 - attempts}`,
      );
    }

    // 3. Успешный вход — обязательно очищаем счетчик ошибок
    await this.redisClient.del(`failed_attempts:${user.id}`);

    return this.saveSession(req, user);
  }
  public async extractProfileFromCode(
    req: Request,
    provider: string,
    code: string,
  ) {
    const providerInstance = this.providerService.FindByServices(provider);
    const profile = await providerInstance.findUserByCode(code);
    const account = await this.prismaService.account.findFirst({
      where: {
        providerAccountId: profile.id,
        provider: profile.provider,
      },
    });

    let user: User = account?.userId
      ? await this.userService.findById(account.userId)
      : null;

    if (user) {
      return this.saveSession(req, user);
    }

    user = await this.userService.create(
      profile.email,
      '',
      profile.name,
      AuthMetod[profile.provider.toUpperCase()],
      true,
    );

    if (!account)
      await this.prismaService.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: profile.provider,
          providerAccountId: profile.id,
          accessToken: profile.access_token,
          refreshToken: profile.refresh_token,
          expiresAt: profile.expires_in,
        },
      });

    return this.saveSession(req, user);
  }
  public async logout(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          return reject(
            new InternalServerErrorException(
              'Не удалось удалить сессию пользователя пожалуйста проверьте настройки сессии ',
            ),
          );
        }
        res.clearCookie(this.configService.getOrThrow('SESSION_NAME'));
        resolve();
      });
    });
  }
  public async saveSession(req: Request, user: User) {
    return new Promise((resolve, reject) => {
      req.session.userId = user.id;

      req.session.save((err) => {
        if (err) {
          return reject(
            new InternalServerErrorException(
              'Не удалось сохранить сессию, пожалуйста проверьте настроки сессии ',
            ),
          );
        }
        resolve({
          message: 'Успешный вход в систему',
        });
      });
    });
  }
}
