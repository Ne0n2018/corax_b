import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

class ProviderProductResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  imageUrl: string;

  @ApiProperty({ type: String })
  shortDescription: string;

  @ApiProperty({ type: String })
  description: string;

  @ApiProperty({ type: String })
  advantages: string;

  @ApiProperty({ type: String })
  structure: string;

  @ApiProperty({ type: String })
  formRelease: string;

  @ApiProperty({ type: Number })
  defaultPrice: number;

  @Exclude()
  characteristic: any;
  @Exclude()
  Taste: any;
  @Exclude()
  Size: any;
  @Exclude()
  createdAt: Date;
  @Exclude()
  updatedAt: Date;
}

export class ProviderResponseDto {
  @ApiProperty({ type: String })
  id: string;
  @ApiProperty({ type: String })
  name: string;
  @ApiProperty({ type: String })
  imageUrl: string;
  @ApiProperty({ type: String })
  description: string;
  @ApiProperty({
    type: () => [ProviderProductResponseDto], // ← ИСПРАВИЛИ
    required: false,
    description: 'Список продуктов данного производителя',
  })
  @Type(() => ProviderProductResponseDto)
  products?: ProviderProductResponseDto[];

  @Exclude()
  createdAt: Date;
  @Exclude()
  updatedAt: Date;
}
