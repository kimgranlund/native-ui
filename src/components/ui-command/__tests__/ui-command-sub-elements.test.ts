// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-command.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-command-list', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-command-list')).toBeDefined();
  });
});

describe('ui-command-group', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-command-group')).toBeDefined();
  });
});

describe('ui-command-empty', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-command-empty')).toBeDefined();
  });
});
