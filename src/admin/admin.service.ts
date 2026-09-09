import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';

import { GetUsersDto } from './dto/user.get.dto';
import { UsersPaginatedResponseDto } from './dto/user.response.dto';
import { UserBlockedDTO } from './dto/user.blocked.dto';
import { MailService } from '../libs/mail/mail.service';
import UserBlockedTemplate from '../libs/mail/templates/user.blocked.template';
import { REDIS_CLIENT } from '../session/redis.provider';
import { Redis } from 'ioredis';
import { UserRole } from '../generated/prisma/enums';

@Injectable()
export class AdminService {
  public constructor(
    private readonly userService: UserService,
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}
  public async updateUser(id: string, role: UserRole) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      await this.prismaService.user.update({
        where: { id },
        data: {
          role,
        },
      });

      return { message: 'Роль пользователя успешно обновлена' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  public async getAllUsers(
    dto: GetUsersDto,
  ): Promise<UsersPaginatedResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { number: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          displayName: true,
          email: true,
          number: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async blockUser(id: string, dto: UserBlockedDTO) {
    const { message } = dto;

    // Получаем пользователя (замените на ваш метод поиска, если он называется иначе)
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Обновляем статус в базе данных
    const update = await this.prismaService.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    if (!update.isActive) {
      // Пользователь заблокирован: записываем флаг в Redis
      await this.redisClient.set(`blocked_user:${id}`, 'true');

      const mail = {
        email: update.email,
        message: message,
        name: update.displayName,
      };

      this.mailService.sendMail(
        update.email,
        'Ваша учетная запись заблокирована',
        UserBlockedTemplate(mail),
      );
    } else {
      // Пользователь разблокирован: удаляем флаг из Redis
      await this.redisClient.del(`blocked_user:${id}`);

      // Опционально: можно добавить отправку письма о разблокировке
    }

    return {
      message: `Пользователь успешно ${update.isActive ? 'разблокирован' : 'заблокирован'}`,
    };
  }
}
