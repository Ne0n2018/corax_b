import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { Redis } from 'ioredis';
import ms from '../libs/common/utils/ms.util';
import parseBoolean from '../libs/common/utils/parseBoolean.util';
import type { RequestHandler } from 'express';
import { REDIS_CLIENT } from './redis.provider';

export const SESSION_MIDDLEWARE = Symbol('SESSION_MIDDLEWARE');

export const sessionProvider: Provider = {
  provide: SESSION_MIDDLEWARE,
  inject: [ConfigService, REDIS_CLIENT],
  useFactory: (config: ConfigService, redisClient: Redis): RequestHandler => {
    const isProd = config.get('NODE_ENV') === 'production';
    return session({
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      name: config.getOrThrow<string>('SESSION_NAME'),
      resave: true,
      saveUninitialized: false,
      cookie: {
        domain: config.getOrThrow<string>('SESSION_DOMAIN'),
        maxAge: ms(config.getOrThrow<string>('SESSION_MAX_AGE')),
        httpOnly: parseBoolean(config.getOrThrow<string>('SESSION_HTTP_ONLY')),
        secure: true,
        sameSite: 'lax',
      },
      store: new RedisStore({
        client: redisClient,
        prefix: config.getOrThrow<string>('SESSION_FOLDER'),
        ttl: ms(config.getOrThrow<string>('SESSION_MAX_AGE')),
      }),
    });
  },
};
