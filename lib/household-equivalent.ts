export const HOUSEHOLD_LOAD_SCALE_FACTOR = 100;

export function toHouseholdEquivalent(value: number): number {
  return value * HOUSEHOLD_LOAD_SCALE_FACTOR;
}
