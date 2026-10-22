import {
  NOTIFICATION_TEMPLATES,
  renderNotification,
} from './notification.templates';
import { NotificationEvent } from '../events/notification-events';

describe('Notification templates', () => {
  it('содержит текст для каждого события', () => {
    for (const event of Object.values(NotificationEvent)) {
      expect(NOTIFICATION_TEMPLATES[event]).toBeDefined();
      expect(NOTIFICATION_TEMPLATES[event].length).toBeGreaterThan(0);
    }
  });

  it('подставляет динамические значения в шаблон', () => {
    const text = renderNotification(NotificationEvent.DISCOUNT_CATEGORY, {
      discount: '15%',
      category: 'аминокислоты и BCAA',
      until: 'конца недели',
    });

    expect(text).toBe(
      'Скидка 15% на аминокислоты и BCAA. Действует до конца недели.',
    );
  });

  it('подставляет персональные значения (имя пользователя)', () => {
    const text = renderNotification(NotificationEvent.WELCOME, {
      club: 'CORAX',
      discount: '10%',
      promo: 'START10',
    });

    expect(text).toBe(
      'Добро пожаловать в CORAX! Скидка 10% на первый заказ по коду START10.',
    );
  });

  it('удаляет фрагменты, для которых не передано значение', () => {
    const text = renderNotification(NotificationEvent.ACCOUNT_BLOCKED, {});

    expect(text).toBe(
      'Ваш аккаунт заблокирован по причине: . Если считаете, что это ошибка, перезвоните нам.',
    );
  });
});
