import './polyfills';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SESSION_MIDDLEWARE } from './session/session.provider';
import type { RequestHandler } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService);

  app.use(cookieParser(config.getOrThrow('COOKIES_SECRET')));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.set('trust proxy', () => true);

  // Берём session middleware из DI-контейнера (создан в SessionModule)
  const sessionMiddleware = app.get<RequestHandler>(SESSION_MIDDLEWARE);
  app.use(sessionMiddleware);

  app.enableCors({
    // 1. Строгий контроль источника (никаких '*')
    origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),

    // 2. Разрешаем куки/сессии только для доверенного origin
    credentials: true,

    // 3. Жесткий белый список HTTP-методов (блокируем TRACE, OPTIONS и прочий мусор)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],

    // 4. Жесткий белый список заголовков от клиента (никаких '*')
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],

    // 5. Кэширование preflight-запросов (OPTIONS) на 24 часа
    maxAge: 86400,
  });

  const configSwagger = new DocumentBuilder()
    .setTitle('Corax API')
    .setDescription('API для магазина спортивного питания Corax')
    .setVersion('1.0.0')
    .addServer('/api', 'Production / Nginx Proxy')
    .addCookieAuth(config.getOrThrow('SESSION_NAME'), {
      type: 'apiKey',
      in: 'cookie',
      description:
        'Session cookie (устанавливается после /auth/login). Получите его через логин и передавайте в запросах.',
    })
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('swagger', app, document);

  await app.listen(config.getOrThrow<number>('APPLICATION_PORT'));

  const appUrl = config.getOrThrow('APPLICATION_URL');
  Logger.log(`сервер запущен по адресу ${appUrl}`);
  Logger.log(`сваггер запущен по адресу ${appUrl}/swagger`);
  // Construct Grafana URL by replacing port in APPLICATION_URL with 3000
  const grafanaUrl = appUrl
    .replace(/:(\d+)$/, ':3000')
    .replace(/:(\d+)\//, ':3000/');
  Logger.log(
    `Grafana доступна по адресу ${grafanaUrl} (логин: ${process.env.GRAFANA_ADMIN_USER || 'admin'}, пароль: ${process.env.GRAFANA_ADMIN_PASSWORD || 'admin'})`,
  );
}
bootstrap();
