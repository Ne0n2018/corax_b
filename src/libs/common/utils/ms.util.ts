type TimeUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'mo' | 'y';

const TIME_UNITS: Record<TimeUnit, number> = {
  ms: 1,
  s: 1000,
  m: 1000 * 60,
  h: 1000 * 60 * 60,
  d: 1000 * 60 * 60 * 24,
  w: 1000 * 60 * 60 * 24 * 7,
  mo: 1000 * 60 * 60 * 24 * 30, // ≈ 30 дней
  y: 1000 * 60 * 60 * 24 * 365, // ≈ 365 дней
};

const UNIT_REGEX = /^(\d+)\s*(ms|s|m|h|d|w|mo|y)?$/i;

/**
 * Преобразует строку вида "2h", "30m", "500ms", "1.5d" в миллисекунды
 */
export function ms(input: string | number): number {
  if (typeof input === 'number') {
    return input;
  }

  if (input.trim() === '') {
    throw new Error('Invalid time string');
  }

  const trimmed = input.trim();
  const match = trimmed.match(UNIT_REGEX);

  if (!match) {
    throw new Error(`Invalid time format: ${input}`);
  }

  const value = parseFloat(match[1]);
  const unit = (match[2]?.toLowerCase() as TimeUnit) || 'ms';

  if (isNaN(value) || value < 0) {
    throw new Error(`Invalid numeric value: ${input}`);
  }

  const multiplier = TIME_UNITS[unit];
  if (!multiplier) {
    throw new Error(`Unknown time unit: ${unit}`);
  }

  return Math.floor(value * multiplier);
}

/**
 * Удобный алиас
 */
export const toMs = ms;

export default ms;
