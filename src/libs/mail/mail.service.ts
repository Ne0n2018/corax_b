import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ResendService } from 'nestjs-resend';
import { ConfigService } from '@nestjs/config';
import { JSX } from 'react';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly resendService: ResendService,
    private readonly configService: ConfigService,
  ) {}

  async sendMail(
    to: string,
    subject: string,
    react: JSX.Element,
  ): Promise<void> {
    const from = this.configService.getOrThrow<string>('EMAIL');

    try {
      await this.resendService.send({
        from,
        to,
        subject,
        react,
      });

      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
