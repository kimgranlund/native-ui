// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { isTypingContext } from '../typing-context.ts';

// ── Helpers ──

function keydown(target: EventTarget, key: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  target.dispatchEvent(e);
  return e;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('isTypingContext', () => {
  it('returns true for <input> target', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const e = keydown(input, '?');
    expect(isTypingContext(e)).toBe(true);
  });

  it('returns true for <textarea> target', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const e = keydown(textarea, '?');
    expect(isTypingContext(e)).toBe(true);
  });

  it('returns true for contenteditable element', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    const e = keydown(div, '?');
    expect(isTypingContext(e)).toBe(true);
  });

  it('returns true for role="textbox" element', () => {
    const div = document.createElement('div');
    div.setAttribute('role', 'textbox');
    document.body.appendChild(div);
    const e = keydown(div, '?');
    expect(isTypingContext(e)).toBe(true);
  });

  it('returns true for n-input custom element tag', () => {
    const el = document.createElement('n-input');
    document.body.appendChild(el);
    const e = keydown(el, '?');
    expect(isTypingContext(e)).toBe(true);
  });

  it('returns true for n-textarea custom element tag', () => {
    const el = document.createElement('n-textarea');
    document.body.appendChild(el);
    const e = keydown(el, '?');
    expect(isTypingContext(e)).toBe(true);
  });

  it('returns true for n-chat-input custom element tag', () => {
    const el = document.createElement('n-chat-input');
    document.body.appendChild(el);
    const e = keydown(el, '?');
    expect(isTypingContext(e)).toBe(true);
  });

  it('returns false for plain div', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const e = keydown(div, '?');
    expect(isTypingContext(e)).toBe(false);
  });

  it('returns false for button', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    const e = keydown(btn, '?');
    expect(isTypingContext(e)).toBe(false);
  });

  it('returns true when input is nested inside a container', () => {
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    wrapper.appendChild(input);
    document.body.appendChild(wrapper);
    const e = keydown(input, '?');
    expect(isTypingContext(e)).toBe(true);
  });

  it('returns true when input is in composed path (event bubbles through)', () => {
    const container = document.createElement('div');
    const input = document.createElement('input');
    container.appendChild(input);
    document.body.appendChild(container);

    // Listen on container, but event originates from input
    let captured: KeyboardEvent | null = null;
    container.addEventListener('keydown', (e) => { captured = e; });
    keydown(input, '?');

    expect(captured).not.toBeNull();
    expect(isTypingContext(captured!)).toBe(true);
  });
});
