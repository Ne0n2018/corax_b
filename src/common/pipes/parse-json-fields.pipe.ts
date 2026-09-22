// src/common/pipes/parse-json-fields.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseJsonFieldsPipe implements PipeTransform {
  constructor(private readonly fields: string[] = []) {}

  transform(value: any) {
    if (!value || typeof value !== 'object') return value;

    const result = { ...value };

    for (const field of this.fields) {
      let raw = result[field];

      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed || trimmed === 'string' || trimmed === 'null' || trimmed === 'undefined') {
          delete result[field];
          continue;
        }

        if (trimmed === '[]') {
          result[field] = [];
          continue;
        }

        try {
          let parsed = JSON.parse(trimmed);

          // Гарантируем, что это всегда массив
          if (!Array.isArray(parsed)) {
            parsed = [parsed];
          }

          // Очищаем от обёрток типа { "0": {...} }
          parsed = parsed.map((item: any) => {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
              // Если есть ключ "0" — берём значение из него
              if (item['0'] && typeof item['0'] === 'object') {
                return { ...item['0'] };
              }
              return { ...item }; // обычный объект
            }
            return item;
          });

          result[field] = parsed;
        } catch (e) {
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
        } else if (val === '' || val === 'null' || val === 'undefined' || val === 'string') {
          delete result.isClothes;
        }
      }
    }

    return result;
  }
}
