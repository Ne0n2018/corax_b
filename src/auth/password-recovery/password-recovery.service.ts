import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../libs/mail/mail.service';
import { v4 as uuidv4 } from 'uuid';
import { EnumToken } from '../../generated/prisma/enums';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import ResetPasswordTemplate from '../../libs/mail/templates/reset-password.template';
import { ConfigService } from '@nestjs/config';
import { NewPasswordDto } from './dto/new-password.dto';
import { hash } from 'argon2';

@Injectable()
export class PasswordRecoveryService {
  public constructor(
    private readonly userService: UserService,
    private readonly prismaService: PrismaService,
    private readonly resendService: MailService,
    private readonly configService: ConfigService,
  ) {}

  public async resetPassword(dto: ResetPasswordDTO) {
    const existingUser = await this.userService.findByEmail(dto.email);

    if (!existingUser) {
      throw new NotFoundException(
        'Пользователь не найден. Пожалуйста проверьте введенный адрес электронной почты и попробуйте',
      );
    }

    const passwordResetToken = await this.generatePasswordResetToken(
      existingUser.email,
    );

    const params = {
      email: existingUser.email,
      domain: this.configService.getOrThrow('ALLOWED_ORIGIN'),
      token: passwordResetToken.token,
      name: existingUser.displayName,
    };

    await this.resendService.sendMail(
      existingUser.email,
      'подтвержедение почты',
      ResetPasswordTemplate(params),
    );

    return true;
  }

  public async newPassword(dto: NewPasswordDto, token: string) {
    const existingToken = await this.prismaService.token.findFirst({
      where: {
        token,
        type: EnumToken.PASSWORD_RESET,
      },
    });
    if (!existingToken) {
      throw new NotFoundException(
        'Токен не найден. Пожалуйста, проверьте правильность введенного токена или запросите новый.',
      );
    }

    const hasExpired = new Date(existingToken.experesIn) < new Date();

    if (hasExpired) {
      throw new BadRequestException(
        'Токен  истек. Пожалуйста,запросите новый токен для потверждения сброса пароля.',
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
        password: await hash(dto.password),
      },
    });

    await this.prismaService.token.delete({
      where: {
        id: existingToken.id,
        type: EnumToken.PASSWORD_RESET,
      },
    });

    return true;
  }

  private async generatePasswordResetToken(email: string) {
    const token = uuidv4();
    const expiresIn = new Date(new Date().getTime() + 3600 * 1000);
    const existingToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: EnumToken.PASSWORD_RESET,
      },
    });
    if (existingToken) {
      await this.prismaService.token.delete({
        where: {
          id: existingToken.id,
          type: EnumToken.PASSWORD_RESET,
        },
      });
    }

    const resetPasswordToken = await this.prismaService.token.create({
      data: {
        email,
        token,
        experesIn: expiresIn,
        type: EnumToken.PASSWORD_RESET,
      },
    });
    return resetPasswordToken;
  }
}
