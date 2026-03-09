// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { VirtualScrollController } from './virtual-scroll-controller.ts';
import { define } from '../../core/define.ts';

class VirtualTestEl extends NativeElement {
  disabled = false;
  #ctrl: VirtualScrollController | null = null;

  setup() {
    super.setup();
    this.#ctrl = new VirtualScrollController(this);
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }

  get virtualItemHeight(): number { return this.#ctrl?.itemHeight ?? 40; }
  set virtualItemHeight(val: number) { if (this.#ctrl) this.#ctrl.itemHeight = val; }

  get virtualOverscan(): number { return this.#ctrl?.overscan ?? 5; }
  set virtualOverscan(val: number) { if (this.#ctrl) this.#ctrl.overscan = val; }

  get virtualStart(): number { return this.#ctrl?.start ?? 0; }
  get virtualEnd(): number { return this.#ctrl?.end ?? 0; }

  enableVirtualization(scrollEl: HTMLElement, container: HTMLElement, totalCount: number): void {
    this.#ctrl!.enable(scrollEl, container, totalCount);
  }

  disableVirtualization(): void {
    this.#ctrl!.disable();
  }

  updateVirtualCount(count: number): void {
    this.#ctrl!.updateCount(count);
  }
}

if (!customElements.get('virtual-test')) {
  define('virtual-test', VirtualTestEl);
}

function create(): VirtualTestEl {
  const el = document.createElement('virtual-test') as VirtualTestEl;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Virtualizable', () => {
  it('has default property values', () => {
    const el = create();
    expect(el.virtualItemHeight).toBe(40);
    expect(el.virtualOverscan).toBe(5);
    expect(el.virtualStart).toBe(0);
    expect(el.virtualEnd).toBe(0);
  });

  it('enableVirtualization creates spacer elements', () => {
    const el = create();
    const scrollEl = document.createElement('div');
    const container = document.createElement('div');
    scrollEl.appendChild(container);
    document.body.appendChild(scrollEl);

    el.enableVirtualization(scrollEl, container, 100);

    const topSpacer = container.querySelector('.n-virtual-spacer-top');
    const bottomSpacer = container.querySelector('.n-virtual-spacer-bottom');
    expect(topSpacer).not.toBeNull();
    expect(bottomSpacer).not.toBeNull();
  });

  it('disableVirtualization removes spacers', () => {
    const el = create();
    const scrollEl = document.createElement('div');
    const container = document.createElement('div');
    scrollEl.appendChild(container);
    document.body.appendChild(scrollEl);

    el.enableVirtualization(scrollEl, container, 100);
    el.disableVirtualization();

    const topSpacer = container.querySelector('.n-virtual-spacer-top');
    const bottomSpacer = container.querySelector('.n-virtual-spacer-bottom');
    expect(topSpacer).toBeNull();
    expect(bottomSpacer).toBeNull();
  });

  it('computes initial range after enableVirtualization', () => {
    const el = create();
    const scrollEl = document.createElement('div');
    const container = document.createElement('div');
    scrollEl.appendChild(container);
    document.body.appendChild(scrollEl);

    el.virtualItemHeight = 40;
    el.virtualOverscan = 5;
    el.enableVirtualization(scrollEl, container, 1000);

    // WHY: With clientHeight 0 in happy-dom, rawEnd = ceil(0) = 0
    // start = max(0, 0 - 5) = 0, end = min(1000, 0 + 5) = 5
    expect(el.virtualStart).toBe(0);
    expect(el.virtualEnd).toBe(5);
  });

  it('updateVirtualCount updates total and recomputes', () => {
    const el = create();
    const scrollEl = document.createElement('div');
    const container = document.createElement('div');
    scrollEl.appendChild(container);
    document.body.appendChild(scrollEl);

    el.enableVirtualization(scrollEl, container, 100);
    const startBefore = el.virtualStart;
    el.updateVirtualCount(5000);
    // Still at top, so range stays the same
    expect(el.virtualStart).toBe(startBefore);
  });

  it('configurable virtualItemHeight', () => {
    const el = create();
    el.virtualItemHeight = 60;
    expect(el.virtualItemHeight).toBe(60);
  });

  it('configurable virtualOverscan', () => {
    const el = create();
    el.virtualOverscan = 10;
    expect(el.virtualOverscan).toBe(10);
  });

  it('teardown calls disableVirtualization', () => {
    const el = create();
    const scrollEl = document.createElement('div');
    const container = document.createElement('div');
    scrollEl.appendChild(container);
    document.body.appendChild(scrollEl);

    el.enableVirtualization(scrollEl, container, 100);
    el.teardown();

    const topSpacer = container.querySelector('.n-virtual-spacer-top');
    expect(topSpacer).toBeNull();
  });
});

// ── VirtualScrollController (standalone) ──

describe('VirtualScrollController', () => {
  function createHost(): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
  }

  it('attaches to a plain element and creates spacers', () => {
    const host = createHost();
    const scrollEl = document.createElement('div');
    const container = document.createElement('div');
    scrollEl.appendChild(container);
    document.body.appendChild(scrollEl);

    const ctrl = new VirtualScrollController(host, { itemHeight: 30, overscan: 3 });
    ctrl.enable(scrollEl, container, 100);

    expect(container.querySelector('.n-virtual-spacer-top')).not.toBeNull();
    expect(container.querySelector('.n-virtual-spacer-bottom')).not.toBeNull();
    ctrl.destroy();
  });

  it('computes start/end range after enable', () => {
    const host = createHost();
    const scrollEl = document.createElement('div');
    const container = document.createElement('div');
    scrollEl.appendChild(container);
    document.body.appendChild(scrollEl);

    const ctrl = new VirtualScrollController(host, { itemHeight: 40, overscan: 5 });
    ctrl.enable(scrollEl, container, 1000);

    // happy-dom clientHeight = 0 → rawEnd = ceil(0) = 0
    // start = max(0, 0 - 5) = 0, end = min(1000, 0 + 5) = 5
    expect(ctrl.start).toBe(0);
    expect(ctrl.end).toBe(5);
    ctrl.destroy();
  });

  it('dispatches native:virtual-change event on enable', () => {
    const host = createHost();
    const scrollEl = document.createElement('div');
    const container = document.createElement('div');
    scrollEl.appendChild(container);
    document.body.appendChild(scrollEl);

    let detail: any = null;
    host.addEventListener('native:virtual-change', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });

    const ctrl = new VirtualScrollController(host, { itemHeight: 40, overscan: 5 });
    ctrl.enable(scrollEl, container, 500);

    expect(detail).not.toBeNull();
    expect(detail.start).toBe(0);
    expect(detail.end).toBe(5);
    expect(detail.totalCount).toBe(500);
    ctrl.destroy();
  });

  it('updateCount updates total and recomputes', () => {
    const host = createHost();
    const scrollEl = document.createElement('div');
    const container = document.createElement('div');
    scrollEl.appendChild(container);
    document.body.appendChild(scrollEl);

    const ctrl = new VirtualScrollController(host, { itemHeight: 40, overscan: 5 });
    ctrl.enable(scrollEl, container, 100);

    const startBefore = ctrl.start;
    ctrl.updateCount(5000);
    expect(ctrl.start).toBe(startBefore);
    ctrl.destroy();
  });

  it('disable removes spacers and cleans up', () => {
    const host = createHost();
    const scrollEl = document.createElement('div');
    const container = document.createElement('div');
    scrollEl.appendChild(container);
    document.body.appendChild(scrollEl);

    const ctrl = new VirtualScrollController(host, { itemHeight: 40 });
    ctrl.enable(scrollEl, container, 100);
    ctrl.disable();

    expect(container.querySelector('.n-virtual-spacer-top')).toBeNull();
    expect(container.querySelector('.n-virtual-spacer-bottom')).toBeNull();
    ctrl.destroy();
  });

  it('uses default options when none provided', () => {
    const host = createHost();
    const ctrl = new VirtualScrollController(host);
    expect(ctrl.itemHeight).toBe(40);
    expect(ctrl.overscan).toBe(5);
    ctrl.destroy();
  });
});
