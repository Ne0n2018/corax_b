import './polyfills';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Redis } from 'ioredis';
import session from 'express-session';
import ms from './libs/common/utils/ms.util';
import parseBoolean from './libs/common/utils/parseBoolean.util';
import RedisStore from 'connect-redis';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const redis = new Redis(config.getOrThrow('REDIS_URI'));
  app.use(cookieParser(config.getOrThrow('COOKIES_SECRET')));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  app.use(
    session({
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      name: config.getOrThrow<string>('SESSION_NAME'),
      resave: true,
      saveUninitialized: false,
      cookie: {
        domain: config.getOrThrow<string>('SESSION_DOMAIN'),
        maxAge: ms(config.getOrThrow<string>('SESSION_MAX_AGE')),
        httpOnly: parseBoolean(config.getOrThrow<string>('SESSION_HTTP_ONLY')),
        secure: parseBoolean(config.getOrThrow<string>('SESSION_SECURE')),
        sameSite: 'lax',
      },
      store: new RedisStore({
        client: redis,
        prefix: config.getOrThrow<string>('SESSION_FOLDER'),
        ttl: ms(config.getOrThrow<string>('SESSION_MAX_AGE')),
      }),
    }),
  );
  app.enableCors({
    origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
    credentials: true,
    exposeHeaders: ['set-cookie'],
  });

  const configSwagger = new DocumentBuilder()
    .setTitle('Corax API')
    .setDescription('API для магазина спортивного питания Corax')
    .setVersion('1.0.0')
    .addCookieAuth(
      config.getOrThrow('SESSION_NAME'), // Имя вашего session cookie (по умолчанию в express-session)
      {
        type: 'apiKey',
        in: 'cookie',
        description:
          'Session cookie (устанавливается после /auth/login). Получите его через логин и передавайте в запросах.',
      },
    )
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('api', app, document);
  await app.listen(config.getOrThrow<number>('APPLICATION_PORT'));
}
bootstrap();
