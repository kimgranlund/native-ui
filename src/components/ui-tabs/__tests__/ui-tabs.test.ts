// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-tabs.ts';

function createTabs(values: string[], selected?: string): HTMLElement {
  const tabs = document.createElement('ui-tabs');
  if (selected) tabs.setAttribute('value', selected);

  for (const v of values) {
    const tab = document.createElement('ui-tab');
    tab.setAttribute('value', v);
    tab.textContent = v;
    tabs.appendChild(tab);
  }

  const panelsContainer = document.createElement('ui-tab-panels');
  for (const v of values) {
    const panel = document.createElement('ui-tab-panel');
    panel.setAttribute('value', v);
    panel.textContent = `Content for ${v}`;
    panelsContainer.appendChild(panel);
  }
  tabs.appendChild(panelsContainer);

  document.body.appendChild(tabs);
  return tabs;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-tabs', () => {
  it('registers all elements', () => {
    expect(customElements.get('ui-tabs')).toBeDefined();
    expect(customElements.get('ui-tab')).toBeDefined();
    expect(customElements.get('ui-tab-panel')).toBeDefined();
    expect(customElements.get('ui-tab-panels')).toBeDefined();
  });

  it('initializes with value from attribute', () => {
    const tabs = createTabs(['one', 'two'], 'one');
    expect((tabs as any).value).toBe('one');
  });

  it('shows only the active panel', async () => {
    const tabs = createTabs(['one', 'two'], 'one');
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const panels = tabs.querySelectorAll('ui-tab-panel');
    expect(panels[0].hasAttribute('hidden')).toBe(false);
    expect(panels[1].hasAttribute('hidden')).toBe(true);
  });

  it('sets aria-selected on active tab', async () => {
    const tabs = createTabs(['one', 'two'], 'one');
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const tabEls = tabs.querySelectorAll('ui-tab');
    expect(tabEls[0].getAttribute('aria-selected')).toBe('true');
    expect(tabEls[1].getAttribute('aria-selected')).toBe('false');
  });

  it('switches tab on ui-select event', async () => {
    const tabs = createTabs(['one', 'two'], 'one');
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const handler = vi.fn();
    tabs.addEventListener('ui-change', handler);

    const tabTwo = tabs.querySelector('ui-tab[value="two"]')!;
    tabTwo.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true, composed: true,
      detail: { value: 'two', label: 'two' },
    }));

    expect((tabs as any).value).toBe('two');
    expect(handler).toHaveBeenCalledTimes(1);

    // Panel visibility should update
    const panels = tabs.querySelectorAll('ui-tab-panel');
    expect(panels[0].hasAttribute('hidden')).toBe(true);
    expect(panels[1].hasAttribute('hidden')).toBe(false);

    // ARIA: aria-selected updates after tab switch
    const tabOne = tabs.querySelector('ui-tab[value="one"]')!;
    expect(tabOne.getAttribute('aria-selected')).toBe('false');
    expect(tabTwo.getAttribute('aria-selected')).toBe('true');
  });

  it('wires aria-controls and aria-labelledby', async () => {
    const tabs = createTabs(['one', 'two'], 'one');
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const tab = tabs.querySelector('ui-tab[value="one"]')!;
    const panel = tabs.querySelector('ui-tab-panel[value="one"]')!;

    // Tab should have aria-controls pointing to panel's id
    const controlsId = tab.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    expect(panel.id).toBe(controlsId);

    // Panel should have aria-labelledby pointing to tab's id
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
  });

  it('does not switch when disabled', async () => {
    const tabs = createTabs(['one', 'two'], 'one');
    tabs.setAttribute('disabled', '');
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const handler = vi.fn();
    tabs.addEventListener('ui-change', handler);

    const tabTwo = tabs.querySelector('ui-tab[value="two"]')!;
    tabTwo.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true, composed: true,
      detail: { value: 'two', label: 'two' },
    }));

    expect((tabs as any).value).toBe('one');
    expect(handler).not.toHaveBeenCalled();
  });

  it('value property setter updates the active tab', async () => {
    const tabs = createTabs(['one', 'two', 'three'], 'one') as any;
    await new Promise<void>(resolve => queueMicrotask(resolve));

    tabs.value = 'three';
    expect(tabs.getAttribute('value')).toBe('three');
  });

  it('value property setter accepts null to deselect', () => {
    const tabs = createTabs(['one', 'two'], 'one') as any;
    tabs.value = null;
    expect(tabs.hasAttribute('value')).toBe(false);
  });

  it('disabled property reflects to attribute', () => {
    const tabs = createTabs(['one'], 'one') as any;
    expect(tabs.disabled).toBe(false);
    tabs.disabled = true;
    expect(tabs.hasAttribute('disabled')).toBe(true);
    // ARIA: disabled tabs set aria-disabled
    expect(tabs.getAttribute('aria-disabled')).toBe('true');
    tabs.disabled = false;
    expect(tabs.hasAttribute('disabled')).toBe(false);
    expect(tabs.hasAttribute('aria-disabled')).toBe(false);
  });

  it('sets tabindex on panels based on active state', async () => {
    const tabs = createTabs(['one', 'two'], 'one');
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const panels = tabs.querySelectorAll('ui-tab-panel');
    expect(panels[0].getAttribute('tabindex')).toBe('0');
    expect(panels[1].getAttribute('tabindex')).toBe('-1');
  });

  it('ui-change event includes detail with value', async () => {
    const tabs = createTabs(['one', 'two'], 'one');
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const handler = vi.fn();
    tabs.addEventListener('ui-change', handler);

    const tabTwo = tabs.querySelector('ui-tab[value="two"]')!;
    tabTwo.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true, composed: true,
      detail: { value: 'two', label: 'two' },
    }));

    expect(handler.mock.calls[0][0].detail.value).toBe('two');
  });
});

describe('ui-tab', () => {
  function createTab(attrs: Record<string, string> = {}): HTMLElement {
    const tabs = createTabs(['a']);
    const tab = tabs.querySelector('ui-tab')!;
    for (const [k, v] of Object.entries(attrs)) {
      tab.setAttribute(k, v);
    }
    return tab;
  }

  it('value property reads attribute', () => {
    const tab = createTab() as any;
    expect(tab.value).toBe('a');
  });

  it('disabled property reflects to attribute', () => {
    const tab = createTab() as any;
    tab.disabled = true;
    expect(tab.hasAttribute('disabled')).toBe(true);
    expect(tab.getAttribute('aria-disabled')).toBe('true');

    tab.disabled = false;
    expect(tab.hasAttribute('disabled')).toBe(false);
    // ARIA: removing disabled clears aria-disabled
    expect(tab.hasAttribute('aria-disabled')).toBe(false);
  });

  it('label getter uses textContent', () => {
    const tab = createTab() as any;
    expect(tab.label).toBe('a');
  });

  it('label getter prefers label attribute', () => {
    const tab = createTab({ label: 'Custom' }) as any;
    expect(tab.label).toBe('Custom');
  });
});

describe('ui-tab-panel', () => {
  it('value property reflects to attribute', () => {
    const panel = document.createElement('ui-tab-panel') as any;
    panel.setAttribute('value', 'test');
    document.body.appendChild(panel);
    expect(panel.value).toBe('test');
    panel.value = 'new';
    expect(panel.getAttribute('value')).toBe('new');
  });
});
