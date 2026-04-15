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
import { join } from 'path';
import { SESSION_MIDDLEWARE } from './session/session.provider';
import type { RequestHandler } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService);
  const isProd = config.get('NODE_ENV') === 'production';

  // В dev раздаём ws-test.html по адресу http://localhost:4000/ws-test.html
  // Регистрируем ДО всех middleware и фильтров, иначе глобальный HttpExceptionFilter
  // перехватит 404 раньше, чем express.static успеет отдать файл
  if (!isProd) {
    app.useStaticAssets(join(process.cwd()), { index: false });
  }

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

  // Берём session middleware из DI-контейнера (создан в SessionModule)
  const sessionMiddleware = app.get<RequestHandler>(SESSION_MIDDLEWARE);
  app.use(sessionMiddleware);

  app.enableCors({
    origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
    credentials: true,
    // @ts-ignore
    exposeHeaders: ['set-cookie'],
  });

  const configSwagger = new DocumentBuilder()
    .setTitle('Corax API')
    .setDescription('API для магазина спортивного питания Corax')
    .setVersion('1.0.0')
    .addCookieAuth(config.getOrThrow('SESSION_NAME'), {
      type: 'apiKey',
      in: 'cookie',
      description:
        'Session cookie (устанавливается после /auth/login). Получите его через логин и передавайте в запросах.',
    })
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('api', app, document);

  await app.listen(config.getOrThrow<number>('APPLICATION_PORT'));

  Logger.log(
    `сервер запущен по адресу ${config.getOrThrow('APPLICATION_URL')}`,
  );
  Logger.log(
    `сваггер запущен по адресу ${config.getOrThrow('APPLICATION_URL')}/api`,
  );
}
bootstrap();
