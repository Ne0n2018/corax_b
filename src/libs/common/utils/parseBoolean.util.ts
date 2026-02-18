/**
 * Парсит значение в boolean
 * Поддерживает: true, false, "true", "false", "1", "0", "yes", "no", "on", "off", "y", "n", "t", "f"
 *
 * @param value - любое значение (string, number, boolean, null, undefined и т.д.)
 * @param defaultValue - значение по умолчанию, если парсинг не удался (по умолчанию undefined)
 * @returns boolean | undefined
 */
export function parseBoolean(
  value: unknown,
  defaultValue: boolean | undefined = undefined,
): boolean | undefined {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  // Уже boolean
  if (typeof value === 'boolean') {
    return value;
  }

  // Число
  if (typeof value === 'number') {
    return value !== 0;
  }

  // Строка
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'yes', 'on', 'y', 't'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'off', 'n', 'f'].includes(normalized)) {
      return false;
    }
  }

  // Если ничего не подошло — возвращаем defaultValue
  return defaultValue;
}

/**
 * Строгая версия — выбрасывает ошибку при неизвестном значении
 */
export function parseBooleanStrict(value: unknown): boolean {
  const result = parseBoolean(value);

  if (result === undefined) {
    throw new TypeError(
      `Cannot parse boolean from value: ${JSON.stringify(value)}`,
    );
  }

  return result;
}

export default parseBoolean;
