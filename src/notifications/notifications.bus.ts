import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import type {
  NotificationAction,
  NotificationEvent,
} from './events/notification-events';

/** Сообщение о действии, опубликованном сервисом-источником. */
export interface NotificationMessage {
  event: NotificationEvent;
  action: NotificationAction;
}

/**
 * Внутренняя шина событий уведомлений.
 *
 * Любой сервис приложения может опубликовать действие (`publish`),
 * а NotificationsService подписан на поток `events$` и выполняет рассылку.
 * Так уведомления собираются из разных сервисов в одном месте.
 */
@Injectable()
export class NotificationBus {
  private readonly subject = new Subject<NotificationMessage>();

  /** Поток опубликованных действий. */
  public get events$(): Observable<NotificationMessage> {
    return this.subject.asObservable();
  }

  /** Публикует действие, произошедшее в сервисе-источнике. */
  public publish(
    event: NotificationEvent,
    action: NotificationAction = {},
  ): void {
    this.subject.next({ event, action });
  }
}
