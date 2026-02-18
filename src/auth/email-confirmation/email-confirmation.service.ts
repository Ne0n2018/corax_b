import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { EnumToken } from '../../generated/prisma/enums';
import { Request } from 'express';
import { ConfirmationDto } from './dto/confirmation.dto';
import { User } from '../../generated/prisma/client';
import { MailService } from '../../libs/mail/mail.service';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
import ConfirmationTemplate from '../../libs/mail/templates/confirmation.template';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailConfirmationService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}
  private async generateVerificationToken(email: string) {
    const token = uuidv4();
    const experesIn = new Date(new Date().getTime() + 3600 * 1000);
    const existingToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: EnumToken.VERIFICATION,
      },
    });
    if (existingToken) {
      await this.prismaService.token.delete({
        where: {
          id: existingToken.id,
          type: EnumToken.VERIFICATION,
        },
      });
    }

    const verificationToken = await this.prismaService.token.create({
      data: {
        email,
        token,
        experesIn,
        type: EnumToken.VERIFICATION,
      },
    });

    return verificationToken.token;
  }

  public async newVerification(req: Request, dto: ConfirmationDto) {
    const existingToken = await this.prismaService.token.findUnique({
      where: {
        token: dto.token,
        type: EnumToken.VERIFICATION,
      },
    });
    if (!existingToken) {
      throw new NotFoundException(
        'Токен подтверждения не найден. Пожалуйста, убедитесь, что у вас правильный токен',
      );
    }
    const hasExpired = new Date(existingToken.experesIn) < new Date();

    if (hasExpired) {
      throw new BadRequestException(
        'Токен потверждения истек. Пожалуйста,запросите новый токен для потверждения.',
      );
    }

    const existingUser = await this.userService.findByEmail(
      existingToken.email,
    );

    if (!existingUser) {
      throw new NotFoundException(
        'Пользователь с указанным адресом электронной почты не найден. Пожалуйста,убедитесь,что вы ввели правильный email',
      );
    }

    await this.prismaService.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        isVerified: true,
      },
    });

    await this.prismaService.token.delete({
      where: {
        id: existingToken.id,
        type: EnumToken.VERIFICATION,
      },
    });

    return this.authService.saveSession(req, existingUser);
  }

  public async sendVerificationToken(user: User) {
    const verificationToken = await this.generateVerificationToken(user.email);
    const params = {
      email: user.email,
      domain: this.configService.getOrThrow('ALLOWED_ORIGIN'),
      token: verificationToken,
      name: user.displayName,
    };
    await this.mailService.sendMail(
      user.email,
      'подтвердите почту',
      ConfirmationTemplate(params),
    );
  }
}
