import { describe, it, expect } from 'vitest';
import { uid } from '../uid.ts';

describe('uid', () => {
  it('generates a string with default prefix "ui"', () => {
    const id = uid();
    expect(id).toMatch(/^ui-[a-f0-9]{8}$/);
  });

  it('uses custom prefix', () => {
    const id = uid('tab');
    expect(id).toMatch(/^tab-[a-f0-9]{8}$/);
  });

  it('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => uid()));
    expect(ids.size).toBe(50);
  });
});
