/**
 * События, которые публикуют другие сервисы приложения.
 *
 * NotificationsService подписан на внутреннюю шину (NotificationBus),
 * принимает эти события и рассылает уведомления пользователям.
 *
 * Каждому событию соответствует текст-шаблон в
 * `notifications/templates/notification.templates.ts`.
 */
export enum NotificationEvent {
  /** Скидка на всю линейку товаров. */
  DISCOUNT_LINE = 'DISCOUNT_LINE',
  /** Скидка на конкретный товар. */
  DISCOUNT_PRODUCT = 'DISCOUNT_PRODUCT',
  /** Скидка на категорию товаров. */
  DISCOUNT_CATEGORY = 'DISCOUNT_CATEGORY',
  /** Акция с подарком («2=3»). */
  PROMO_GIFT = 'PROMO_GIFT',
  /** Скидка при покупке набора товаров. */
  PROMO_BUNDLE = 'PROMO_BUNDLE',
  /** Акция, которая скоро закончится. */
  PROMO_EXPIRING = 'PROMO_EXPIRING',
  /** Персональное напоминание о товаре. */
  PERSONAL_REMINDER = 'PERSONAL_REMINDER',
  /** Приветствие нового пользователя. */
  WELCOME = 'WELCOME',
  /** Возвращение давнего пользователя. */
  WELCOME_BACK = 'WELCOME_BACK',
  /** Поздравление с днём рождения. */
  BIRTHDAY = 'BIRTHDAY',
  /** Блокировка аккаунта. */
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
}

/** Значения, подставляемые в шаблон вместо фрагментов в круглых скобках. */
export type NotificationVars = Record<string, string | number>;

/** Действие, опубликованное сервисом-источником. */
export interface NotificationAction {
  /** Динамические данные для подстановки в шаблон. */
  vars?: NotificationVars;
  /**
   * id пользователя-получателя.
   * Если не указан — уведомление рассылается всем подключённым пользователям.
   */
  userId?: string;
  /** Дополнительные данные, которые нужно передать клиенту как есть. */
  meta?: Record<string, unknown>;
}
