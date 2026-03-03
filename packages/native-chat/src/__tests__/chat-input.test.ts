// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../register.ts';
import { define, NTextarea, NButton } from '@nonoun/native-ui';

define('n-textarea', NTextarea);
define('n-button', NButton);

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-chat-input');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }

  // Stamp children: textarea + actions with primary submit button
  const textarea = document.createElement('n-textarea');
  textarea.setAttribute('placeholder', 'Type a message...');
  el.appendChild(textarea);

  const actions = document.createElement('n-chat-input-actions');
  const btn = document.createElement('n-button');
  btn.setAttribute('variant', 'primary');
  btn.setAttribute('data-submit', '');
  btn.textContent = 'Send';
  actions.appendChild(btn);
  el.appendChild(actions);

  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('n-chat-input', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-chat-input')).toBeDefined();
  });

  it('discovers textarea and submit button children', () => {
    const el = create();
    // value delegates to textarea
    expect((el as any).value).toBe('');
  });

  it('value getter/setter delegates to textarea', () => {
    const el = create();
    const textarea = el.querySelector('n-textarea')!;
    (textarea as any).value = 'hello';
    expect((el as any).value).toBe('hello');
  });

  it('value setter updates textarea', () => {
    const el = create();
    (el as any).value = 'world';
    const textarea = el.querySelector('n-textarea')!;
    expect((textarea as any).value).toBe('world');
  });

  it('disabled property toggles attribute', () => {
    const el = create();
    expect((el as any).disabled).toBe(false);
    (el as any).disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    (el as any).disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  it('disabled propagates to textarea child', () => {
    const el = create({ disabled: '' });
    const textarea = el.querySelector('n-textarea')!;
    expect(textarea.hasAttribute('disabled')).toBe(true);
  });

  it('disabled propagates to submit button', () => {
    const el = create({ disabled: '' });
    const btn = el.querySelector('[data-submit]')!;
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('removing disabled re-enables textarea', () => {
    const el = create({ disabled: '' });
    (el as any).disabled = false;
    const textarea = el.querySelector('n-textarea')!;
    expect(textarea.hasAttribute('disabled')).toBe(false);
  });
});

describe('n-chat-input — submit', () => {
  it('dispatches native:send on Enter key when textarea has content', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:send', handler);

    // Set value on the textarea
    const textarea = el.querySelector('n-textarea')!;
    (textarea as any).value = 'hello';

    // Simulate Enter keydown from within textarea
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('hello');
  });

  it('does not dispatch native:send on Enter when disabled', () => {
    const el = create({ disabled: '' });
    const handler = vi.fn();
    el.addEventListener('native:send', handler);

    const textarea = el.querySelector('n-textarea')!;
    (textarea as any).value = 'hello';

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not dispatch native:send on Enter when no-enter-submit is set', () => {
    const el = create({ 'no-enter-submit': '' });
    const handler = vi.fn();
    el.addEventListener('native:send', handler);

    const textarea = el.querySelector('n-textarea')!;
    (textarea as any).value = 'hello';

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not dispatch native:send on Enter when textarea is empty', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:send', handler);

    const textarea = el.querySelector('n-textarea')!;
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('Shift+Enter does not trigger send', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:send', handler);

    const textarea = el.querySelector('n-textarea')!;
    (textarea as any).value = 'hello';

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('clears textarea after successful send (default)', () => {
    const el = create();
    const textarea = el.querySelector('n-textarea')!;
    (textarea as any).value = 'hello';

    textarea.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));

    expect((el as any).value).toBe('');
  });

  it('does not clear textarea when no-auto-clear is set', () => {
    const el = create({ 'no-auto-clear': '' });
    const textarea = el.querySelector('n-textarea')!;
    (textarea as any).value = 'hello';

    textarea.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));

    expect((el as any).value).toBe('hello');
  });
});

describe('n-chat-input — submit button state', () => {
  it('submit button is disabled when textarea is empty', () => {
    const el = create();
    const btn = el.querySelector('[data-submit]')!;
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('submit button enables when textarea has content via native:input event', () => {
    const el = create();
    const textarea = el.querySelector('n-textarea')!;
    const btn = el.querySelector('[data-submit]')!;

    // Set content and fire native:input
    (textarea as any).value = 'hi';
    textarea.dispatchEvent(new CustomEvent('native:input', {
      bubbles: true,
      detail: { value: 'hi' },
    }));

    expect(btn.hasAttribute('disabled')).toBe(false);
  });
});

describe('n-chat-input — teardown', () => {
  it('removes listeners on disconnect', () => {
    const el = create();
    document.body.removeChild(el);
    // No errors should occur when dispatching events after teardown
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
});
