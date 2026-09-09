import { Global, Module } from '@nestjs/common';
import { SESSION_MIDDLEWARE, sessionProvider } from './session.provider';
import { REDIS_CLIENT, redisProvider } from './redis.provider';

@Global()
@Module({
  providers: [sessionProvider, redisProvider],
  exports: [SESSION_MIDDLEWARE, REDIS_CLIENT],
})
export class SessionModule {}
