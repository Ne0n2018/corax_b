import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { RegisterDto } from '../../../auth/dto/register.dto';

@ValidatorConstraint({ name: 'IsPasswordMatching', async: false })
export class IsPasswordMatchingConstraint implements ValidatorConstraintInterface {
  validate(passwordRepeat: string, args: ValidationArguments): boolean {
    const obj = args.object as RegisterDto;
    return obj.password === passwordRepeat;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Пароли не совпадают';
  }
}
