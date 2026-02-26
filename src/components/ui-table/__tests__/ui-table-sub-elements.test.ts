// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-table.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-table-head', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-table-head')).toBeDefined();
  });
});

describe('ui-table-body', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-table-body')).toBeDefined();
  });
});

describe('ui-table-cell', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-table-cell')).toBeDefined();
  });
});
