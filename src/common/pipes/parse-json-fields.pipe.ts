// src/common/pipes/parse-json-fields.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseJsonFieldsPipe implements PipeTransform {
  constructor(private readonly fields: string[] = []) {}

  transform(value: unknown) {
    if (!value || typeof value !== 'object') return value;

    const result = { ...(value as Record<string, unknown>) };

    for (const field of this.fields) {
      const raw = result[field];

      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (
          !trimmed ||
          trimmed === 'string' ||
          trimmed === 'null' ||
          trimmed === 'undefined'
        ) {
          delete result[field];
          continue;
        }

        if (trimmed === '[]') {
          result[field] = [];
          continue;
        }

        try {
          let parsed: unknown = JSON.parse(trimmed);

          // Гарантируем, что это всегда массив
          if (!Array.isArray(parsed)) {
            parsed = [parsed];
          }

          // Очищаем от обёрток типа { "0": {...} }
          parsed = (parsed as unknown[]).map((item) => {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
              const obj = item as Record<string, unknown>;
              // Если есть ключ "0" — берём значение из него
              if (obj['0'] && typeof obj['0'] === 'object') {
                return { ...(obj['0'] as Record<string, unknown>) };
              }
              return { ...obj }; // обычный объект
            }
            return item;
          });

          result[field] = parsed;
        } catch {
          throw new BadRequestException(
            `Поле "${field}" содержит некорректный JSON`,
          );
        }
      }
    }

    // Приводим defaultPrice
    if (result.defaultPrice !== undefined) {
      if (
        result.defaultPrice === '' ||
        result.defaultPrice === null ||
        result.defaultPrice === 'string' ||
        result.defaultPrice === 'undefined'
      ) {
        delete result.defaultPrice;
      } else {
        const num = Number(result.defaultPrice);
        if (!isNaN(num)) {
          result.defaultPrice = num;
        } else {
          delete result.defaultPrice;
        }
      }
    }

    // Приводим isClothes к булеву типу до попадания в ValidationPipe с enableImplicitConversion
    if (result.isClothes !== undefined) {
      if (typeof result.isClothes === 'string') {
        const val = result.isClothes.trim().toLowerCase();
        if (val === 'false' || val === '0') {
          result.isClothes = false;
        } else if (val === 'true' || val === '1') {
          result.isClothes = true;
        } else if (
          val === '' ||
          val === 'null' ||
          val === 'undefined' ||
          val === 'string'
        ) {
          delete result.isClothes;
        }
      }
    }

    return result;
  }
}
