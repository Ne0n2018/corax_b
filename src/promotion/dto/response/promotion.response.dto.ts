import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DiscountMethod, PromotionType } from '../../../generated/prisma/enums';

export class PromotionResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  imageUrl: string;

  @ApiProperty({ type: String })
  description: string;

  @ApiProperty({ enum: PromotionType as unknown as string[] })
  type: PromotionType;

  @ApiProperty({ enum: DiscountMethod as unknown as string[] })
  discountMethod: DiscountMethod;

  @ApiProperty({ type: Number })
  discountValue: number;

  @ApiProperty({ type: Number, nullable: true })
  buyQuantity: number | null;

  @ApiProperty({ type: Number, nullable: true })
  getQuantity: number | null;

  @ApiProperty({ type: Number, nullable: true })
  popularTopN: number | null;

  @ApiProperty({ type: Boolean })
  active: boolean;

  @ApiProperty({ type: Date, nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
