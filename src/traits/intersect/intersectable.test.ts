// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { IntersectController } from './intersect-controller.ts';
import { define } from '../../core/define.ts';

// Mock IntersectionObserver since happy-dom doesn't provide it
let observerCallback: IntersectionObserverCallback;
let observerOptions: IntersectionObserverInit;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    observerCallback = callback;
    observerOptions = options ?? {};
  }
  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = vi.fn();
}

class IntersectTestEl extends NativeElement {
  disabled = false;
  #ctrl: IntersectController | null = null;

  _pendingThreshold = 0;
  _pendingMargin = '0px';
  _pendingOnce = false;
  _pendingDisabled = false;

  get intersectThreshold(): number { return this.#ctrl?.threshold ?? this._pendingThreshold; }
  set intersectThreshold(v: number) { if (this.#ctrl) this.#ctrl.threshold = v; else this._pendingThreshold = v; }

  get intersectMargin(): string { return this.#ctrl?.margin ?? this._pendingMargin; }
  set intersectMargin(v: string) { if (this.#ctrl) this.#ctrl.margin = v; else this._pendingMargin = v; }

  get intersectOnce(): boolean { return this.#ctrl?.once ?? this._pendingOnce; }
  set intersectOnce(v: boolean) { if (this.#ctrl) this.#ctrl.once = v; else this._pendingOnce = v; }

  get intersectDisabled(): boolean { return this.#ctrl?.disabled ?? this._pendingDisabled; }
  set intersectDisabled(v: boolean) { if (this.#ctrl) this.#ctrl.disabled = v; else this._pendingDisabled = v; }

  setup() {
    super.setup();
    this.#ctrl = new IntersectController(this, {
      threshold: this._pendingThreshold,
      margin: this._pendingMargin,
      once: this._pendingOnce,
      disabled: this._pendingDisabled,
    });
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }
}

if (!customElements.get('intersect-test')) {
  define('intersect-test', IntersectTestEl);
}

function create(): IntersectTestEl {
  const el = document.createElement('intersect-test') as IntersectTestEl;
  document.body.appendChild(el);
  return el;
}

function triggerIntersect(isIntersecting: boolean, ratio = 1): void {
  observerCallback(
    [{ isIntersecting, intersectionRatio: ratio } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );
}

beforeEach(() => {
  mockObserve.mockClear();
  mockDisconnect.mockClear();
  (globalThis as any).IntersectionObserver = MockIntersectionObserver;
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Intersectable', () => {
  it('creates an IntersectionObserver on setup', () => {
    create();
    expect(mockObserve).toHaveBeenCalledTimes(1);
  });

  it('passes threshold, rootMargin, and root to observer', () => {
    const el = document.createElement('intersect-test') as IntersectTestEl;
    el.intersectThreshold = 0.5;
    el.intersectMargin = '10px';
    document.body.appendChild(el);
    expect(observerOptions.threshold).toBe(0.5);
    expect(observerOptions.rootMargin).toBe('10px');
  });

  it('sets intersecting attribute when element enters viewport', () => {
    const el = create();
    triggerIntersect(true);
    expect(el.hasAttribute('intersecting')).toBe(true);
  });

  it('removes intersecting attribute when element leaves viewport', () => {
    const el = create();
    triggerIntersect(true);
    triggerIntersect(false);
    expect(el.hasAttribute('intersecting')).toBe(false);
  });

  it('dispatches native:intersect event with details', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:intersect', handler);
    triggerIntersect(true, 0.75);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.isIntersecting).toBe(true);
    expect(handler.mock.calls[0][0].detail.ratio).toBe(0.75);
  });

  it('disconnects observer after first intersection when intersectOnce is true', () => {
    const el = document.createElement('intersect-test') as IntersectTestEl;
    el.intersectOnce = true;
    document.body.appendChild(el);
    mockDisconnect.mockClear();
    triggerIntersect(true);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('does not disconnect on non-intersecting entry when intersectOnce is true', () => {
    const el = document.createElement('intersect-test') as IntersectTestEl;
    el.intersectOnce = true;
    document.body.appendChild(el);
    mockDisconnect.mockClear();
    triggerIntersect(false);
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('does not create observer when intersectDisabled is true', () => {
    mockObserve.mockClear();
    const el = document.createElement('intersect-test') as IntersectTestEl;
    el.intersectDisabled = true;
    document.body.appendChild(el);
    expect(mockObserve).not.toHaveBeenCalled();
  });
});

describe('Intersectable — teardown', () => {
  it('disconnects observer and removes intersecting attribute', () => {
    const el = create();
    triggerIntersect(true);
    expect(el.hasAttribute('intersecting')).toBe(true);
    mockDisconnect.mockClear();
    el.teardown();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(el.hasAttribute('intersecting')).toBe(false);
  });
});
