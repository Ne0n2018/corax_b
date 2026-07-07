import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { Authorization } from '../auth/decorators/auth.decorator';
import { UserRole } from '../generated/prisma/enums';
import { PromotionService } from './promotion.service';
import { PromotionCreateDto } from './dto/promotion.create.dto';
import { PromotionCreateWithImageDto } from './dto/promotion.createWithImage.dto';
import { PromotionUpdateDto } from './dto/promotion.update.dto';
import { PromotionUpdateWithImageDto } from './dto/promotion.updateWithImage.dto';
import { PromotionFilterDto } from './dto/promotion.filter.dto';
import { PromotionResponseDto } from './dto/response/promotion.response.dto';
import { PromotionPublicResponseDto } from './dto/response/promotion.public.response.dto';

// Внимание: НЕ включаем enableImplicitConversion здесь.
// Из multipart/form-data булевы поля приходят строками "true"/"false",
// а неявная конвертация class-transformer делает Boolean("false") === true.
// Поэтому числа парсим явно через @Type(()=>Number), а булевы — через @Transform.
const validationPipe = new ValidationPipe({
  transform: true,
  exceptionFactory: (errors) => new BadRequestException(errors),
});

@ApiTags('Promotion')
@Controller('promotions')
export class PromotionController {
  public constructor(
    private readonly promotionService: PromotionService,
  ) {}

  @Post()
  @Authorization(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @UsePipes(validationPipe)
  @ApiOperation({ summary: 'Создать новую акцию (только ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Данные акции + изображение',
    type: PromotionCreateWithImageDto,
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Акция успешно создана' })
  @ApiBadRequestResponse({ description: 'Неверный формат файла или данные' })
  public async create(
    @UploadedFile() image: Express.Multer.File,
    @Body() dto: PromotionCreateDto,
  ) {
    if (!image) {
      throw new BadRequestException('Изображение акции обязательно');
    }
    const promotion = await this.promotionService.create(image, dto);
    return plainToInstance(PromotionResponseDto, promotion);
  }

  // /active объявляем ПЕРЕД /:id, чтобы NestJS не сопоставил "active" с параметром.
  @Get('active')
  @ApiOperation({ summary: 'Активные акции (публичный доступ)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список активных акций: название, изображение, описание, дата истечения',
  })
  public async getActive() {
    const promotions = await this.promotionService.getActive();
    return plainToInstance(PromotionPublicResponseDto, promotions);
  }

  @Get()
  @Authorization(UserRole.ADMIN)
  @ApiOperation({ summary: 'Список акций с пагинацией/фильтром (только ADMIN)' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'active', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Успешное получение списка акций' })
  public async getAll(@Query() filterDto: PromotionFilterDto) {
    const result = await this.promotionService.getAll(filterDto);
    return {
      items: plainToInstance(PromotionResponseDto, result.items),
      total: result.total,
    };
  }

  @Get(':id')
  @Authorization(UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить акцию по ID (только ADMIN)' })
  @ApiParam({ name: 'id', type: String, description: 'ID акции' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Успешное получение акции' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Акция не найдена' })
  public async getById(@Param('id') id: string) {
    const promotion = await this.promotionService.getById(id);
    return plainToInstance(PromotionResponseDto, promotion);
  }

  @Put(':id')
  @Authorization(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @UsePipes(validationPipe)
  @ApiOperation({ summary: 'Обновить акцию (только ADMIN, изображение необязательно)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: PromotionUpdateWithImageDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Акция успешно обновлена' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Акция не найдена' })
  public async update(
    @Param('id') id: string,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Body() dto: PromotionUpdateDto,
  ) {
    const promotion = await this.promotionService.update(id, image, dto);
    return plainToInstance(PromotionResponseDto, promotion);
  }

  @Delete(':id')
  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить акцию (только ADMIN)' })
  @ApiParam({ name: 'id', type: String, description: 'ID акции' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Акция успешно удалена' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Акция не найдена' })
  public async delete(@Param('id') id: string) {
    return await this.promotionService.delete(id);
  }
}