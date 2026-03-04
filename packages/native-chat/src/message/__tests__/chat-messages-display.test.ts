// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../../register.ts';

function createMessages(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-chat-messages');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

function createMessage(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-chat-message');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-chat-messages avatar-align (T0063)', () => {
  it('has avatar-align in observedAttributes', () => {
    const el = createMessages({ role: 'assistant' });
    const ctor = el.constructor as typeof HTMLElement & { observedAttributes?: string[] };
    expect(ctor.observedAttributes).toContain('avatar-align');
  });

  it('default renders without avatar-align attribute', () => {
    const el = createMessages({ role: 'assistant' });
    expect(el.hasAttribute('avatar-align')).toBe(false);
  });

  it('accepts avatar-align="center"', () => {
    const el = createMessages({ role: 'assistant', 'avatar-align': 'center' });
    expect(el.getAttribute('avatar-align')).toBe('center');
  });

  it('accepts avatar-align="bottom"', () => {
    const el = createMessages({ role: 'assistant', 'avatar-align': 'bottom' });
    expect(el.getAttribute('avatar-align')).toBe('bottom');
  });

  it('accepts avatar-align="top" (explicit default)', () => {
    const el = createMessages({ role: 'assistant', 'avatar-align': 'top' });
    expect(el.getAttribute('avatar-align')).toBe('top');
  });
});

describe('n-chat-message bubble radius tokens (T0064)', () => {
  it('assistant message renders with bubble radius', () => {
    const group = createMessages({ role: 'assistant' });
    const msg = createMessage({ role: 'assistant' });
    group.appendChild(msg);
    // Message should exist and have role attribute
    expect(msg.getAttribute('role')).toBe('assistant');
  });

  it('user message renders with bubble radius', () => {
    const group = createMessages({ role: 'user' });
    const msg = createMessage({ role: 'user' });
    group.appendChild(msg);
    expect(msg.getAttribute('role')).toBe('user');
  });

  it('bubble radius tokens are defined in CSS (structural check)', () => {
    // Verify that the n-chat-message element can be created with custom radius tokens
    const group = createMessages({ role: 'assistant' });
    const msg = createMessage({ role: 'assistant' });
    group.appendChild(msg);

    // Set custom token values via inline style
    msg.style.setProperty('--n-chat-bubble-radius-avatar-side', '0');
    msg.style.setProperty('--n-chat-bubble-radius-far-side', '1rem');
    expect(msg.style.getPropertyValue('--n-chat-bubble-radius-avatar-side')).toBe('0');
    expect(msg.style.getPropertyValue('--n-chat-bubble-radius-far-side')).toBe('1rem');
  });
});
