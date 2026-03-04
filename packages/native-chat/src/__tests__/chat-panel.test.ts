// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../register.ts';
import { define, NTextarea, NButton } from '@nonoun/native-ui';
import type { NChatPanel } from '../chat-panel-element.ts';

define('n-textarea', NTextarea);
define('n-button', NButton);

function create(attrs: Record<string, string> = {}): NChatPanel {
  const el = document.createElement('native-chat-panel') as NChatPanel;
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ── T0059: Imperative open/focus API ──

describe('native-chat-panel — open()', () => {
  it('sets [open] attribute', () => {
    const el = create();
    expect(el.hasAttribute('open')).toBe(false);
    el.open();
    expect(el.hasAttribute('open')).toBe(true);
  });

  it('open() is idempotent — no duplicate events', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:chat-opened', handler);
    el.open();
    el.open();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('close() removes [open] attribute', () => {
    const el = create({ open: '' });
    el.close();
    expect(el.hasAttribute('open')).toBe(false);
  });

  it('close() is idempotent — no duplicate events', () => {
    const el = create({ open: '' });
    const handler = vi.fn();
    el.addEventListener('native:chat-closed', handler);
    el.close();
    el.close();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('native-chat-panel — focusComposer()', () => {
  it('finds and focuses the n-textarea inside n-chat-input', async () => {
    const el = create();
    await el.ready;
    const textarea = el.querySelector('n-textarea') as HTMLElement;
    const spy = vi.spyOn(textarea, 'focus');
    el.focusComposer();
    // May need microtask for retry logic but first attempt should succeed
    await Promise.resolve();
    expect(spy).toHaveBeenCalled();
  });

  it('emits native:composer-focused event', async () => {
    const el = create();
    await el.ready;
    const handler = vi.fn();
    el.addEventListener('native:composer-focused', handler);
    el.focusComposer();
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.by).toBe('api');
  });

  it('emits native:composer-focused with by="policy" when called by policy', async () => {
    const el = create();
    await el.ready;
    const handler = vi.fn();
    el.addEventListener('native:composer-focused', handler);
    el.focusComposer({}, 'policy');
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.by).toBe('policy');
  });
});

// ── T0060: Panel lifecycle events ──

describe('native-chat-panel — lifecycle events', () => {
  it('emits native:chat-opened when open() is called', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:chat-opened', handler);
    el.open({ reason: 'user-click' });
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.source).toBe('user-click');
    expect(detail.focusComposer).toBe(false);
  });

  it('emits native:chat-opened with focusComposer=true when requested', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:chat-opened', handler);
    el.open({ focusComposer: true, reason: 'shortcut' });
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.source).toBe('shortcut');
    expect(detail.focusComposer).toBe(true);
  });

  it('emits native:chat-closed when close() is called', () => {
    const el = create({ open: '' });
    const handler = vi.fn();
    el.addEventListener('native:chat-closed', handler);
    el.close('user-dismiss');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.reason).toBe('user-dismiss');
  });

  it('emits native:chat-opened when [open] attribute is added', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:chat-opened', handler);
    el.setAttribute('open', '');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('emits native:chat-closed when [open] attribute is removed', () => {
    const el = create({ open: '' });
    const handler = vi.fn();
    el.addEventListener('native:chat-closed', handler);
    el.removeAttribute('open');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('open/close events bubble and are composed', () => {
    const el = create();
    const openHandler = vi.fn();
    const closeHandler = vi.fn();
    document.body.addEventListener('native:chat-opened', openHandler);
    document.body.addEventListener('native:chat-closed', closeHandler);
    el.open();
    el.close();
    expect(openHandler).toHaveBeenCalledTimes(1);
    expect(closeHandler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('native:chat-opened', openHandler);
    document.body.removeEventListener('native:chat-closed', closeHandler);
  });
});

// ── T0061: Auto-focus-policy attribute ──

describe('native-chat-panel — auto-focus-policy', () => {
  it('defaults to open-request', () => {
    const el = create();
    expect(el.autoFocusPolicy).toBe('open-request');
  });

  it('reads from attribute', () => {
    const el = create({ 'auto-focus-policy': 'never' });
    expect(el.autoFocusPolicy).toBe('never');
  });

  it('property setter updates attribute', () => {
    const el = create();
    el.autoFocusPolicy = 'ready';
    expect(el.getAttribute('auto-focus-policy')).toBe('ready');
  });

  it('policy=never prevents focusComposer on open', async () => {
    const el = create({ 'auto-focus-policy': 'never' });
    await el.ready;
    const handler = vi.fn();
    el.addEventListener('native:composer-focused', handler);
    el.open({ focusComposer: true });
    // Allow microtasks to flush
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(handler).not.toHaveBeenCalled();
  });

  it('policy=open-request focuses composer when focusComposer=true', async () => {
    const el = create({ 'auto-focus-policy': 'open-request' });
    await el.ready;
    const handler = vi.fn();
    el.addEventListener('native:composer-focused', handler);
    el.open({ focusComposer: true });
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('policy=open-request does NOT focus when focusComposer is omitted', async () => {
    const el = create({ 'auto-focus-policy': 'open-request' });
    await el.ready;
    const handler = vi.fn();
    el.addEventListener('native:composer-focused', handler);
    el.open();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(handler).not.toHaveBeenCalled();
  });

  it('policy=ready focuses composer on setup', async () => {
    const handler = vi.fn();
    document.body.addEventListener('native:composer-focused', handler);
    const el = create({ 'auto-focus-policy': 'ready' });
    await el.ready;
    // Microtask for the ready auto-focus
    await Promise.resolve();
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.by).toBe('policy');
    document.body.removeEventListener('native:composer-focused', handler);
  });
});

// ── T0065: Composer-focus-failed event ──

describe('native-chat-panel — composer-focus-failed', () => {
  it('emits native:composer-focus-failed when composer is not found', async () => {
    const el = create();
    await el.ready;

    // Remove the n-chat-input to simulate missing composer
    const chatInput = el.querySelector('n-chat-input');
    chatInput?.remove();

    const handler = vi.fn();
    el.addEventListener('native:composer-focus-failed', handler);
    el.focusComposer();

    // Wait for all 3 retry microtasks
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.reason).toBe('composer-unavailable');
    expect(detail.attempts).toBe(3);
  });

  it('emits native:composer-focus-failed when composer is disabled', async () => {
    const el = create();
    await el.ready;

    // Disable the chat input
    const chatInput = el.querySelector('n-chat-input') as any;
    chatInput.disabled = true;

    const handler = vi.fn();
    el.addEventListener('native:composer-focus-failed', handler);
    el.focusComposer();

    // Wait for all retry microtasks
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.reason).toBe('disabled');
    expect(handler.mock.calls[0][0].detail.attempts).toBe(3);
  });

  it('focus-failed event bubbles and is composed', async () => {
    const el = create();
    await el.ready;

    const chatInput = el.querySelector('n-chat-input');
    chatInput?.remove();

    const handler = vi.fn();
    document.body.addEventListener('native:composer-focus-failed', handler);
    el.focusComposer();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('native:composer-focus-failed', handler);
  });
});

// ── Existing functionality preserved ──

describe('native-chat-panel — existing behavior', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('native-chat-panel')).toBeDefined();
  });

  it('stamps header, body, and footer', () => {
    const el = create();
    expect(el.querySelector('n-header')).toBeTruthy();
    expect(el.querySelector('n-body')).toBeTruthy();
    expect(el.querySelector('n-footer')).toBeTruthy();
  });

  it('stamps n-chat-input in footer', () => {
    const el = create();
    const footer = el.querySelector('n-footer');
    expect(footer?.querySelector('n-chat-input')).toBeTruthy();
  });

  it('show-stop toggles stop button', () => {
    const el = create();
    expect(el.querySelector('[aria-label="Stop"]')).toBeNull();
    el.showStop = true;
    expect(el.querySelector('[aria-label="Stop"]')).toBeTruthy();
    el.showStop = false;
    expect(el.querySelector('[aria-label="Stop"]')).toBeNull();
  });

  it('show-restart toggles restart button', () => {
    const el = create();
    expect(el.querySelector('[aria-label="Restart"]')).toBeNull();
    el.showRestart = true;
    expect(el.querySelector('[aria-label="Restart"]')).toBeTruthy();
    el.showRestart = false;
    expect(el.querySelector('[aria-label="Restart"]')).toBeNull();
  });

  it('dispatches native:chat-stop on stop press', () => {
    const el = create({ 'show-stop': '' });
    const handler = vi.fn();
    el.addEventListener('native:chat-stop', handler);
    const stopBtn = el.querySelector('[aria-label="Stop"]')!;
    stopBtn.dispatchEvent(new CustomEvent('native:press', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dispatches native:chat-restart on restart press', () => {
    const el = create({ 'show-restart': '' });
    const handler = vi.fn();
    el.addEventListener('native:chat-restart', handler);
    const restartBtn = el.querySelector('[aria-label="Restart"]')!;
    restartBtn.dispatchEvent(new CustomEvent('native:press', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cleans up on teardown', () => {
    const el = create({ 'show-stop': '', 'show-restart': '' });
    document.body.removeChild(el);
    // No errors after teardown
    expect(el.innerHTML).toBe('');
  });
});
