// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-textarea.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

function createElement(): HTMLElement {
  const el = document.createElement('ui-textarea');
  document.body.appendChild(el);
  return el;
}

describe('ui-textarea', () => {
  describe('registration', () => {
    it('is registered as a custom element', () => {
      expect(customElements.get('ui-textarea')).toBeDefined();
    });
  });

  describe('setup', () => {
    it('sets contenteditable="plaintext-only" on setup when not already present', () => {
      const el = createElement();
      expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
    });

    it('does not overwrite contenteditable if already set before connection', () => {
      const el = document.createElement('ui-textarea');
      el.setAttribute('contenteditable', 'false');
      document.body.appendChild(el);
      // The element already had contenteditable set; setup should not overwrite it
      expect(el.getAttribute('contenteditable')).toBe('false');
    });
  });

  describe('value property', () => {
    it('getter reads textContent', () => {
      const el = createElement();
      el.textContent = 'hello';
      expect((el as any).value).toBe('hello');
    });

    it('setter sets textContent', () => {
      const el = createElement();
      (el as any).value = 'world';
      expect(el.textContent).toBe('world');
    });

    it('setter with empty string clears textContent', () => {
      const el = createElement();
      (el as any).value = 'something';
      (el as any).value = '';
      expect(el.textContent).toBe('');
    });
  });

  describe('placeholder property', () => {
    it('getter reads from attribute', () => {
      const el = createElement();
      el.setAttribute('placeholder', 'Enter text');
      expect((el as any).placeholder).toBe('Enter text');
    });

    it('setter reflects to attribute', () => {
      const el = createElement();
      (el as any).placeholder = 'Type here...';
      expect(el.getAttribute('placeholder')).toBe('Type here...');
    });

    it('getter returns empty string when attribute is absent', () => {
      const el = createElement();
      expect((el as any).placeholder).toBe('');
    });
  });

  describe('name property', () => {
    it('getter reads from attribute', () => {
      const el = createElement();
      el.setAttribute('name', 'bio');
      expect((el as any).name).toBe('bio');
    });

    it('setter reflects to attribute', () => {
      const el = createElement();
      (el as any).name = 'description';
      expect(el.getAttribute('name')).toBe('description');
    });

    it('getter returns empty string when attribute is absent', () => {
      const el = createElement();
      expect((el as any).name).toBe('');
    });
  });

  describe('disabled property', () => {
    it('setter adds disabled attribute when set to true', () => {
      const el = createElement();
      (el as any).disabled = true;
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('setter removes disabled attribute when set to false', () => {
      const el = createElement();
      el.setAttribute('disabled', '');
      (el as any).disabled = false;
      expect(el.hasAttribute('disabled')).toBe(false);
    });

    it('getter returns true when disabled attribute is present', () => {
      const el = createElement();
      (el as any).disabled = true;
      expect((el as any).disabled).toBe(true);
    });

    it('getter returns false when disabled attribute is absent', () => {
      const el = createElement();
      expect((el as any).disabled).toBe(false);
    });

    it('sets contenteditable="false" when disabled', () => {
      const el = createElement();
      el.setAttribute('disabled', '');
      // attributeChangedCallback handles this
      expect(el.getAttribute('contenteditable')).toBe('false');
    });

    it('restores contenteditable="plaintext-only" when enabled', () => {
      const el = createElement();
      el.setAttribute('disabled', '');
      el.removeAttribute('disabled');
      expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
    });
  });

  describe('readOnly property', () => {
    it('setter adds readonly attribute when set to true', () => {
      const el = createElement();
      (el as any).readOnly = true;
      expect(el.hasAttribute('readonly')).toBe(true);
    });

    it('setter removes readonly attribute when set to false', () => {
      const el = createElement();
      (el as any).readOnly = true;
      (el as any).readOnly = false;
      expect(el.hasAttribute('readonly')).toBe(false);
    });

    it('getter returns true when readonly attribute is present', () => {
      const el = createElement();
      (el as any).readOnly = true;
      expect((el as any).readOnly).toBe(true);
    });

    it('getter returns false when readonly attribute is absent', () => {
      const el = createElement();
      expect((el as any).readOnly).toBe(false);
    });

    it('sets contenteditable="false" when readOnly is true', () => {
      const el = createElement();
      (el as any).readOnly = true;
      expect(el.getAttribute('contenteditable')).toBe('false');
    });

    it('sets contenteditable="plaintext-only" when readOnly is false', () => {
      const el = createElement();
      (el as any).readOnly = true;
      (el as any).readOnly = false;
      expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
    });
  });

  describe('required property', () => {
    it('setter adds required attribute when set to true', () => {
      const el = createElement();
      (el as any).required = true;
      expect(el.hasAttribute('required')).toBe(true);
    });

    it('setter removes required attribute when set to false', () => {
      const el = createElement();
      (el as any).required = true;
      (el as any).required = false;
      expect(el.hasAttribute('required')).toBe(false);
    });

    it('getter returns true when required attribute is present', () => {
      const el = createElement();
      (el as any).required = true;
      expect((el as any).required).toBe(true);
    });

    it('getter returns false when required attribute is absent', () => {
      const el = createElement();
      expect((el as any).required).toBe(false);
    });
  });

  describe('ui-input event', () => {
    it('dispatches ui-input CustomEvent on native input event', () => {
      const el = createElement();
      el.textContent = 'typed text';

      const handler = vi.fn();
      el.addEventListener('ui-input', handler);

      el.dispatchEvent(new Event('input', { bubbles: true }));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('ui-input event carries value in detail', () => {
      const el = createElement();
      el.textContent = 'hello world';

      let detail: any;
      el.addEventListener('ui-input', (e: Event) => {
        detail = (e as CustomEvent).detail;
      });

      el.dispatchEvent(new Event('input', { bubbles: true }));

      expect(detail).toBeDefined();
      expect(detail.value).toBe('hello world');
    });

    it('ui-input event bubbles', () => {
      const el = createElement();
      el.textContent = 'test';

      const handler = vi.fn();
      document.body.addEventListener('ui-input', handler);

      el.dispatchEvent(new Event('input', { bubbles: true }));

      expect(handler).toHaveBeenCalledOnce();
      document.body.removeEventListener('ui-input', handler);
    });
  });

  describe('ui-change event', () => {
    it('dispatches ui-change CustomEvent on blur', () => {
      const el = createElement();
      el.textContent = 'final value';

      const handler = vi.fn();
      el.addEventListener('ui-change', handler);

      el.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('ui-change event carries value in detail', () => {
      const el = createElement();
      el.textContent = 'committed text';

      let detail: any;
      el.addEventListener('ui-change', (e: Event) => {
        detail = (e as CustomEvent).detail;
      });

      el.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(detail).toBeDefined();
      expect(detail.value).toBe('committed text');
    });

    it('ui-change event bubbles', () => {
      const el = createElement();
      el.textContent = 'test';

      const handler = vi.fn();
      document.body.addEventListener('ui-change', handler);

      el.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(handler).toHaveBeenCalledOnce();
      document.body.removeEventListener('ui-change', handler);
    });
  });

  describe('formResetCallback', () => {
    it('clears textContent on form reset', () => {
      const el = createElement();
      el.textContent = 'some content';
      (el as any).formResetCallback();
      expect(el.textContent).toBe('');
    });

    it('value getter returns empty string after reset', () => {
      const el = createElement();
      (el as any).value = 'data';
      (el as any).formResetCallback();
      expect((el as any).value).toBe('');
    });

    it('restores disabled state based on attribute after reset', () => {
      const el = createElement();
      (el as any).formResetCallback();
      // No disabled attribute present — disabled should be false
      expect((el as any).disabled).toBe(false);
    });

    it('preserves disabled attribute state after reset when attribute is present', () => {
      const el = createElement();
      el.setAttribute('disabled', '');
      (el as any).formResetCallback();
      // disabled attribute is still present — signal should reflect true
      expect((el as any).disabled).toBe(true);
    });
  });

  describe('maxlength enforcement', () => {
    it('truncates textContent to maxlength on input when value exceeds limit', () => {
      const el = createElement();
      el.setAttribute('maxlength', '5');
      el.textContent = 'hello world'; // 11 chars, exceeds limit of 5

      el.dispatchEvent(new Event('input', { bubbles: true }));

      expect(el.textContent).toBe('hello');
    });

    it('does not truncate when value is within maxlength', () => {
      const el = createElement();
      el.setAttribute('maxlength', '10');
      el.textContent = 'hi';

      el.dispatchEvent(new Event('input', { bubbles: true }));

      expect(el.textContent).toBe('hi');
    });

    it('does not truncate when maxlength attribute is absent', () => {
      const el = createElement();
      el.textContent = 'a very long string without any limit applied here';

      el.dispatchEvent(new Event('input', { bubbles: true }));

      expect(el.textContent).toBe('a very long string without any limit applied here');
    });

    it('ui-input detail.value reflects truncated value', () => {
      const el = createElement();
      el.setAttribute('maxlength', '3');
      el.textContent = 'abcdef';

      let detail: any;
      el.addEventListener('ui-input', (e: Event) => {
        detail = (e as CustomEvent).detail;
      });

      el.dispatchEvent(new Event('input', { bubbles: true }));

      expect(detail.value).toBe('abc');
    });
  });
});
