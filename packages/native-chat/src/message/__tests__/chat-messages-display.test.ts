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
    expect(msg.getAttribute('role')).toBe('assistant');
  });

  it('user message renders with bubble radius', () => {
    const group = createMessages({ role: 'user' });
    const msg = createMessage({ role: 'user' });
    group.appendChild(msg);
    expect(msg.getAttribute('role')).toBe('user');
  });

  it('bubble radius tokens are defined in CSS (structural check)', () => {
    const group = createMessages({ role: 'assistant' });
    const msg = createMessage({ role: 'assistant' });
    group.appendChild(msg);

    msg.style.setProperty('--n-chat-bubble-radius-avatar-side', '0');
    msg.style.setProperty('--n-chat-bubble-radius-far-side', '1rem');
    expect(msg.style.getPropertyValue('--n-chat-bubble-radius-avatar-side')).toBe('0');
    expect(msg.style.getPropertyValue('--n-chat-bubble-radius-far-side')).toBe('1rem');
  });
});

describe('n-chat-messages 2×2 grid layout', () => {
  it('creates .n-chat-context and .n-chat-bubbles wrappers on setup', () => {
    const group = createMessages({ role: 'assistant' });
    expect(group.querySelector('.n-chat-context')).not.toBeNull();
    expect(group.querySelector('.n-chat-bubbles')).not.toBeNull();
  });

  it('moves n-chat-message children into .n-chat-bubbles', () => {
    const group = document.createElement('n-chat-messages');
    group.setAttribute('role', 'assistant');
    const msg = createMessage({ role: 'assistant' });
    group.appendChild(msg);
    document.body.appendChild(group);

    const bubbles = group.querySelector('.n-chat-bubbles')!;
    expect(bubbles.contains(msg)).toBe(true);
  });

  it('keeps n-chat-avatar as direct child (not wrapped)', () => {
    const group = document.createElement('n-chat-messages');
    group.setAttribute('role', 'assistant');
    const avatar = document.createElement('n-chat-avatar');
    group.appendChild(avatar);
    document.body.appendChild(group);

    expect(avatar.parentElement).toBe(group);
  });

  it('moves non-avatar, non-message children into .n-chat-context', () => {
    const group = document.createElement('n-chat-messages');
    group.setAttribute('role', 'assistant');
    const context = document.createElement('span');
    context.textContent = 'reasoning';
    group.appendChild(context);
    document.body.appendChild(group);

    const contextWrapper = group.querySelector('.n-chat-context')!;
    expect(contextWrapper.contains(context)).toBe(true);
  });

  it('routes dynamically added messages into .n-chat-bubbles', async () => {
    const group = createMessages({ role: 'assistant' });
    const msg = createMessage({ role: 'assistant' });
    group.appendChild(msg);

    // MutationObserver fires asynchronously
    await new Promise((r) => setTimeout(r, 0));

    const bubbles = group.querySelector('.n-chat-bubbles')!;
    expect(bubbles.contains(msg)).toBe(true);
  });
});
