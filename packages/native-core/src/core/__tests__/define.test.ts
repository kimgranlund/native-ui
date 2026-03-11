// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { define } from '../define.ts';

describe('define', () => {
  it('registers a custom element', () => {
    class DefTestA extends HTMLElement {}
    define('def-test-a', DefTestA);
    expect(customElements.get('def-test-a')).toBe(DefTestA);
  });

  it('is idempotent — second call with same tag is a no-op', () => {
    class DefTestB extends HTMLElement {}
    class DefTestB2 extends HTMLElement {}
    define('def-test-b', DefTestB);
    define('def-test-b', DefTestB2);
    // First class wins
    expect(customElements.get('def-test-b')).toBe(DefTestB);
  });

  it('allows different tags for different classes', () => {
    class DefTestC extends HTMLElement {}
    class DefTestD extends HTMLElement {}
    define('def-test-c', DefTestC);
    define('def-test-d', DefTestD);
    expect(customElements.get('def-test-c')).toBe(DefTestC);
    expect(customElements.get('def-test-d')).toBe(DefTestD);
  });
});
