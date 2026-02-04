import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import { AuthMetod } from '../generated/prisma/enums';

@Injectable()
export class AuthService {
  public constructor(private readonly userService: UserService) {}
  public async register(dto: RegisterDto) {
    const isExists = await this.userService.findByEmail(dto.email);
    if (isExists) {
      throw new ConflictException(
        'Регестрация не удалась.Пользователь с таким email уже существует.Пожалуйста используете другой email или войдите в систему',
      );
    }

    return await this.userService.create(
      dto.email,
      dto.password,
      dto.name,
      AuthMetod.CREDENTIALS,
      false,
    );
  }
  public async login() {}
  public async logout() {}
  private async saveSession() {}
}
