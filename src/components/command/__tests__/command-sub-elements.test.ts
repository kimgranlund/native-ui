// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../command.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-command-list', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-command-list')).toBeDefined();
  });
});

describe('n-command-group', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-command-group')).toBeDefined();
  });
});

describe('n-command-empty', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-command-empty')).toBeDefined();
  });
});
