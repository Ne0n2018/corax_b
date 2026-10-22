import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../libs/mail/mail.service';
import { UserRole } from '../generated/prisma/enums';
import CallbackRequestTemplate from '../libs/mail/templates/callback.request.template';

@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
  ) {}

  public async requestCallback(phone: string) {
    const admins = await this.prismaService.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { email: true, displayName: true },
    });

    if (admins.length === 0) {
      this.logger.warn('Запрос на обратный звонок: администраторы не найдены');
      return { message: 'Запрос на обратный звонок принят' };
    }

    const results = await Promise.allSettled(
      admins.map((admin) =>
        this.mailService.sendMail(
          admin.email,
          'Новый запрос на обратный звонок — Corax',
          CallbackRequestTemplate({
            email: admin.email,
            name: admin.displayName,
            phone,
          }),
        ),
      ),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Не удалось отправить уведомление о запросе звонка на ${admins[index].email}: ${result.reason?.message}`,
        );
      }
    });

    return { message: 'Запрос на обратный звонок принят' };
  }
}
