/** Parse a string to number, returning undefined if empty or NaN. */
export function parseNum(val: string | undefined): number | undefined {
  if (val === undefined || val === '') return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

/** Parse a boolean attribute value. Returns true only for `'true'`. */
export function parseBool(val: string | undefined): boolean {
  return val === 'true';
}

/** Parse an enum attribute value, returning undefined if not in the allowed set. */
export function parseEnum<T extends string>(val: string | undefined, allowed: readonly T[]): T | undefined {
  if (val === undefined || val === '') return undefined;
  return (allowed as readonly string[]).includes(val) ? val as T : undefined;
}
