import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../libs/s3/s3.service';
import { ProviderService } from '../provider/provider.service';
import { CategoryService } from '../category/category.service';
import { AppCacheService } from '../libs/cache/cache.service';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ProductCreateDto } from './dto/product.create.dto';
import { ProductUpdateDto } from './dto/product.update.dto';

describe('ProductService (create, update, delete)', () => {
  let service: ProductService;
  let prismaService: {
    product: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let s3Service: {
    uploadImage: jest.Mock;
    deleteByUrl: jest.Mock;
  };
  let providerService: {
    findById: jest.Mock;
  };
  let categoryService: {
    findByIdSubCategory: jest.Mock;
  };
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    clearProductCache: jest.Mock;
  };

  const mockImage = {
    originalname: 'test-product.png',
    mimetype: 'image/png',
    buffer: Buffer.from('fake-image-data'),
  } as Express.Multer.File;

  beforeEach(async () => {
    prismaService = {
      product: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    s3Service = {
      uploadImage: jest.fn().mockResolvedValue('https://s3.example.com/test-product.png'),
      deleteByUrl: jest.fn().mockResolvedValue(true),
    };

    providerService = {
      findById: jest.fn().mockResolvedValue({ id: 'provider-1', name: 'Test Provider' }),
    };

    categoryService = {
      findByIdSubCategory: jest.fn().mockResolvedValue({ id: 'subcat-1', name: 'Proteins' }),
    };

    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clearProductCache: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: prismaService },
        { provide: S3Service, useValue: s3Service },
        { provide: ProviderService, useValue: providerService },
        { provide: CategoryService, useValue: categoryService },
        { provide: AppCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: ProductCreateDto = {
      name: 'Whey Protein 100%',
      description: 'High quality whey protein',
      shortDescription: 'Whey Protein',
      formRelease: 'Порошок',
      structure: 'Концентрат сывороточного белка',
      advantages: 'Быстрое усвоение',
      defaultPrice: 120,
      providerId: 'provider-1',
      subCategoryId: 'subcat-1',
      isClothes: false,
      characteristic: [{ name: 'Вес', value: '1000г' }],
      taste: [{ name: 'Шоколад', price: 120 }],
      size: [],
    };

    it('должен успешно создать продукт, загрузить картинку в S3 и очистить кэш', async () => {
      prismaService.product.create.mockResolvedValue({
        id: 'product-new-id',
        ...createDto,
        imageUrl: 'https://s3.example.com/test-product.png',
      });

      const result = await service.create(mockImage, createDto);

      expect(providerService.findById).toHaveBeenCalledWith('provider-1');
      expect(categoryService.findByIdSubCategory).toHaveBeenCalledWith('subcat-1');
      expect(s3Service.uploadImage).toHaveBeenCalledWith(
        mockImage.originalname,
        mockImage.buffer,
        mockImage.mimetype,
      );
      expect(prismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Whey Protein 100%',
            defaultPrice: 120,
            imageUrl: 'https://s3.example.com/test-product.png',
            providerId: 'provider-1',
            subCategoryId: 'subcat-1',
          }),
        }),
      );
      expect(cacheService.clearProductCache).toHaveBeenCalledWith('product-new-id');
      expect(result).toEqual({
        message: 'Продукт успешно создан',
        productId: 'product-new-id',
      });
    });

    it('должен удалить картинку из S3 и выбросить исключение, если создание в БД упало', async () => {
      prismaService.product.create.mockRejectedValue(new Error('DB Connection lost'));

      await expect(service.create(mockImage, createDto)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(s3Service.deleteByUrl).toHaveBeenCalledWith(
        'https://s3.example.com/test-product.png',
      );
      expect(cacheService.clearProductCache).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const existingProduct = {
      id: 'product-existing-id',
      name: 'Old Whey Protein',
      defaultPrice: 100,
      imageUrl: 'https://s3.example.com/old-image.png',
      providerId: 'provider-1',
      subCategoryId: 'subcat-1',
    };

    const updateDto: ProductUpdateDto = {
      name: 'Updated Whey Protein',
      defaultPrice: 135,
      taste: [{ name: 'Ваниль', price: 135 }],
    };

    it('должен успешно обновить продукт без смены изображения и очистить кэш', async () => {
      prismaService.product.findUnique.mockResolvedValue(existingProduct);
      prismaService.product.update.mockResolvedValue({
        ...existingProduct,
        ...updateDto,
      });

      const result = await service.update('product-existing-id', undefined, updateDto);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-existing-id' },
        }),
      );
      expect(s3Service.uploadImage).not.toHaveBeenCalled();
      expect(prismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-existing-id' },
          data: expect.objectContaining({
            name: 'Updated Whey Protein',
            defaultPrice: 135,
          }),
        }),
      );
      expect(cacheService.clearProductCache).toHaveBeenCalledWith('product-existing-id');
      expect(result).toEqual({ message: 'Продукт успешно обновлен' });
    });

    it('должен заменить картинку в S3 (удалить старую, загрузить новую) при передаче нового файла', async () => {
      prismaService.product.findUnique.mockResolvedValue(existingProduct);
      s3Service.uploadImage.mockResolvedValue('https://s3.example.com/new-image.png');
      prismaService.product.update.mockResolvedValue({
        ...existingProduct,
        imageUrl: 'https://s3.example.com/new-image.png',
      });

      await service.update('product-existing-id', mockImage, updateDto);

      expect(s3Service.deleteByUrl).toHaveBeenCalledWith(existingProduct.imageUrl);
      expect(s3Service.uploadImage).toHaveBeenCalledWith(
        mockImage.originalname,
        mockImage.buffer,
        mockImage.mimetype,
      );
      expect(prismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-existing-id' },
          data: expect.objectContaining({
            imageUrl: 'https://s3.example.com/new-image.png',
          }),
        }),
      );
      expect(cacheService.clearProductCache).toHaveBeenCalledWith('product-existing-id');
    });

    it('должен выбросить NotFoundException, если обновляемый продукт не существует', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', undefined, updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(prismaService.product.update).not.toHaveBeenCalled();
      expect(cacheService.clearProductCache).not.toHaveBeenCalled();
    });

    it('должен корректно обновлять isClothes и игнорировать пустые строки или "string" для subCategoryId/providerId', async () => {
      prismaService.product.findUnique.mockResolvedValue(existingProduct);
      prismaService.product.update.mockResolvedValue({
        ...existingProduct,
        isClothes: true,
      });

      const swaggerDto: ProductUpdateDto = {
        isClothes: true,
        subCategoryId: 'string',
        providerId: '',
        name: 'string',
      };

      await service.update('product-existing-id', undefined, swaggerDto);

      expect(categoryService.findByIdSubCategory).not.toHaveBeenCalled();
      expect(providerService.findById).not.toHaveBeenCalled();
      expect(prismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-existing-id' },
          data: expect.objectContaining({
            isClothes: true,
            subCategoryId: undefined,
            providerId: undefined,
            name: undefined,
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    const existingProduct = {
      id: 'product-to-delete',
      name: 'Product to be deleted',
      imageUrl: 'https://s3.example.com/delete-me.png',
    };

    it('должен удалить картинку из S3, удалить продукт из БД и сбросить кэш', async () => {
      prismaService.product.findUnique.mockResolvedValue(existingProduct);
      prismaService.product.delete.mockResolvedValue(existingProduct);

      const result = await service.delete('product-to-delete');

      expect(prismaService.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-to-delete' },
        }),
      );
      expect(s3Service.deleteByUrl).toHaveBeenCalledWith(existingProduct.imageUrl);
      expect(prismaService.product.delete).toHaveBeenCalledWith({
        where: { id: 'product-to-delete' },
      });
      expect(cacheService.clearProductCache).toHaveBeenCalledWith('product-to-delete');
      expect(result).toEqual({ message: 'Продукт успешно удален' });
    });

    it('должен удалить продукт даже если у него нет imageUrl', async () => {
      prismaService.product.findUnique.mockResolvedValue({
        id: 'product-without-image',
        name: 'No Image Product',
        imageUrl: null,
      });
      prismaService.product.delete.mockResolvedValue({ id: 'product-without-image' });

      const result = await service.delete('product-without-image');

      expect(s3Service.deleteByUrl).not.toHaveBeenCalled();
      expect(prismaService.product.delete).toHaveBeenCalledWith({
        where: { id: 'product-without-image' },
      });
      expect(cacheService.clearProductCache).toHaveBeenCalledWith('product-without-image');
      expect(result).toEqual({ message: 'Продукт успешно удален' });
    });

    it('должен выбросить NotFoundException, если удаляемый продукт не найден', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.delete('missing-id')).rejects.toThrow(NotFoundException);

      expect(s3Service.deleteByUrl).not.toHaveBeenCalled();
      expect(prismaService.product.delete).not.toHaveBeenCalled();
      expect(cacheService.clearProductCache).not.toHaveBeenCalled();
    });
  });
});
