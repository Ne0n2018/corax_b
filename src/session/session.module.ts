import { Global, Module } from '@nestjs/common';
import { SESSION_MIDDLEWARE, sessionProvider } from './session.provider';

@Global()
@Module({
  providers: [sessionProvider],
  exports: [SESSION_MIDDLEWARE],
})
export class SessionModule {}
