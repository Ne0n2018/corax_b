import { Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

export function JsonParse() {
  return Transform(({ value }) => {
    if (!value) return [];

    // Если уже массив — возвращаем как есть
    if (Array.isArray(value)) return value;

    if (typeof value !== 'string') return [];

    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '[]') return [];

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      // Если пришёл один объект — оборачиваем в массив
      if (typeof parsed === 'object' && parsed !== null) {
        return [parsed];
      }

      return [];
    } catch (error) {
      throw new BadRequestException(`Неверный JSON в поле: ${error.message}`);
    }
  });
}
