import {
  NotificationEvent,
  NotificationVars,
} from '../events/notification-events';

/**
 * Готовые тексты уведомлений (из документа «Оповещения»).
 *
 * Фрагменты в круглых скобках — динамические: при отправке они заменяются
 * значениями из `NotificationVars` (см. `renderNotification`).
 */
export const NOTIFICATION_TEMPLATES: Record<NotificationEvent, string> = {
  [NotificationEvent.DISCOUNT_LINE]:
    'Скидка (discount) на всю линейку (category) до (until)! Успей закупиться перед новым циклом тренировок.',
  [NotificationEvent.DISCOUNT_PRODUCT]:
    '(name), качественный (product) теперь на (discount) дешевле. Промокод не нужен — скидка уже применена в каталоге. Акция действует до (time), (date).',
  [NotificationEvent.DISCOUNT_CATEGORY]:
    'Скидка (discount) на (category). Действует до (until).',
  [NotificationEvent.PROMO_GIFT]:
    'Акция «2=3»: купи (buy) — получи (gift) в подарок!',
  [NotificationEvent.PROMO_BUNDLE]:
    'При покупке (productA) + (productB) — скидка (discount) на весь заказ. Акция действует до (until), количество наборов ограничено.',
  [NotificationEvent.PROMO_EXPIRING]:
    'Осталось (time): -(discount) на всё (category) (items).',
  [NotificationEvent.PERSONAL_REMINDER]:
    '(name), твой любимый (product) закончился месяц назад — самое время докупить. Специально для тебя скидка (discount)',
  [NotificationEvent.WELCOME]:
    'Добро пожаловать в (club)! Скидка (discount) на первый заказ по коду (promo).',
  [NotificationEvent.WELCOME_BACK]:
    'Давно не виделись! Мы приготовили для тебя скидку (discount) — возвращайся к тренировкам с новыми силами.',
  [NotificationEvent.BIRTHDAY]:
    'С днём рождения! Дарим тебе скидку (discount) и бесплатную доставку — на всё, что угодно.',
  [NotificationEvent.ACCOUNT_BLOCKED]:
    'Ваш аккаунт заблокирован по причине: (reason). Если считаете, что это ошибка, перезвоните нам.',
};

/**
 * Подставляет динамические значения в шаблон уведомления.
 *
 * Все фрагменты в круглых скобках считаются переменными: `(name)` будет
 * заменён на `vars.name`. Если значение не передано, фрагмент удаляется.
 */
export function renderNotification(
  event: NotificationEvent,
  vars: NotificationVars = {},
): string {
  const template = NOTIFICATION_TEMPLATES[event] ?? '';

  return template.replace(/\(([^()]+)\)/g, (_match, rawKey: string) => {
    const key = rawKey.trim();
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}
