// ---------------------------------------------------------------------------
// Scale Interface
// ---------------------------------------------------------------------------

export interface Scale<D> {
  domain: [D, D];
  range: [number, number];
  scale(value: D): number;
  invert(pixel: number): D;
  ticks(count?: number): D[];
  format(value: D): string;
}
