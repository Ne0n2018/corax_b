import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
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

@Injectable()
export class AuthService {
  public constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly providerService: ProviderService,
    private readonly prismaService: PrismaService,
  ) {}
  public async register(req: Request, dto: RegisterDto) {
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
    return await this.saveSession(req, newUser);
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
        id: profile.id,
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
  private async saveSession(req: Request, user: User) {
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
