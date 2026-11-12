/**
 * Округление до 2 знаков после запятой (для денежных сумм BYN).
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
