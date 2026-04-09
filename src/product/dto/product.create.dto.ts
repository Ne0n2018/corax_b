import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CharacteristicCreateDto } from './characteristic.create.dto';
import { TasteCreateDto } from './taste.create.dto';
import { SizeCreateDto } from './size.create.dto';
import { Type } from 'class-transformer';

export class ProductCreateDto {
  @IsString({ message: 'Имя продукта должно быть стракой' })
  @IsNotEmpty({ message: 'Имя продукта не должно быть пустым' })
  @ApiProperty({
    type: String,
    description: 'Отображаемое имя продукта',
    example: 'Креатин',
  })
  name: string;
  @IsString({ message: 'Описание продукта должно быть стракой' })
  @IsNotEmpty({ message: 'Описание продукта не должно быть пустым' })
  @ApiProperty({
    type: String,
    description: 'Отоборажаемое описание товаров',
    example: 'пример описания',
  })
  description: string;
  @IsString({ message: 'Краткое описание должно быть стракой' })
  @IsNotEmpty({ message: 'Краткое описание не должно быть пустым' })
  @ApiProperty({
    type: String,
    description: 'краткое описание продукта',
    example: 'пример краткого описания',
  })
  shortDescription: string;
  @IsString({ message: 'Айди подкатегории должен быть стракой' })
  @IsNotEmpty({ message: 'Айди подкатегории не должен быть пустым' })
  @ApiProperty({
    type: String,
    description: 'Айди подкотегории к которой принадлежит продукт',
  })
  subCategoryId: string;
  @IsNumber({}, { message: 'Цена должна быть числом' })
  @IsNotEmpty({ message: 'Цена продукта не должна быть пустой' })
  @ApiProperty({
    type: Number,
    description: 'Базовая цена товара(без опций)',
    example: 100,
  })
  defaultPrice: number;
  @IsString({ message: 'Преимущество должно быть стракой' })
  @IsNotEmpty({ message: 'Преимущество не должно быть пустым' })
  @ApiProperty({
    type: String,
    description: 'Преимущество товара',
    example: 'дешево,вкусно,сердито',
  })
  advantages: string;
  @IsString({ message: 'Состав должен быть стракой' })
  @IsNotEmpty({ message: 'Состав не должен быть пустым' })
  @ApiProperty({
    type: String,
    description: 'Состав продукта',
    example: 'химия,биология,математика',
  })
  structure: string;
  @IsString({ message: 'Форма выпуска должна быть стракой' })
  @IsNotEmpty({ message: 'Форма выпуска не должна быть пустой' })
  @ApiProperty({
    type: String,
    description: 'Форма выпуска товара ',
    example: 'таблетки',
  })
  formRelease: string;
  @IsString({ message: 'Айди производителя товара должен быть стракой' })
  @IsNotEmpty({ message: 'Айди производителя товара не должен быть пустым' })
  @ApiProperty({ type: String, description: 'Айди производителя товара' })
  providerId: string;
  @Type(() => CharacteristicCreateDto)
  @ApiProperty({
    type: () => CharacteristicCreateDto,
    isArray: true,
    example: [{ name: 'Вес упаковки', value: '500 г' }],
  })
  characteristic: CharacteristicCreateDto[];

  @Type(() => TasteCreateDto)
  @ApiProperty({
    type: () => TasteCreateDto,
    isArray: true,
    example: [{ name: 'Клубника', price: 1490 }],
  })
  taste: TasteCreateDto[];

  @Type(() => SizeCreateDto)
  @ApiProperty({
    type: () => SizeCreateDto,
    isArray: true,
    example: [{ name: 'XL', price: 1590 }],
  })
  size: SizeCreateDto[];
}
