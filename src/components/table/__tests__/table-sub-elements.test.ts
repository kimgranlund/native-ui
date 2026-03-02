// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../table.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-table-head', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-table-head')).toBeDefined();
  });
});

describe('n-table-body', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-table-body')).toBeDefined();
  });
});

describe('n-table-cell', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-table-cell')).toBeDefined();
  });
});
