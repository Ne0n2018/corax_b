import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CallbackService } from './callback.service';
import { CallbackRequestDto } from './dto/callback.dto';

@ApiTags('Обратный звонок')
@Controller('callback')
export class CallbackController {
  constructor(private readonly callbackService: CallbackService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Запрос на обратный звонок: уведомляет всех администраторов по email',
  })
  @ApiBody({ type: CallbackRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Запрос принят, уведомление отправлено администраторам',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Некорректный номер телефона',
  })
  public async requestCallback(@Body() dto: CallbackRequestDto) {
    return this.callbackService.requestCallback(dto.phone);
  }
}
