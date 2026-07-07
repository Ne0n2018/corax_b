import { ApiProperty } from '@nestjs/swagger';

/**
 * Публичный ответ по акции — то, что видит покупатель.
 * Только название, изображение, описание и дата истечения.
 */
export class PromotionPublicResponseDto {
  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  imageUrl: string;

  @ApiProperty({ type: String })
  description: string;

  @ApiProperty({ type: Date, nullable: true })
  expiresAt: Date | null;
}