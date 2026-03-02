// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Kernel } from '../kernel.ts';
import {
  COMPONENT_MANIFEST,
  getDescriptor,
  getDescriptorsByCategory,
  registerAll,
  installEventBridge,
} from '../components.ts';
import type { ComponentDescriptor } from '../components.ts';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ── Mock Kernel ──

function createMockKernel() {
  return {
    registerAndDefine: vi.fn(),
    bus: {
      dispatch: vi.fn(),
    },
  } as unknown as Kernel;
}

// ── COMPONENT_MANIFEST ──

describe('COMPONENT_MANIFEST', () => {
  it('is frozen at the top level', () => {
    expect(Object.isFrozen(COMPONENT_MANIFEST)).toBe(true);
  });

  it('has each entry frozen', () => {
    for (const d of COMPONENT_MANIFEST) {
      expect(Object.isFrozen(d)).toBe(true);
    }
  });

  it('has the expected number of entries', () => {
    // 12 form + 6 display + 9 navigation + 5 overlay + 6 command +
    // 6 table + 3 container + 3 other = 50
    expect(COMPONENT_MANIFEST.length).toBe(50);
  });

  it('every descriptor has all required fields', () => {
    for (const d of COMPONENT_MANIFEST) {
      expect(typeof d.tag).toBe('string');
      expect(d.tag.length).toBeGreaterThan(0);
      expect(typeof d.module).toBe('string');
      expect(d.module.length).toBeGreaterThan(0);
      expect(typeof d.formAssociated).toBe('boolean');
      expect(Array.isArray(d.events)).toBe(true);
      expect(['form', 'display', 'navigation', 'overlay', 'container', 'layout']).toContain(
        d.category,
      );
    }
  });

  it('has no duplicate tags', () => {
    const tags = COMPONENT_MANIFEST.map((d) => d.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('all tags start with "n-"', () => {
    for (const d of COMPONENT_MANIFEST) {
      expect(d.tag.startsWith('n-')).toBe(true);
    }
  });

  it('events arrays are readonly at the type level', () => {
    // The events property is typed as `readonly string[]` (compile-time guarantee).
    // Object.freeze on the descriptor does not deep-freeze nested arrays,
    // but the descriptor itself is frozen so `d.events` cannot be reassigned.
    for (const d of COMPONENT_MANIFEST) {
      expect(Array.isArray(d.events)).toBe(true);
      // Descriptor is frozen — property cannot be reassigned
      expect(() => {
        (d as unknown as Record<string, unknown>).events = [];
      }).toThrow();
    }
  });

  it('form-associated components are only in the form category', () => {
    for (const d of COMPONENT_MANIFEST) {
      if (d.formAssociated) {
        expect(d.category).toBe('form');
      }
    }
  });
});

// ── getDescriptor ──

describe('getDescriptor', () => {
  it('returns descriptor for known tag', () => {
    const d = getDescriptor('n-button');
    expect(d).toBeDefined();
    expect(d!.tag).toBe('n-button');
    expect(d!.module).toBe('components/button');
    expect(d!.formAssociated).toBe(true);
    expect(d!.events).toContain('native:press');
    expect(d!.category).toBe('form');
  });

  it('returns descriptor for n-input', () => {
    const d = getDescriptor('n-input');
    expect(d).toBeDefined();
    expect(d!.formAssociated).toBe(true);
    expect(d!.events).toEqual(['native:input', 'native:change']);
  });

  it('returns descriptor for display component', () => {
    const d = getDescriptor('n-listbox');
    expect(d).toBeDefined();
    expect(d!.category).toBe('display');
    expect(d!.formAssociated).toBe(false);
  });

  it('returns descriptor for overlay component', () => {
    const d = getDescriptor('n-dialog');
    expect(d).toBeDefined();
    expect(d!.category).toBe('overlay');
    expect(d!.events).toEqual(['close', 'native:dismiss']);
  });

  it('returns descriptor for container component', () => {
    const d = getDescriptor('n-card');
    expect(d).toBeDefined();
    expect(d!.category).toBe('container');
  });

  it('returns undefined for unknown tag', () => {
    expect(getDescriptor('n-nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getDescriptor('')).toBeUndefined();
  });
});

// ── getDescriptorsByCategory ──

describe('getDescriptorsByCategory', () => {
  it('returns form components', () => {
    const form = getDescriptorsByCategory('form');
    expect(form.length).toBeGreaterThan(0);
    for (const d of form) {
      expect(d.category).toBe('form');
    }
  });

  it('returns display components', () => {
    const display = getDescriptorsByCategory('display');
    expect(display.length).toBeGreaterThan(0);
    for (const d of display) {
      expect(d.category).toBe('display');
    }
  });

  it('returns navigation components', () => {
    const nav = getDescriptorsByCategory('navigation');
    expect(nav.length).toBeGreaterThan(0);
    for (const d of nav) {
      expect(d.category).toBe('navigation');
    }
  });

  it('returns overlay components', () => {
    const overlay = getDescriptorsByCategory('overlay');
    expect(overlay.length).toBeGreaterThan(0);
    for (const d of overlay) {
      expect(d.category).toBe('overlay');
    }
  });

  it('returns container components', () => {
    const containers = getDescriptorsByCategory('container');
    expect(containers.length).toBeGreaterThan(0);
    for (const d of containers) {
      expect(d.category).toBe('container');
    }
  });

  it('returns empty array for unused category', () => {
    const layout = getDescriptorsByCategory('layout');
    expect(layout).toEqual([]);
  });

  it('all categories sum to total manifest length', () => {
    const categories: ComponentDescriptor['category'][] = [
      'form',
      'display',
      'navigation',
      'overlay',
      'container',
      'layout',
    ];
    let total = 0;
    for (const cat of categories) {
      total += getDescriptorsByCategory(cat).length;
    }
    expect(total).toBe(COMPONENT_MANIFEST.length);
  });

  it('includes specific known components in form category', () => {
    const form = getDescriptorsByCategory('form');
    const tags = form.map((d) => d.tag);
    expect(tags).toContain('n-button');
    expect(tags).toContain('n-input');
    expect(tags).toContain('n-select');
    expect(tags).toContain('n-combobox');
  });
});

// ── registerAll ──

describe('registerAll', () => {
  let mockKernel: Kernel;

  beforeEach(() => {
    mockKernel = createMockKernel();
  });

  it('registers all matching entries from the classes map', () => {
    const classes = new Map<string, CustomElementConstructor>([
      ['n-button', HTMLElement as unknown as CustomElementConstructor],
      ['n-input', HTMLElement as unknown as CustomElementConstructor],
    ]);

    const count = registerAll(mockKernel, classes);

    expect(count).toBe(2);
    expect(mockKernel.registerAndDefine).toHaveBeenCalledTimes(2);
  });

  it('passes formAssociated from descriptor', () => {
    const classes = new Map<string, CustomElementConstructor>([
      ['n-button', HTMLElement as unknown as CustomElementConstructor],
    ]);

    registerAll(mockKernel, classes);

    expect(mockKernel.registerAndDefine).toHaveBeenCalledWith(
      'n-button',
      HTMLElement,
      { formAssociated: true },
    );
  });

  it('passes formAssociated false for non-form components', () => {
    const classes = new Map<string, CustomElementConstructor>([
      ['n-listbox', HTMLElement as unknown as CustomElementConstructor],
    ]);

    registerAll(mockKernel, classes);

    expect(mockKernel.registerAndDefine).toHaveBeenCalledWith(
      'n-listbox',
      HTMLElement,
      { formAssociated: false },
    );
  });

  it('skips tags not in manifest', () => {
    const classes = new Map<string, CustomElementConstructor>([
      ['n-button', HTMLElement as unknown as CustomElementConstructor],
      ['n-unknown', HTMLElement as unknown as CustomElementConstructor],
    ]);

    const count = registerAll(mockKernel, classes);

    expect(count).toBe(1);
    expect(mockKernel.registerAndDefine).toHaveBeenCalledTimes(1);
    expect(mockKernel.registerAndDefine).toHaveBeenCalledWith(
      'n-button',
      expect.anything(),
      expect.anything(),
    );
  });

  it('respects exclude option', () => {
    const classes = new Map<string, CustomElementConstructor>([
      ['n-button', HTMLElement as unknown as CustomElementConstructor],
      ['n-input', HTMLElement as unknown as CustomElementConstructor],
      ['n-select', HTMLElement as unknown as CustomElementConstructor],
    ]);

    const count = registerAll(mockKernel, classes, {
      exclude: ['n-button', 'n-select'],
    });

    expect(count).toBe(1);
    expect(mockKernel.registerAndDefine).toHaveBeenCalledTimes(1);
    expect(mockKernel.registerAndDefine).toHaveBeenCalledWith(
      'n-input',
      expect.anything(),
      expect.anything(),
    );
  });

  it('returns 0 for empty classes map', () => {
    const classes = new Map<string, CustomElementConstructor>();
    const count = registerAll(mockKernel, classes);
    expect(count).toBe(0);
    expect(mockKernel.registerAndDefine).not.toHaveBeenCalled();
  });

  it('returns 0 when all entries are excluded', () => {
    const classes = new Map<string, CustomElementConstructor>([
      ['n-button', HTMLElement as unknown as CustomElementConstructor],
    ]);

    const count = registerAll(mockKernel, classes, { exclude: ['n-button'] });
    expect(count).toBe(0);
    expect(mockKernel.registerAndDefine).not.toHaveBeenCalled();
  });

  it('returns 0 when no classes match manifest', () => {
    const classes = new Map<string, CustomElementConstructor>([
      ['n-fake-one', HTMLElement as unknown as CustomElementConstructor],
      ['n-fake-two', HTMLElement as unknown as CustomElementConstructor],
    ]);

    const count = registerAll(mockKernel, classes);
    expect(count).toBe(0);
  });

  it('works without options parameter', () => {
    const classes = new Map<string, CustomElementConstructor>([
      ['n-button', HTMLElement as unknown as CustomElementConstructor],
    ]);

    const count = registerAll(mockKernel, classes);
    expect(count).toBe(1);
  });
});

// ── installEventBridge ──

describe('installEventBridge', () => {
  let mockKernel: Kernel;

  beforeEach(() => {
    mockKernel = createMockKernel();
  });

  it('attaches listeners for all bridge events', () => {
    const root = document.createElement('div');
    const addSpy = vi.spyOn(root, 'addEventListener');
    installEventBridge(mockKernel, root);

    const bridgeEvents = [
      'native:press',
      'native:change',
      'native:select',
      'native:input',
      'native:dismiss',
      'native:expand',
      'native:collapse',
      'native:sort',
      'native:row-select',
    ];

    expect(addSpy).toHaveBeenCalledTimes(bridgeEvents.length);
    for (const eventName of bridgeEvents) {
      expect(addSpy).toHaveBeenCalledWith(eventName, expect.any(Function), expect.any(Object));
    }
  });

  it('dispatches command to bus when event fires', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const button = document.createElement('button');
    root.appendChild(button);

    installEventBridge(mockKernel, root);

    const event = new CustomEvent('native:press', {
      bubbles: true,
      detail: { action: 'click' },
    });
    button.dispatchEvent(event);

    expect(mockKernel.bus.dispatch).toHaveBeenCalledOnce();
    expect(mockKernel.bus.dispatch).toHaveBeenCalledWith(
      'button.press',
      {
        target: 'button',
        event: 'native:press',
        detail: { action: 'click' },
      },
      undefined,
    );

    root.remove();
  });

  it('strips "native:" prefix from event name in command type', () => {
    const root = document.createElement('div');
    const el = document.createElement('div');
    root.appendChild(el);

    installEventBridge(mockKernel, root);

    el.dispatchEvent(new CustomEvent('native:change', { bubbles: true, detail: null }));

    expect(mockKernel.bus.dispatch).toHaveBeenCalledWith(
      'div.change',
      expect.objectContaining({ event: 'native:change' }),
      undefined,
    );
  });

  it('uses lowercase tagName in command type', () => {
    const root = document.createElement('div');
    // Custom elements have uppercase tagName in DOM
    const el = document.createElement('n-button');
    root.appendChild(el);

    installEventBridge(mockKernel, root);

    el.dispatchEvent(new CustomEvent('native:press', { bubbles: true, detail: null }));

    expect(mockKernel.bus.dispatch).toHaveBeenCalledWith(
      'n-button.press',
      expect.objectContaining({ target: 'n-button' }),
      undefined,
    );
  });

  it('extracts plan-id from ancestor with data-plan-id', () => {
    const root = document.createElement('div');
    const planContainer = document.createElement('div');
    planContainer.setAttribute('data-plan-id', 'plan-42');
    root.appendChild(planContainer);

    const el = document.createElement('button');
    planContainer.appendChild(el);
    document.body.appendChild(root);

    installEventBridge(mockKernel, root);

    el.dispatchEvent(new CustomEvent('native:press', { bubbles: true, detail: {} }));

    expect(mockKernel.bus.dispatch).toHaveBeenCalledWith(
      'button.press',
      expect.any(Object),
      { planId: 'plan-42' },
    );

    root.remove();
  });

  it('passes undefined meta when no data-plan-id ancestor', () => {
    const root = document.createElement('div');
    const el = document.createElement('button');
    root.appendChild(el);
    document.body.appendChild(root);

    installEventBridge(mockKernel, root);

    el.dispatchEvent(new CustomEvent('native:press', { bubbles: true, detail: {} }));

    expect(mockKernel.bus.dispatch).toHaveBeenCalledWith(
      'button.press',
      expect.any(Object),
      undefined,
    );

    root.remove();
  });

  it('extracts plan-id from the element itself', () => {
    const root = document.createElement('div');
    const el = document.createElement('button');
    el.setAttribute('data-plan-id', 'plan-self');
    root.appendChild(el);
    document.body.appendChild(root);

    installEventBridge(mockKernel, root);

    el.dispatchEvent(new CustomEvent('native:press', { bubbles: true, detail: {} }));

    expect(mockKernel.bus.dispatch).toHaveBeenCalledWith(
      'button.press',
      expect.any(Object),
      { planId: 'plan-self' },
    );

    root.remove();
  });

  it('dispose removes all listeners', () => {
    const root = document.createElement('div');
    const el = document.createElement('button');
    root.appendChild(el);

    const dispose = installEventBridge(mockKernel, root);
    dispose();

    el.dispatchEvent(new CustomEvent('native:press', { bubbles: true, detail: {} }));
    expect(mockKernel.bus.dispatch).not.toHaveBeenCalled();
  });

  it('defaults to document.body when no root provided', () => {
    const bodySpy = vi.spyOn(document.body, 'addEventListener');
    const dispose = installEventBridge(mockKernel);

    expect(bodySpy).toHaveBeenCalled();

    dispose();
    bodySpy.mockRestore();
  });

  it('handles multiple events independently', () => {
    const root = document.createElement('div');
    const el = document.createElement('input');
    root.appendChild(el);

    installEventBridge(mockKernel, root);

    el.dispatchEvent(new CustomEvent('native:input', { bubbles: true, detail: { value: 'a' } }));
    el.dispatchEvent(new CustomEvent('native:change', { bubbles: true, detail: { value: 'b' } }));

    expect(mockKernel.bus.dispatch).toHaveBeenCalledTimes(2);

    expect(mockKernel.bus.dispatch).toHaveBeenCalledWith(
      'input.input',
      expect.objectContaining({ event: 'native:input', detail: { value: 'a' } }),
      undefined,
    );
    expect(mockKernel.bus.dispatch).toHaveBeenCalledWith(
      'input.change',
      expect.objectContaining({ event: 'native:change', detail: { value: 'b' } }),
      undefined,
    );
  });

  it('passes null detail when event has no detail', () => {
    const root = document.createElement('div');
    const el = document.createElement('button');
    root.appendChild(el);

    installEventBridge(mockKernel, root);

    // CustomEvent without detail defaults to null
    el.dispatchEvent(new CustomEvent('native:press', { bubbles: true }));

    expect(mockKernel.bus.dispatch).toHaveBeenCalledWith(
      'button.press',
      expect.objectContaining({ detail: null }),
      undefined,
    );
  });
});
