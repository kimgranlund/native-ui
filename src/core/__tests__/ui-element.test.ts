// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement } from '../native-element.ts';
import { signal } from '../../reactivity/signal.ts';
import { define } from '../define.ts';

// Register a test element
class TestElement extends NativeElement {
  setupCount = 0;
  teardownCount = 0;
  effects: (() => void)[] = [];

  setup(): void {
    super.setup();
    this.setupCount++;
    for (const fn of this.effects) this.addEffect(fn);
  }

  teardown(): void {
    this.teardownCount++;
    super.teardown();
  }
}
define('test-n-element', TestElement);

class TestDeferElement extends NativeElement {
  deferCalled = false;

  setup(): void {
    super.setup();
    this.deferChildren(() => {
      this.deferCalled = true;
    });
  }
}
define('test-defer-element', TestDeferElement);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('NativeElement — lifecycle', () => {
  it('calls setup() on connectedCallback', () => {
    const el = document.createElement('test-n-element') as TestElement;
    document.body.appendChild(el);
    expect(el.setupCount).toBe(1);
  });

  it('calls teardown() on disconnectedCallback', () => {
    const el = document.createElement('test-n-element') as TestElement;
    document.body.appendChild(el);
    el.remove();
    expect(el.teardownCount).toBe(1);
  });

  it('guards against double setup on reconnect without disconnect', () => {
    const el = document.createElement('test-n-element') as TestElement;
    document.body.appendChild(el);
    // Simulate second connectedCallback without disconnectedCallback
    el.connectedCallback();
    expect(el.setupCount).toBe(1);
  });

  it('allows setup after disconnect + reconnect', () => {
    const el = document.createElement('test-n-element') as TestElement;
    document.body.appendChild(el);
    el.remove();
    document.body.appendChild(el);
    expect(el.setupCount).toBe(2);
    expect(el.teardownCount).toBe(1);
  });
});

describe('NativeElement — addEffect', () => {
  it('runs effect on connect', () => {
    const s = signal(0);
    let effectValue = -1;
    const el = document.createElement('test-n-element') as TestElement;
    el.effects = [() => { effectValue = s.value; }];
    document.body.appendChild(el);
    expect(effectValue).toBe(0);
  });

  it('effect reacts to signal changes', () => {
    const s = signal(0);
    let effectValue = -1;
    const el = document.createElement('test-n-element') as TestElement;
    el.effects = [() => { effectValue = s.value; }];
    document.body.appendChild(el);
    s.value = 42;
    expect(effectValue).toBe(42);
  });

  it('disposes effects on disconnect', () => {
    const s = signal(0);
    let effectValue = -1;
    const el = document.createElement('test-n-element') as TestElement;
    el.effects = [() => { effectValue = s.value; }];
    document.body.appendChild(el);
    el.remove();
    s.value = 99;
    expect(effectValue).toBe(0); // Not updated after disconnect
  });
});

describe('NativeElement — deferChildren', () => {
  it('runs immediately when children exist', () => {
    const el = document.createElement('test-defer-element') as TestDeferElement;
    el.innerHTML = '<span>child</span>';
    document.body.appendChild(el);
    expect(el.deferCalled).toBe(true);
  });

  it('defers and retries when no children', async () => {
    const el = document.createElement('test-defer-element') as TestDeferElement;
    document.body.appendChild(el);
    expect(el.deferCalled).toBe(false);
    // WHY: deferChildren now retries (microtask → RAF → RAF) when no children.
    // Await the ready promise which resolves after all defers settle.
    await el.ready;
    expect(el.deferCalled).toBe(true);
  });

  it('does not run deferred fn if disconnected before retries complete', async () => {
    const el = document.createElement('test-defer-element') as TestDeferElement;
    document.body.appendChild(el);
    el.remove();
    // Wait enough for the retry chain to have run
    await new Promise(resolve => queueMicrotask(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(el.deferCalled).toBe(false);
  });
});

describe('NativeElement — renewable ready', () => {
  it('resolves ready on connect', async () => {
    const el = document.createElement('test-n-element') as TestElement;
    document.body.appendChild(el);
    await el.ready;
    expect(el.setupCount).toBe(1);
  });

  it('renews ready promise on disconnect + reconnect', async () => {
    const el = document.createElement('test-n-element') as TestElement;
    document.body.appendChild(el);
    const firstReady = el.ready;
    await firstReady;
    el.remove();
    document.body.appendChild(el);
    const secondReady = el.ready;
    expect(secondReady).not.toBe(firstReady);
    await secondReady;
    expect(el.setupCount).toBe(2);
  });

  it('old ready stays resolved after reconnect', async () => {
    const el = document.createElement('test-n-element') as TestElement;
    document.body.appendChild(el);
    const firstReady = el.ready;
    await firstReady;
    el.remove();
    document.body.appendChild(el);
    // Old promise should still be resolved
    await firstReady;
  });
});

describe('NativeElement — attributeChangedCallback', () => {
  it('exists as no-op by default', () => {
    const el = document.createElement('test-n-element') as TestElement;
    expect(() => el.attributeChangedCallback('foo', null, 'bar')).not.toThrow();
  });
});

describe('NativeElement — getTraitController', () => {
  it('returns null when no trait is active', () => {
    const el = document.createElement('test-n-element') as TestElement;
    document.body.appendChild(el);
    expect(el.getTraitController('pressable')).toBeNull();
  });
});
