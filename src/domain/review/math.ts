export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function clampUnit(value: number): number {
  return clamp(value, 0, 1);
}
