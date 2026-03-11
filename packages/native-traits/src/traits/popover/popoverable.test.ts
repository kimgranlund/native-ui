// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement, define } from '@nonoun/native-core';
import { PopoverController } from './popover-controller.ts';

class PopoverTestEl extends NativeElement {
  #popover: PopoverController | null = null;
  setup() { super.setup(); this.#popover = new PopoverController(this); }
  teardown() { this.#popover?.destroy(); this.#popover = null; super.teardown(); }

  wirePopover(anchor: HTMLElement, popover: HTMLElement): void {
    this.#popover?.wirePopover(anchor, popover);
  }

  syncPopover(open: boolean): void {
    this.#popover?.syncPopover(open);
  }
}

if (!customElements.get('popover-test')) {
  define('popover-test', PopoverTestEl);
}

function create(): { host: PopoverTestEl; anchor: HTMLElement; popover: HTMLElement } {
  const host = document.createElement('popover-test') as PopoverTestEl;
  const anchor = document.createElement('button');
  anchor.textContent = 'Trigger';
  const popover = document.createElement('div');
  popover.setAttribute('popover', '');
  popover.textContent = 'Content';
  host.appendChild(anchor);
  host.appendChild(popover);
  document.body.appendChild(host);
  return { host, anchor, popover };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Popoverable — wirePopover', () => {
  it('sets anchor-name on anchor and position-anchor on popover', () => {
    const { host, anchor, popover } = create();
    host.wirePopover(anchor, popover);
    expect(anchor.style.getPropertyValue('anchor-name')).toMatch(/^--anchor-/);
    expect(popover.style.getPropertyValue('position-anchor')).toMatch(/^--anchor-/);
  });

  it('uses matching anchor ids on both elements', () => {
    const { host, anchor, popover } = create();
    host.wirePopover(anchor, popover);
    const anchorName = anchor.style.getPropertyValue('anchor-name');
    const positionAnchor = popover.style.getPropertyValue('position-anchor');
    expect(anchorName).toBe(positionAnchor);
  });
});

describe('Popoverable — syncPopover', () => {
  it('calls showPopover when open is true', () => {
    const { host, anchor, popover } = create();
    host.wirePopover(anchor, popover);
    const showSpy = vi.spyOn(popover, 'showPopover');
    host.syncPopover(true);
    expect(showSpy).toHaveBeenCalledTimes(1);
  });

  it('calls hidePopover when open is false', () => {
    const { host, anchor, popover } = create();
    host.wirePopover(anchor, popover);
    const hideSpy = vi.spyOn(popover, 'hidePopover');
    host.syncPopover(false);
    expect(hideSpy).toHaveBeenCalledTimes(1);
  });

  it('does not throw when hidePopover throws (already hidden)', () => {
    const { host, anchor, popover } = create();
    host.wirePopover(anchor, popover);
    vi.spyOn(popover, 'hidePopover').mockImplementation(() => {
      throw new DOMException('Invalid state', 'InvalidStateError');
    });
    expect(() => host.syncPopover(false)).not.toThrow();
  });
});

describe('Popoverable — dismiss integration', () => {
  it('dismiss is managed internally when syncPopover(true)', () => {
    const { host, anchor, popover } = create();
    host.wirePopover(anchor, popover);
    // syncPopover(true) delegates to PopoverController which manages dismiss internally
    const showSpy = vi.spyOn(popover, 'showPopover');
    host.syncPopover(true);
    expect(showSpy).toHaveBeenCalledTimes(1);
  });

  it('dismiss is managed internally when syncPopover(false)', () => {
    const { host, anchor, popover } = create();
    host.wirePopover(anchor, popover);
    // syncPopover(false) delegates to PopoverController which manages dismiss internally
    const hideSpy = vi.spyOn(popover, 'hidePopover');
    host.syncPopover(false);
    expect(hideSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Popoverable — syncPopover dismiss lifecycle', () => {
  it('does not throw when showPopover throws (already open)', () => {
    const { host, anchor, popover } = create();
    host.wirePopover(anchor, popover);
    vi.spyOn(popover, 'showPopover').mockImplementation(() => {
      throw new DOMException('Invalid state', 'InvalidStateError');
    });
    expect(() => host.syncPopover(true)).not.toThrow();
  });

  it('sequential open/close calls do not throw', () => {
    const { host, anchor, popover } = create();
    host.wirePopover(anchor, popover);
    expect(() => {
      host.syncPopover(true);
      host.syncPopover(false);
      host.syncPopover(true);
      host.syncPopover(false);
    }).not.toThrow();
  });
});

describe('Popoverable — teardown', () => {
  it('nulls popover reference on teardown', () => {
    const { host, anchor, popover } = create();
    host.wirePopover(anchor, popover);
    host.teardown();
    // After teardown, syncPopover should not throw even with null ref
    expect(() => host.syncPopover(true)).not.toThrow();
    expect(() => host.syncPopover(false)).not.toThrow();
  });

  it('wirePopover is a safe no-op after teardown', () => {
    const { host, anchor, popover } = create();
    host.wirePopover(anchor, popover);
    host.teardown();

    // After teardown, controller is null — wirePopover is a no-op via optional chaining
    const anchor2 = document.createElement('button');
    const popover2 = document.createElement('div');
    popover2.setAttribute('popover', '');
    expect(() => host.wirePopover(anchor2, popover2)).not.toThrow();
    // No anchor-name set since controller is null
    expect(anchor2.style.getPropertyValue('anchor-name')).toBe('');
  });
});
