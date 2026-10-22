import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationBus } from './notifications.bus';
import { NotificationEvent } from './events/notification-events';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      create: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
    user: { findMany: jest.Mock };
  };
  let gateway: {
    broadcast: jest.Mock;
    sendToUser: jest.Mock;
  };
  let bus: NotificationBus;

  const dbNotification = {
    id: 'notif-1',
    message: 'Скидка 15% на аминокислоты и BCAA. Действует до конца недели.',
    type: 'DISCOUNT',
    event: NotificationEvent.DISCOUNT_CATEGORY,
    meta: {},
    read: false,
    createdAt: new Date('2026-10-17T12:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn().mockResolvedValue(dbNotification),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([dbNotification]),
        count: jest.fn().mockResolvedValue(3),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]),
      },
    };
    gateway = { broadcast: jest.fn(), sendToUser: jest.fn() };
    bus = new NotificationBus();

    service = new NotificationsService(prisma as never, gateway as never, bus);
  });

  it('сохраняет персональное уведомление и шлёт его в комнату пользователя', async () => {
    const payload = await service.notifyUser(
      'u1',
      NotificationEvent.DISCOUNT_CATEGORY,
      {
        discount: '15%',
        category: 'аминокислоты и BCAA',
        until: 'конца недели',
      },
    );

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(gateway.sendToUser).toHaveBeenCalledWith('u1', payload);
    expect(gateway.broadcast).not.toHaveBeenCalled();
    expect(payload.id).toBe('notif-1');
    expect(payload.message).toBe(
      'Скидка 15% на аминокислоты и BCAA. Действует до конца недели.',
    );
  });

  it('рассылает общее уведомление всем активным пользователям', async () => {
    const payload = await service.broadcast(NotificationEvent.WELCOME_BACK, {
      discount: '15%',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true },
    });
    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);

    const createManyArgs = prisma.notification.createMany.mock.calls[0][0];
    expect(createManyArgs.data).toHaveLength(2);
    expect(createManyArgs.data[0]).toMatchObject({ userId: 'u1', read: false });

    expect(gateway.broadcast).toHaveBeenCalledWith(payload);
    expect(gateway.sendToUser).not.toHaveBeenCalled();
    expect(payload.id).toBeNull();
  });

  it('подписывается на шину событий и рассылает опубликованное действие', async () => {
    service.onModuleInit();

    bus.publish(NotificationEvent.ACCOUNT_BLOCKED, {
      userId: 'u1',
      vars: { reason: 'Спам' },
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          read: false,
          type: 'ACCOUNT',
          message:
            'Ваш аккаунт заблокирован по причине: Спам. Если считаете, что это ошибка, перезвоните нам.',
        }),
      }),
    );
    expect(gateway.sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ id: 'notif-1' }),
    );

    service.onModuleDestroy();
  });

  it('не возвращает удалённые уведомления и фильтрует непрочитанные', async () => {
    await service.getUserNotifications('u1', true);

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', deletedAt: null, read: false },
      }),
    );
  });

  it('возвращает счётчик непрочитанных', async () => {
    await expect(service.getUnreadCount('u1')).resolves.toEqual({ count: 3 });

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'u1', read: false, deletedAt: null },
    });
  });

  it('отмечает уведомление прочитанным', async () => {
    await expect(service.markAsRead('notif-1', 'u1')).resolves.toEqual({
      message: 'Уведомление прочитано',
      id: 'notif-1',
    });

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'notif-1', userId: 'u1', deletedAt: null },
      data: { read: true },
    });
  });

  it('бросает NotFoundException, если уведомление не найдено', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.markAsRead('missing', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('мягко удаляет уведомление', async () => {
    await service.deleteNotification('notif-1', 'u1');

    const args = prisma.notification.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({
      id: 'notif-1',
      userId: 'u1',
      deletedAt: null,
    });
    expect(args.data.deletedAt).toBeInstanceOf(Date);
  });
});
