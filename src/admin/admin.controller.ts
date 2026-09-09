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
  Provider,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Authorization } from '../auth/decorators/auth.decorator';
import { UserRole } from '../generated/prisma/enums';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseJsonFieldsPipe } from '../common/pipes/parse-json-fields.pipe';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiExcludeController,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductCreateWithImageDto } from '../product/dto/product.createWithImage.dto';
import { ProductCreateDto } from '../product/dto/product.create.dto';
import { ProductService } from '../product/product.service';
import { ProductUpdateWithImageDto } from '../product/dto/product.updateWithImage.dto';
import { ProductUpdateDto } from '../product/dto/product.update.dto';
import { ProviderUpdateWithImageDto } from '../provider/dto/provider.updateWithImage.dto';
import { ProviderUpdateDto } from '../provider/dto/provider.update.dto';
import { ProviderCreateDto } from '../provider/dto/provider.create.dto';
import { ProviderCreateWithImageDto } from '../provider/dto/Provider.createWithImage.dto';
import { ProviderService } from '../provider/provider.service';
import { CategoryUpdateDto } from '../category/dto/category.update.dto';
import { SubCategoryCreateDto } from '../category/dto/subCategory.create.dto';
import { CreateCategoryDto } from '../category/dto/category.create.dto';
import { CategoryService } from '../category/category.service';
import { SubCategoryUpdateDto } from '../category/dto/subCategory.update.dto';
import { ProductFilterDto } from '../product/dto/product.filter.dto';
import { ProviderFilterDto } from '../provider/dto/provider.filter.dto';
import { SubCategoryFilterDto } from '../category/dto/filter/subCategory.filter.dto';
import { CategoryFilterDto } from '../category/dto/filter/category.filter.dto';
import { UpdateUserDto } from '../user/dto/updateUserDto';
import { GetUsersDto } from './dto/user.get.dto';
import { UsersPaginatedResponseDto } from './dto/user.response.dto';
import { UserBlockedDTO } from './dto/user.blocked.dto';
import { PromotionCreateWithImageDto } from '../promotion/dto/promotion.createWithImage.dto';
import { PromotionService } from '../promotion/promotion.service';
import { PromotionFilterDto } from '../promotion/dto/promotion.filter.dto';
import { plainToInstance } from 'class-transformer';
import { PromotionResponseDto } from '../promotion/dto/response/promotion.response.dto';
import { PromotionUpdateDto } from '../promotion/dto/promotion.update.dto';
import { PromotionUpdateWithImageDto } from '../promotion/dto/promotion.updateWithImage.dto';
import { PromotionCreateDto } from '../promotion/dto/promotion.create.dto';
import { CreatePromoDto } from '../order/promo/dto/create.promo.dto';
import { UpdatePromoDto } from '../order/promo/dto/update.promo.dto';
import { PromoCodeService } from '../order/promo/promo-code.service';
import { UserUpdateRoleDto } from './dto/user.updateRole.dto';

const validationPipe = new ValidationPipe({
  transform: true,
  exceptionFactory: (errors) => new BadRequestException(errors),
});

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly productService: ProductService,
    private readonly providerService: ProviderService,
    private readonly categoryService: CategoryService,
    private readonly promotionService: PromotionService,
    private readonly promoCodeService: PromoCodeService,
  ) {}

  @Post('product')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - product')
  @ApiExcludeEndpoint(false)
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
  @ApiResponse({ status: 201, description: 'Продукт успешно создан' })
  @ApiBadRequestResponse({ description: 'Неверный формат файла или данные' })
  @ApiExcludeEndpoint(false)
  public async createProduct(
    @UploadedFile() image: Express.Multer.File,
    @Body() dto: ProductCreateDto,
  ) {
    return await this.productService.create(image, dto);
  }

  @Put('product:id')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - product')
  @ApiExcludeEndpoint(false)
  @UseInterceptors(FileInterceptor('image'))
  @UsePipes(new ParseJsonFieldsPipe(['characteristic', 'taste', 'size']))
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        console.log(errors);
        new BadRequestException(errors);
      },
    }),
  )
  @ApiOperation({ summary: 'Обновить продукт (только ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ProductUpdateWithImageDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'продукт успешно обновлен',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'пользователь не авторизован или обладает не достаточным количеством прав',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'продукт не найден',
  })
  public async updateProduct(
    @Param('id') id: string,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Body() dto: ProductUpdateDto,
  ) {
    return await this.productService.update(id, image, dto);
  }

  @Delete('product:id')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - product')
  @ApiExcludeEndpoint(false)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'удалить продукт (только ADMIN)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'продукт успешно удален' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'пользователь не авторизован или обладает не достаточным количеством прав',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'продукт не найден',
  })
  public async deleteProduct(@Param('id') id: string) {
    return await this.productService.delete(id);
  }

  @Get('product')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - product')
  @ApiExcludeEndpoint(false)
  @ApiOperation({ summary: 'получение всех продуктов для админ панели' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'subCategoryId', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное получение всех продуктов',
  })
  public async getProduct(@Query() dto: ProductFilterDto) {
    return this.productService.getAll(dto);
  }

  @Get('product/:id')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - product')
  @ApiExcludeEndpoint(false)
  @ApiOperation({ summary: 'получение продукта для айди для админ понели' })
  @ApiParam({
    name: 'id',
    required: true,
    type: 'string',
    description: 'айди запрашиваемого продукта',
  })
  public async getProductById(@Param('id') id: string) {
    return this.productService.getById(id);
  }

  @Post('provider')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - provider')
  @ApiExcludeEndpoint(false)
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать нового производителя (Только ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Данные производителя + изображение',
    type: ProviderCreateWithImageDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Успешное создание производителя',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Пользователь не авторизован или имеет недостаточно прав',
  })
  @ApiOperation({ summary: 'создание нового поставщика (только ADMIN)' })
  public async createProvider(
    @Body() dto: ProviderCreateDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return this.providerService.create(dto, image);
  }

  @Put('provider:id')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - provider')
  @ApiExcludeEndpoint(false)
  @UseInterceptors(FileInterceptor('image'))
  @ApiQuery({ type: String, name: 'id', description: 'Айди производителя' })
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное обновление производителя',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'пользователь не авторизован или не облодает достаточнвми правами',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'производитель не найден',
  })
  @ApiBody({ type: ProviderUpdateWithImageDto })
  @ApiOperation({ summary: 'обновление производителя (только ADMIN)' })
  public async update(
    @Param('id') id: string,
    @Body() dto: ProviderUpdateDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.providerService.update(dto, id, image);
  }

  @Delete('provider:id')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - provider')
  @ApiExcludeEndpoint(false)
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Айди удаляемоего поставщика',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Поставщик успешно удален',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'Пользователь не авторизован или обладает недостаточным количеством прав',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поставщик с таким айди не найден',
  })
  @ApiOperation({
    summary: 'Удаление поставщика (только ADMIN)',
  })
  public async deleteProvider(@Param('id') id: string) {
    return this.providerService.delete(id);
  }

  @Get('provider')
  @HttpCode(HttpStatus.OK)
  @Authorization(UserRole.ADMIN)
  @ApiExcludeEndpoint(false)
  @ApiOperation({ summary: 'получение всех проихводителей для админа' })
  @ApiTags('Admin - provider')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успещное получение всех поставщиков',
  })
  @ApiQuery({ name: 'name', type: 'string', required: false })
  public async ProviderFindAll(@Query() filterDto: ProviderFilterDto) {
    return this.providerService.findAll(filterDto);
  }

  @Get('provider:id')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - provider')
  @ApiExcludeEndpoint(false)
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Айди запрашиваегомого поставщика',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'Пользователь не авторизован или обладает недостаточным количеством прав',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поставщик с таким айди не найден',
  })
  @ApiOperation({
    summary: 'получение поставщика по айди (только ADMIN)',
  })
  public async getProviderById(@Param('id') id: string) {
    return await this.providerService.findByIdAdmin(id);
  }

  @Post('category')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - category')
  @ApiExcludeEndpoint(false)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное создание категории',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'пользователь не авторизован или обладает недостаточными провами',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiOperation({ summary: 'создание категории' })
  public async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Put('category:id')
  @ApiTags('Admin - category')
  @ApiExcludeEndpoint(false)
  @Authorization(UserRole.ADMIN)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Айди категории для обновления',
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное обновление категории',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'пользователь не авторизован или не облодает достаточнвми правами',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'категория не найдена',
  })
  @ApiBody({ type: CategoryUpdateDto })
  @ApiOperation({ summary: 'обновление категории' })
  public async updateCategory(
    @Param('id') id: string,
    @Body() dto: CategoryUpdateDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  @Get('Category:id')
  @ApiTags('Admin - Category')
  @ApiExcludeEndpoint(false)
  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'айди категории',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное обновление подкатегории',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'пользователь не авторизован или обладает не достаточным количеством прав',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'не найдена подкатегория',
  })
  @ApiOperation({ summary: 'получение категорий с подкотегориями по айди' })
  public async updateSubCategory(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Delete('category:id')
  @ApiTags('Admin - category')
  @ApiExcludeEndpoint(false)
  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'айди категории',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'успешное удаление категории',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'пользователь не авторизован или обладает не достаточным количеством прав',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'не найдена категория',
  })
  @ApiOperation({ summary: 'удаление категории' })
  public async delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }

  @Get('category')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное получение всех категорий',
  })
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - category')
  @ApiExcludeEndpoint(false)
  @ApiOperation({ summary: 'получение всех категорий вместе с подкатегориями' })
  @ApiQuery({ name: 'name', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, example: 1 })
  public async findAll(@Query() filterDto: CategoryFilterDto) {
    return this.categoryService.getAll(filterDto);
  }

  @Get('sabCategory')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное получение всех категорий',
  })
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - subCategory')
  @ApiExcludeEndpoint(false)
  @ApiOperation({
    summary: 'получение всех подкатегорий вместе с подкатегориями',
  })
  public async getSubCategory() {
    return this.categoryService.getSubCategory();
  }

  @Post('user/:id')
  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiTags('Admin - user')
  @ApiExcludeEndpoint(false)
  @ApiOperation({ summary: 'обновление роли пользователя' })
  public async updateUser(
    @Param('id') id: string,
    @Body() dto: UserUpdateRoleDto,
  ) {
    const { role } = dto;
    return this.adminService.updateUser(id, role);
  }

  @Get('users')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - user')
  @ApiExcludeEndpoint(false)
  @ApiOperation({
    summary:
      'Получить всех пользователей с пагинацией, поиском и сортировкой (только ADMIN)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Номер страницы',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Количество элементов на странице',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'john',
    description: 'Поиск по имени, email или телефону',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Фильтр по роли пользователя',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
    description: 'Поле для сортировки (createdAt, name, email и т.д.)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Направление сортировки',
  })
  public async getAllUsers(
    @Query() dto: GetUsersDto,
  ): Promise<UsersPaginatedResponseDto> {
    return this.adminService.getAllUsers(dto);
  }

  @Put('users/block/:id')
  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiTags('Admin - user')
  @ApiOperation({ summary: 'блокировка и разблокировка пользователя' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
  })
  public async blockedUser(
    @Param('id') id: string,
    @Body() dto: UserBlockedDTO,
  ) {
    return this.adminService.blockUser(id, dto);
  }

  @Post('promotion')
  @Authorization(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @UsePipes(validationPipe)
  @ApiOperation({ summary: 'Создать новую акцию (только ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Данные акции + изображение',
    type: PromotionCreateWithImageDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Акция успешно создана',
  })
  @ApiBadRequestResponse({ description: 'Неверный формат файла или данные' })
  @ApiTags('Admin - promotion')
  public async PromotionCreate(
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
  @Authorization(UserRole.ADMIN)
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
  @ApiTags('Admin - promotion')
  public async PromotionUpdate(
    @Param('id') id: string,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Body() dto: PromotionUpdateDto,
  ) {
    const promotion = await this.promotionService.update(id, image, dto);
    return plainToInstance(PromotionResponseDto, promotion);
  }

  @Delete('promotion:id')
  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить акцию (только ADMIN)' })
  @ApiParam({ name: 'id', type: String, description: 'ID акции' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Акция успешно удалена' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Акция не найдена',
  })
  @ApiTags('Admin - promotion')
  public async PromotionDelete(@Param('id') id: string) {
    return await this.promotionService.delete(id);
  }

  @Get('promotion')
  @Authorization(UserRole.ADMIN)
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
  @ApiTags('Admin - promotion')
  public async getAll(@Query() filterDto: PromotionFilterDto) {
    const result = await this.promotionService.getAll(filterDto);
    return {
      items: plainToInstance(PromotionResponseDto, result),
    };
  }

  @Get('promotion/:id')
  @Authorization(UserRole.ADMIN)
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
  @ApiTags('Admin - promotion')
  public async getById(@Param('id') id: string) {
    const promotion = await this.promotionService.getById(id);
    return plainToInstance(PromotionResponseDto, promotion);
  }

  @Post('promo')
  @Authorization(UserRole.ADMIN)
  @ApiOperation({ summary: 'Создать промокод' })
  @ApiTags('Admin - promo')
  async createPromoCode(@Body() data: CreatePromoDto) {
    return this.promoCodeService.createPromoCode(data);
  }

  @Put('promo/:id')
  @Authorization(UserRole.ADMIN)
  @ApiOperation({ summary: 'обновление данных промокода' })
  @ApiParam({
    name: 'id',
    type: 'string',
    required: true,
  })
  @ApiTags('Admin - promo')
  async updatePromoCode(@Param('id') id: string, @Body() data: UpdatePromoDto) {
    return this.promoCodeService.updatePromoCode(data, id);
  }

  @Delete('promo/:id')
  @Authorization(UserRole.ADMIN)
  @ApiOperation({ summary: 'удаление промокода' })
  @ApiParam({ name: 'id', type: 'string', required: true })
  @ApiTags('Admin - promo')
  async deletePromoCode(@Param('id') id: string) {
    return this.promoCodeService.deletePromoCode(id);
  }

  @Get('promo')
  @Authorization(UserRole.ADMIN)
  @ApiOperation({ summary: 'Получене всех промокодов (для Админа)' })
  @ApiTags('Admin - promo')
  async getPromoCode() {
    return this.promoCodeService.getAllPromoCodes();
  }
}
