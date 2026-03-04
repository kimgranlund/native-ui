// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../../register.ts';
import { ACTION_REGISTRY, ROLE_DEFAULTS } from '../chat-message-element.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-chat-message');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

/** Find the actions toolbar — always a child (below-position uses popover) */
function findToolbar(el: HTMLElement): HTMLElement | null {
  return el.querySelector('n-toolbar[data-role="actions"]');
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('n-chat-message actions (T0046)', () => {
  it('stamps default assistant actions', () => {
    const el = create({ role: 'assistant' });
    const toolbar = findToolbar(el);
    expect(toolbar).not.toBeNull();

    const buttons = toolbar!.querySelectorAll('[data-action]');
    const actions = Array.from(buttons).map((b) => b.getAttribute('data-action'));
    expect(actions).toEqual(ROLE_DEFAULTS.assistant);
  });

  it('stamps default user actions', () => {
    const el = create({ role: 'user' });
    const toolbar = findToolbar(el);
    expect(toolbar).not.toBeNull();

    const buttons = toolbar!.querySelectorAll('[data-action]');
    const actions = Array.from(buttons).map((b) => b.getAttribute('data-action'));
    expect(actions).toEqual(ROLE_DEFAULTS.user);
  });

  it('actions="none" suppresses toolbar', () => {
    const el = create({ role: 'assistant', actions: 'none' });
    expect(findToolbar(el)).toBeNull();
  });

  it('custom actions list renders only specified actions', () => {
    const el = create({ role: 'assistant', actions: 'copy,retry' });
    const toolbar = findToolbar(el)!;
    const buttons = toolbar.querySelectorAll('[data-action]');
    const actions = Array.from(buttons).map((b) => b.getAttribute('data-action'));
    expect(actions).toEqual(['copy', 'retry']);
  });

  it('default actions-style="icon" renders icons without text', () => {
    const el = create({ role: 'assistant', actions: 'copy' });
    const toolbar = findToolbar(el)!;
    const btn = toolbar.querySelector('[data-action="copy"]')!;
    expect(btn.querySelector('n-icon')).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Copy');
    // Icon-only: no text child node
    const textNodes = Array.from(btn.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '',
    );
    expect(textNodes).toHaveLength(0);
  });

  it('actions-style="label" renders text without icons', () => {
    const el = create({ role: 'assistant', actions: 'copy', 'actions-style': 'label', 'actions-position': 'inside' });
    const btn = el.querySelector('[data-action="copy"]')!;
    expect(btn.querySelector('n-icon')).toBeNull();
    const textNodes = Array.from(btn.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '',
    );
    expect(textNodes.length).toBeGreaterThan(0);
  });

  it('actions-style="icon-label" renders both icon and text', () => {
    const el = create({ role: 'assistant', actions: 'copy', 'actions-style': 'icon-label', 'actions-position': 'inside' });
    const btn = el.querySelector('[data-action="copy"]')!;
    expect(btn.querySelector('n-icon')).not.toBeNull();
    const textNodes = Array.from(btn.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '',
    );
    expect(textNodes.length).toBeGreaterThan(0);
  });

  it('slot="actions" child prevents auto-stamping', () => {
    const el = document.createElement('n-chat-message');
    el.setAttribute('role', 'assistant');
    const customToolbar = document.createElement('n-toolbar');
    customToolbar.setAttribute('slot', 'actions');
    el.appendChild(customToolbar);
    document.body.appendChild(el);

    // Should not have the auto-stamped toolbar
    expect(findToolbar(el)).toBeNull();
  });

  it('fires native:message-action on action press', () => {
    const el = create({ role: 'assistant', 'message-id': 'msg-1' });
    const handler = vi.fn();
    el.addEventListener('native:message-action', handler);

    const toolbar = findToolbar(el)!;
    const copyBtn = toolbar.querySelector('[data-action="copy"]') as HTMLElement;
    expect(copyBtn).not.toBeNull();

    // Simulate native:press event from button
    copyBtn.dispatchEvent(new CustomEvent('native:press', {
      bubbles: true,
      composed: true,
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({
      action: 'copy',
      messageId: 'msg-1',
    });
  });
});

describe('ACTION_REGISTRY', () => {
  it('has all expected keys', () => {
    expect(ACTION_REGISTRY).toHaveProperty('copy');
    expect(ACTION_REGISTRY).toHaveProperty('retry');
    expect(ACTION_REGISTRY).toHaveProperty('edit');
    expect(ACTION_REGISTRY).toHaveProperty('feedback-up');
    expect(ACTION_REGISTRY).toHaveProperty('feedback-down');
    expect(ACTION_REGISTRY).toHaveProperty('continue');
  });

  it('each entry has label and icon', () => {
    for (const [_key, def] of Object.entries(ACTION_REGISTRY)) {
      expect(typeof def.label).toBe('string');
      expect(typeof def.icon).toBe('string');
    }
  });
});

describe('n-chat-message actions-position (T0062)', () => {
  it('defaults to below — toolbar is a child with popover attribute', () => {
    const el = create({ role: 'assistant' });
    const toolbar = el.querySelector('n-toolbar[data-role="actions"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar!.getAttribute('popover')).toBe('manual');
    expect(toolbar!.parentElement).toBe(el);
  });

  it('actions-position="inside" keeps toolbar inside without popover', () => {
    const el = create({ role: 'assistant', 'actions-position': 'inside' });
    const toolbar = el.querySelector('n-toolbar[data-role="actions"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar!.parentElement).toBe(el);
    expect(toolbar!.hasAttribute('popover')).toBe(false);
  });

  it('actions-position="below" places toolbar as child with popover', () => {
    const el = create({ role: 'assistant', 'actions-position': 'below' });
    const toolbar = el.querySelector('n-toolbar[data-role="actions"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar!.getAttribute('popover')).toBe('manual');
    expect(toolbar!.parentElement).toBe(el);
  });

  it('actionsPosition property reflects to attribute', () => {
    const el = create({ role: 'assistant' }) as any;
    el.actionsPosition = 'below';
    expect(el.getAttribute('actions-position')).toBe('below');
  });

  it('changing actions-position from below to inside removes popover', () => {
    const el = create({ role: 'assistant', 'actions-position': 'below' }) as any;
    // Verify toolbar has popover
    expect(el.querySelector('n-toolbar[data-role="actions"][popover]')).not.toBeNull();

    // Switch to inside
    el.actionsPosition = 'inside';
    const toolbar = el.querySelector('n-toolbar[data-role="actions"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar!.hasAttribute('popover')).toBe(false);
  });
});

describe('n-chat-message partial status (T0049)', () => {
  it('partial status adds continue action', () => {
    const el = create({ role: 'assistant', status: 'partial' });
    const toolbar = findToolbar(el);
    expect(toolbar).not.toBeNull();
    const continueBtn = toolbar!.querySelector('[data-action="continue"]');
    expect(continueBtn).not.toBeNull();
  });

  it('continue button fires native:continue-request', () => {
    const el = create({ role: 'assistant', status: 'partial', 'message-id': 'msg-2' });
    const handler = vi.fn();
    el.addEventListener('native:continue-request', handler);

    const toolbar = findToolbar(el)!;
    const continueBtn = toolbar.querySelector('[data-action="continue"]') as HTMLElement;
    expect(continueBtn).not.toBeNull();

    continueBtn.dispatchEvent(new CustomEvent('native:press', {
      bubbles: true,
      composed: true,
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({
      messageId: 'msg-2',
    });
  });

  it('non-partial status does not include continue action by default', () => {
    const el = create({ role: 'assistant', status: 'sent' });
    const toolbar = findToolbar(el);
    expect(toolbar!.querySelector('[data-action="continue"]')).toBeNull();
  });
});
