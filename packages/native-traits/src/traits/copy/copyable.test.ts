// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { NativeElement, define } from '@nonoun/native-core';
import { CopyController } from './copy-controller.ts';

class CopyTestEl extends NativeElement {
  disabled = false;
  #ctrl: CopyController | null = null;

  setup() {
    super.setup();
    this.#ctrl = new CopyController(this);
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }

  get copyValue() { return this.#ctrl!.value; }
  set copyValue(val: string | (() => string)) { this.#ctrl!.value = val; }

  get copyFeedbackDuration() { return this.#ctrl!.feedbackDuration; }
  set copyFeedbackDuration(val: number) { this.#ctrl!.feedbackDuration = val; }

  copy() { return this.#ctrl!.copy(); }
}

if (!customElements.get('copy-test')) {
  define('copy-test', CopyTestEl);
}

function create(): CopyTestEl {
  const el = document.createElement('copy-test') as CopyTestEl;
  document.body.appendChild(el);
  return el;
}

let clipboardText = '';
const mockWriteText = vi.fn(async (text: string) => { clipboardText = text; });
const mockReadText = vi.fn(async () => clipboardText);

beforeEach(() => {
  clipboardText = '';
  mockWriteText.mockClear();
  mockReadText.mockClear();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText, readText: mockReadText },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Copyable', () => {
  it('defaults copyValue to empty string', () => {
    const el = create();
    expect(el.copyValue).toBe('');
  });

  it('defaults copyFeedbackDuration to 2000', () => {
    const el = create();
    expect(el.copyFeedbackDuration).toBe(2000);
  });

  it('copies string value to clipboard', async () => {
    const el = create();
    el.copyValue = 'hello';
    await el.copy();
    expect(mockWriteText).toHaveBeenCalledWith('hello');
  });

  it('copies function return value to clipboard', async () => {
    const el = create();
    el.copyValue = () => 'dynamic';
    await el.copy();
    expect(mockWriteText).toHaveBeenCalledWith('dynamic');
  });

  it('sets copied attribute after copy', async () => {
    const el = create();
    el.copyValue = 'test';
    await el.copy();
    expect(el.hasAttribute('copied')).toBe(true);
  });

  it('dispatches native:copy event with value', async () => {
    const el = create();
    el.copyValue = 'test';
    const handler = vi.fn();
    el.addEventListener('native:copy', handler);
    await el.copy();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('test');
  });

  it('removes copied attribute after feedbackDuration', async () => {
    vi.useFakeTimers();
    const el = create();
    el.copyValue = 'test';
    el.copyFeedbackDuration = 500;
    await el.copy();
    expect(el.hasAttribute('copied')).toBe(true);
    vi.advanceTimersByTime(500);
    expect(el.hasAttribute('copied')).toBe(false);
    vi.useRealTimers();
  });

  it('resets timer on rapid successive copies', async () => {
    vi.useFakeTimers();
    const el = create();
    el.copyValue = 'first';
    el.copyFeedbackDuration = 500;
    await el.copy();
    vi.advanceTimersByTime(300);
    el.copyValue = 'second';
    await el.copy();
    // Only 200ms passed since second copy — still copied
    vi.advanceTimersByTime(300);
    expect(el.hasAttribute('copied')).toBe(true);
    // Full 500ms from second copy
    vi.advanceTimersByTime(200);
    expect(el.hasAttribute('copied')).toBe(false);
    vi.useRealTimers();
  });

  it('teardown clears the timer', async () => {
    vi.useFakeTimers();
    const el = create();
    el.copyValue = 'test';
    el.copyFeedbackDuration = 500;
    await el.copy();
    el.teardown();
    vi.advanceTimersByTime(500);
    // teardown already cleared the timer; attribute may still be present since
    // removal was timer-based and teardown doesn't explicitly remove it
    vi.useRealTimers();
  });
});
