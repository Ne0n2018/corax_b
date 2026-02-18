import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { hash } from 'argon2';
import { AuthMetod } from '../generated/prisma/enums';
import { UpdateUserDto } from './dto/updateUserDto';

@Injectable()
export class UserService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async findById(id: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id,
      },
      include: {
        accounts: true,
      },
    });
    if (!user) {
      throw new NotFoundException(
        `пользователь не найден. Пожалуйста проверьте введенные данные `,
      );
    }
    return user;
  }
  public async findByEmail(email: string) {
    return this.prismaService.user.findFirst({
      where: {
        email,
      },
      include: {
        accounts: true,
      },
    });
  }
  public async create(
    email: string,
    password: string,
    displayName: string,
    metod: AuthMetod,
    isVerified: boolean,
  ) {
    return this.prismaService.user.create({
      data: {
        email,
        password: password ? await hash(password) : '',
        displayName,
        metod,
        isVerified,
      },
    });
  }
  public async update(id: string, data: UpdateUserDto) {
    return this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        displayName: data.name,
      },
    });
  }
}
