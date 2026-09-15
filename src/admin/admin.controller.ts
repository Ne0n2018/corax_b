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
import { CategoryService } from '../category/category.service';
import { CategoryFilterDto } from '../category/dto/filter/category.filter.dto';
import { CreateCategoryDto } from '../category/dto/category.create.dto';
import { CategoryUpdateDto } from '../category/dto/category.update.dto';
import { ParseJsonFieldsPipe } from '../common/pipes/parse-json-fields.pipe';
import { UserRole } from '../generated/prisma/enums';
import { CreatePromoDto } from '../order/promo/dto/create.promo.dto';
import { UpdatePromoDto } from '../order/promo/dto/update.promo.dto';
import { PromoCodeService } from '../order/promo/promo-code.service';
import { ProductService } from '../product/product.service';
import { ProductCreateDto } from '../product/dto/product.create.dto';
import { ProductCreateWithImageDto } from '../product/dto/product.createWithImage.dto';
import { ProductFilterDto } from '../product/dto/product.filter.dto';
import { ProductUpdateDto } from '../product/dto/product.update.dto';
import { ProductUpdateWithImageDto } from '../product/dto/product.updateWithImage.dto';
import { PromotionService } from '../promotion/promotion.service';
import { PromotionCreateDto } from '../promotion/dto/promotion.create.dto';
import { PromotionCreateWithImageDto } from '../promotion/dto/promotion.createWithImage.dto';
import { PromotionFilterDto } from '../promotion/dto/promotion.filter.dto';
import { PromotionResponseDto } from '../promotion/dto/response/promotion.response.dto';
import { PromotionUpdateDto } from '../promotion/dto/promotion.update.dto';
import { PromotionUpdateWithImageDto } from '../promotion/dto/promotion.updateWithImage.dto';
import { ProviderService } from '../provider/provider.service';
import { ProviderCreateDto } from '../provider/dto/provider.create.dto';
import { ProviderCreateWithImageDto } from '../provider/dto/Provider.createWithImage.dto';
import { ProviderFilterDto } from '../provider/dto/provider.filter.dto';
import { ProviderUpdateDto } from '../provider/dto/provider.update.dto';
import { ProviderUpdateWithImageDto } from '../provider/dto/provider.updateWithImage.dto';
import { AdminService } from './admin.service';

import { GetUsersDto } from './dto/user.get.dto';
import { UserBlockedDTO } from './dto/user.blocked.dto';
import { UsersPaginatedResponseDto } from './dto/user.response.dto';
import { UserUpdateRoleDto } from './dto/user.updateRole.dto';

const validationPipe = new ValidationPipe({
  transform: true,
  exceptionFactory: (errors) => new BadRequestException(errors),
});

@Controller('admin')
@Authorization(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly productService: ProductService,
    private readonly providerService: ProviderService,
    private readonly categoryService: CategoryService,
    private readonly promotionService: PromotionService,
    private readonly promoCodeService: PromoCodeService,
  ) {}

  /* ==================== PRODUCTS ==================== */

  @Post('product')
  @ApiTags('Admin - product')
  @UseInterceptors(FileInterceptor('image'))
  @UsePipes(
    new ParseJsonFieldsPipe(['characteristic', 'taste', 'size']),
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
  )
  @ApiOperation({ summary: 'Создать новый продукт (только ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Данные продукта + изображение',
    type: ProductCreateWithImageDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Продукт успешно создан',
  })
  @ApiBadRequestResponse({ description: 'Неверный формат файла или данные' })
  public async createProduct(
    @UploadedFile() image: Express.Multer.File,
    @Body() dto: ProductCreateDto,
  ) {
    return await this.productService.create(image, dto);
  }

  @Put('product/:id')
  @ApiTags('Admin - product')
  @UseInterceptors(FileInterceptor('image'))
  @UsePipes(new ParseJsonFieldsPipe(['characteristic', 'taste', 'size']))
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        console.log(errors);
        return new BadRequestException(errors);
      },
    }),
  )
  @ApiOperation({ summary: 'Обновить продукт (только ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ProductUpdateWithImageDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Продукт успешно обновлен',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Продукт не найден',
  })
  public async updateProduct(
    @Param('id') id: string,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Body() dto: ProductUpdateDto,
  ) {
    return await this.productService.update(id, image, dto);
  }

  @Delete('product/:id')
  @ApiTags('Admin - product')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить продукт (только ADMIN)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Продукт успешно удален' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Продукт не найден',
  })
  public async deleteProduct(@Param('id') id: string) {
    return await this.productService.delete(id);
  }

  @Get('product')
  @ApiTags('Admin - product')
  @ApiOperation({ summary: 'Получение всех продуктов для админ панели' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'subCategoryId', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное получение всех продуктов',
  })
  public async getProduct(@Query() dto: ProductFilterDto) {
    return this.productService.getAll(dto);
  }

  @Get('product/:id')
  @ApiTags('Admin - product')
  @ApiOperation({ summary: 'Получение продукта по ID для админ панели' })
  @ApiParam({
    name: 'id',
    required: true,
    type: 'string',
    description: 'ID запрашиваемого продукта',
  })
  public async getProductById(@Param('id') id: string) {
    return this.productService.getById(id);
  }

  /* ==================== PROVIDERS ==================== */

  @Post('provider')
  @ApiTags('Admin - provider')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать нового поставщика (только ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Данные поставщика + изображение',
    type: ProviderCreateWithImageDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Успешное создание поставщика',
  })
  public async createProvider(
    @Body() dto: ProviderCreateDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return this.providerService.create(dto, image);
  }

  @Put('provider/:id')
  @ApiTags('Admin - provider')
  @UseInterceptors(FileInterceptor('image'))
  @ApiParam({ name: 'id', type: String, description: 'ID поставщика' })
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное обновление поставщика',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поставщик не найден',
  })
  @ApiBody({ type: ProviderUpdateWithImageDto })
  @ApiOperation({ summary: 'Обновление поставщика (только ADMIN)' })
  public async updateProvider(
    @Param('id') id: string,
    @Body() dto: ProviderUpdateDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.providerService.update(dto, id, image);
  }

  @Delete('provider/:id')
  @ApiTags('Admin - provider')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'ID удаляемого поставщика',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Поставщик успешно удален',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поставщик с таким ID не найден',
  })
  @ApiOperation({ summary: 'Удаление поставщика (только ADMIN)' })
  public async deleteProvider(@Param('id') id: string) {
    return this.providerService.delete(id);
  }

  @Get('provider')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Admin - provider')
  @ApiOperation({ summary: 'Получение всех поставщиков для админа' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное получение всех поставщиков',
  })
  @ApiQuery({ name: 'name', type: 'string', required: false })
  public async providerFindAll(@Query() filterDto: ProviderFilterDto) {
    return this.providerService.findAll(filterDto);
  }

  @Get('provider/:id')
  @ApiTags('Admin - provider')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'ID запрашиваемого поставщика',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поставщик с таким ID не найден',
  })
  @ApiOperation({ summary: 'Получение поставщика по ID (только ADMIN)' })
  public async getProviderById(@Param('id') id: string) {
    return await this.providerService.findByIdAdmin(id);
  }

  /* ==================== CATEGORIES ==================== */

  @Post('category')
  @ApiTags('Admin - category')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное создание категории',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiOperation({ summary: 'Создание категории' })
  public async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Put('category/:id')
  @ApiTags('Admin - category')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'ID категории для обновления',
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное обновление категории',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Категория не найдена',
  })
  @ApiBody({ type: CategoryUpdateDto })
  @ApiOperation({ summary: 'Обновление категории' })
  public async updateCategory(
    @Param('id') id: string,
    @Body() dto: CategoryUpdateDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  @Get('category/:id')
  @ApiTags('Admin - category')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'ID категории',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное получение категории',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Категория не найдена',
  })
  @ApiOperation({ summary: 'Получение категории с подкатегориями по ID' })
  public async getCategoryById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Delete('category/:id')
  @ApiTags('Admin - category')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'ID категории',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Успешное удаление категории',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Категория не найдена',
  })
  @ApiOperation({ summary: 'Удаление категории' })
  public async deleteCategory(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }

  @Get('category')
  @ApiTags('Admin - category')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное получение всех категорий',
  })
  @ApiOperation({ summary: 'Получение всех категорий вместе с подкатегориями' })
  @ApiQuery({ name: 'name', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, example: 1 })
  public async findAllCategories(@Query() filterDto: CategoryFilterDto) {
    return this.categoryService.getAll(filterDto);
  }

  @Get('subcategory')
  @ApiTags('Admin - subCategory')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное получение всех подкатегорий',
  })
  @ApiOperation({ summary: 'Получение всех подкатегорий' })
  public async getSubCategory() {
    return this.categoryService.getSubCategory();
  }

  /* ==================== USERS ==================== */

  @Post('user/:id')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Admin - user')
  @ApiOperation({ summary: 'Обновление роли пользователя' })
  public async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UserUpdateRoleDto,
  ) {
    const { role } = dto;
    return this.adminService.updateUser(id, role);
  }

  @Get('users')
  @ApiTags('Admin - user')
  @ApiOperation({
    summary:
      'Получить всех пользователей с пагинацией, поиском и сортировкой (только ADMIN)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'john' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  public async getAllUsers(
    @Query() dto: GetUsersDto,
  ): Promise<UsersPaginatedResponseDto> {
    return this.adminService.getAllUsers(dto);
  }

  @Put('users/block/:id')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Admin - user')
  @ApiOperation({ summary: 'Блокировка и разблокировка пользователя' })
  @ApiParam({ name: 'id', required: true, type: String })
  public async blockUser(@Param('id') id: string, @Body() dto: UserBlockedDTO) {
    return this.adminService.blockUser(id, dto);
  }

  /* ==================== PROMOTIONS ==================== */

  @Post('promotion')
  @ApiTags('Admin - promotion')
  @UseInterceptors(FileInterceptor('image'))
  @UsePipes(validationPipe)
  @ApiOperation({ summary: 'Создать новую акцию (только ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: PromotionCreateWithImageDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Акция успешно создана',
  })
  @ApiBadRequestResponse({ description: 'Неверный формат файла или данные' })
  public async createPromotion(
    @UploadedFile() image: Express.Multer.File,
    @Body() dto: PromotionCreateDto,
  ) {
    if (!image) {
      throw new BadRequestException('Изображение акции обязательно');
    }
    const promotion = await this.promotionService.create(image, dto);
    return plainToInstance(PromotionResponseDto, promotion);
  }

  @Put('promotion/:id')
  @ApiTags('Admin - promotion')
  @UseInterceptors(FileInterceptor('image'))
  @UsePipes(validationPipe)
  @ApiOperation({
    summary: 'Обновить акцию (только ADMIN, изображение необязательно)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: PromotionUpdateWithImageDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Акция успешно обновлена',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Акция не найдена',
  })
  public async updatePromotion(
    @Param('id') id: string,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Body() dto: PromotionUpdateDto,
  ) {
    const promotion = await this.promotionService.update(id, image, dto);
    return plainToInstance(PromotionResponseDto, promotion);
  }

  @Delete('promotion/:id')
  @ApiTags('Admin - promotion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить акцию (только ADMIN)' })
  @ApiParam({ name: 'id', type: String, description: 'ID акции' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Акция успешно удалена' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Акция не найдена',
  })
  public async deletePromotion(@Param('id') id: string) {
    return await this.promotionService.delete(id);
  }

  @Get('promotion')
  @ApiTags('Admin - promotion')
  @ApiOperation({
    summary: 'Список акций с пагинацией/фильтром (только ADMIN)',
  })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'active', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное получение списка акций',
  })
  public async getAllPromotions(@Query() filterDto: PromotionFilterDto) {
    const result = await this.promotionService.getAll(filterDto);
    return plainToInstance(PromotionResponseDto, result);
  }

  @Get('promotion/:id')
  @ApiTags('Admin - promotion')
  @ApiOperation({ summary: 'Получить акцию по ID (только ADMIN)' })
  @ApiParam({ name: 'id', type: String, description: 'ID акции' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное получение акции',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Акция не найдена',
  })
  public async getPromotionById(@Param('id') id: string) {
    const promotion = await this.promotionService.getById(id);
    return plainToInstance(PromotionResponseDto, promotion);
  }

  /* ==================== PROMO CODES ==================== */

  @Post('promo')
  @ApiTags('Admin - promo')
  @ApiOperation({ summary: 'Создать промокод' })
  public async createPromoCode(@Body() data: CreatePromoDto) {
    return this.promoCodeService.createPromoCode(data);
  }

  @Put('promo/:id')
  @ApiTags('Admin - promo')
  @ApiOperation({ summary: 'Обновление данных промокода' })
  @ApiParam({ name: 'id', type: 'string', required: true })
  public async updatePromoCode(
    @Param('id') id: string,
    @Body() data: UpdatePromoDto,
  ) {
    return this.promoCodeService.updatePromoCode(data, id);
  }

  @Delete('promo/:id')
  @ApiTags('Admin - promo')
  @ApiOperation({ summary: 'Удаление промокода' })
  @ApiParam({ name: 'id', type: 'string', required: true })
  public async deletePromoCode(@Param('id') id: string) {
    return this.promoCodeService.deletePromoCode(id);
  }

  @Get('promo')
  @ApiTags('Admin - promo')
  @ApiOperation({ summary: 'Получение всех промокодов (для Админа)' })
  public async getAllPromoCodes() {
    return this.promoCodeService.getAllPromoCodes();
  }
}
