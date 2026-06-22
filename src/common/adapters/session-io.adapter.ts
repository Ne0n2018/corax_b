import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { ServerOptions } from 'socket.io';
import type { RequestHandler } from 'express';

/**
 * Расширяет стандартный IoAdapter: прокидывает express-session middleware
 * в handshake каждого WebSocket-соединения, чтобы gateway-ы имели доступ
 * к `client.request.session` (включая `userId`).
 *
 * Использование в main.ts:
 *   const sessionMiddleware = session({ ... });
 *   app.useWebSocketAdapter(new SessionIoAdapter(app, sessionMiddleware));
 */
export class SessionIoAdapter extends IoAdapter {
  private readonly sessionMiddleware: RequestHandler;

  constructor(app: INestApplication, sessionMiddleware: RequestHandler) {
    super(app);
    this.sessionMiddleware = sessionMiddleware;
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);

    // Применяем session middleware ко всем входящим WS-соединениям
    server.use((socket, next) => {
      this.sessionMiddleware(
        socket.request as Parameters<RequestHandler>[0],
        {} as Parameters<RequestHandler>[1],
        next,
      );
    });

    return server;
  }
}
