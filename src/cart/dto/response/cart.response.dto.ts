import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

class ProviderShortDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @Exclude()
  imageUrl: string;

  @Exclude()
  description: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  products: unknown;
}

class ProductShortDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  imageUrl: string;

  @ApiProperty({ type: String })
  shortDescription: string;

  @Exclude()
  description: string;

  @Exclude()
  advantages: string;

  @Exclude()
  structure: string;

  @Exclude()
  formRelease: string;

  @Exclude()
  defaultPrice: number;

  @Exclude()
  subCategoryId: string;

  @Exclude()
  providerId: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @ApiProperty({ type: () => ProviderShortDto })
  @Type(() => ProviderShortDto)
  Provider: ProviderShortDto;
}

class ProductItemDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: Number, description: 'Цена выбранного варианта' })
  price: number;

  @ApiProperty({ type: String, description: 'Вкус' })
  taste: string;

  @ApiProperty({ type: String, description: 'Размер' })
  size: string;

  @Exclude()
  productId: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @ApiProperty({ type: () => ProductShortDto })
  @Type(() => ProductShortDto)
  product: ProductShortDto;
}

class CartItemDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: Number, description: 'Количество единиц' })
  quantity: number;

  @Exclude()
  cartId: string;

  @Exclude()
  productItemId: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @ApiProperty({ type: () => ProductItemDto })
  @Type(() => ProductItemDto)
  productItem: ProductItemDto;
}

export class CartResponse {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  userId: string;

  @ApiProperty({ type: Number, description: 'Итоговая сумма корзины' })
  totalAmount: number;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @ApiProperty({ type: () => [CartItemDto] })
  @Type(() => CartItemDto)
  CartItem: CartItemDto[];
}
