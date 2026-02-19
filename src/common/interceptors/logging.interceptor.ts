import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP'); // Контекст для логов

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { ip, method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const res = context.switchToHttp().getResponse();
        const { statusCode } = res;
        const time = Date.now() - start;

        this.logger.log(
          `${method} ${url} ${statusCode} - ${time}ms - IP: ${ip}`,
          { response: data, userId: req.session?.userId || 'unauth' },
        );
      }),
    );
  }
}
