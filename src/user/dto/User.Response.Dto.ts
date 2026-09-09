import { User, UserRole } from '../../generated/prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  displayName: string;
  isVerified: boolean;
  isActive: boolean;
  role: UserRole;

  address?: string | null;
  birthday?: Date | null;
  number?: string | null;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.displayName = user.displayName;
    this.isVerified = user.isVerified;
    this.isActive = user.isActive;
    this.address = user.address;
    this.birthday = user.birthday;
    this.number = user.number;
    this.role = user.role;
  }
}
