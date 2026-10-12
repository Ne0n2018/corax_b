import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP'); // Контекст для логов

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { ip, method, url } = req;
    const start = Date.now();

    // Служебный эндпоинт /metrics не логируем и не учитываем в статистике:
    // он дёргается Prometheus каждые 15 секунд и лишь засоряет логи.
    const path = (url || '').split('?')[0];
    if (path === '/metrics') {
      return next.handle();
    }

    // Шаблон маршрута (например, /product/:id) вместо сырого URL,
    // чтобы метка route не разрасталась из-за динамических сегментов.
    const route = req.route?.path || path;

    return next.handle().pipe(
      tap({
        next: (data) => {
          const res = context.switchToHttp().getResponse();
          const { statusCode } = res;
          const time = Date.now() - start;

          // Учитываем запрос для метрики популярности сайта
          this.metricsService.observeHttpRequest(method, route, statusCode);

          this.logger.log(
            `${method} ${url} ${statusCode} - ${time}ms - IP: ${ip}`,
            { response: data, userId: req.session?.userId || 'unauth' },
          );
        },
        error: (err) => {
          // Ошибочные запросы уже логирует HttpExceptionFilter,
          // здесь только учитываем их в метрике статусов.
          const status =
            typeof err?.getStatus === 'function' ? err.getStatus() : 500;
          this.metricsService.observeHttpRequest(method, route, status);
        },
      }),
    );
  }
}
