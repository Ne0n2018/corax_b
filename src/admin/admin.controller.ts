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
import { AdminService } from './admin.service';
import { Authorization } from '../auth/decorators/auth.decorator';
import { UserRole } from '../generated/prisma/enums';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseJsonFieldsPipe } from '../common/pipes/parse-json-fields.pipe';
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

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly productService: ProductService,
    private readonly providerService: ProviderService,
    private readonly categoryService: CategoryService,
  ) {}

  @Post('product')
  @Authorization(UserRole.ADMIN)
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
  @ApiResponse({ status: 201, description: 'Продукт успешно создан' })
  @ApiBadRequestResponse({ description: 'Неверный формат файла или данные' })
  public async createProduct(
    @UploadedFile() image: Express.Multer.File,
    @Body() dto: ProductCreateDto,
  ) {
    return await this.productService.create(image, dto);
  }

  @Put('product:id')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - product')
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

  @Post('category')
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - category')
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

  @Post('subCategory')
  @ApiTags('Admin - subCategory')
  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное создание подкатегории',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'категория не найдена',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'пользователь не авторизован или обладает не достаточным количеством прав',
  })
  @ApiBody({ type: SubCategoryCreateDto })
  @ApiOperation({ summary: 'создание подкатегории' })
  public async createSubCategory(@Body() dto: SubCategoryCreateDto) {
    return this.categoryService.createSubCategory(dto);
  }

  @Put('category:id')
  @ApiTags('Admin - category')
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

  @Put('subCategory:id')
  @ApiTags('Admin - subCategory')
  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'айди подкатегории',
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
  @ApiBody({ type: SubCategoryUpdateDto })
  @ApiOperation({ summary: 'обновление подкатегории' })
  public async updateSubCategory(
    @Param('id') id: string,
    @Body() dto: SubCategoryUpdateDto,
  ) {
    return this.categoryService.updateSubCategory(id, dto);
  }

  @Delete('category:id')
  @ApiTags('Admin - category')
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

  @Delete('subCategory:id')
  @ApiTags('Admin - subCategory')
  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'айди подкатегории',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'успешное удаление подкатегории',
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
  @ApiOperation({ summary: 'удаление подкатегории' })
  public async deleteSubCategory(@Param('id') id: string) {
    return this.categoryService.deleteSubCategory(id);
  }

  @Get('subCategory')
  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiTags('Admin - subCategory')
  @ApiOperation({ summary: 'получение всех подкатегорий для админа' })
  @ApiQuery({ name: 'name', type: String, required: false })
  @ApiQuery({ name: 'categoryId', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, example: 1 })
  public async getAllSubCategories(@Query() filterDto: SubCategoryFilterDto) {
    return this.categoryService.getAllSubCategories(filterDto);
  }

  @Get('category')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное получение всех категорий',
  })
  @Authorization(UserRole.ADMIN)
  @ApiTags('Admin - category')
  @ApiOperation({ summary: 'получение всех категорий вместе с подкатегориями' })
  @ApiQuery({ name: 'name', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, example: 1 })
  public async findAll(@Query() filterDto: CategoryFilterDto) {
    return this.categoryService.getAll(filterDto);
  }
}
