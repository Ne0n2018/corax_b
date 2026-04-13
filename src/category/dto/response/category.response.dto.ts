import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

class SubCategoryResponseDto {
  @ApiProperty({ type: String })
  id: string;
  @ApiProperty({ type: String })
  name: string;
  @Exclude()
  categoryId: string;
  @Exclude()
  createdAt: Date;
  @Exclude()
  updatedAt: Date;
}

export class CategoryResponseDto {
  @ApiProperty({ type: String })
  id: string;
  @ApiProperty({ type: String })
  name: string;
  @ApiProperty({ type: () => [SubCategoryResponseDto] })
  @Type(() => SubCategoryResponseDto)
  SubCategory?: SubCategoryResponseDto[];
  @Exclude()
  createdAt: Date;
  @Exclude()
  updatedAt: Date;
}
