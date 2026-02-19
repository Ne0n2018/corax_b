import {
  ConflictException,
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

@Injectable()
export class AuthService {
  public constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly providerService: ProviderService,
    private readonly prismaService: PrismaService,
    private readonly confirmationService: EmailConfirmationService,
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
    if (!isValidPassword) {
      throw new UnauthorizedException(
        'Неверный пароль,пожалуйста попробуйте еще раз или восстановите пароль,если забыли его',
      );
    }

    if (!user.isVerified) {
      await this.confirmationService.sendVerificationToken(user);
      throw new UnauthorizedException(
        'Ваш email не потвержден. Пожалуйста, проверьте вашу почту  и подтвердите адрес',
      );
    }

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
          user,
        });
      });
    });
  }
}
