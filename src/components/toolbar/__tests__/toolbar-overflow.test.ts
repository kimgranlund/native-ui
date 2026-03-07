// @vitest-environment happy-dom

import { describe, it, expect, vi, afterEach } from 'vitest';
import '../toolbar.ts';
import '../../../components/button/button.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mock `getComputedStyle` to return realistic toolbar layout values.
 * Padding + gap are needed for the #measure() content-width calculation.
 */
function mockGetComputedStyle(overrides: Record<string, string> = {}) {
  const defaults: Record<string, string> = {
    paddingInlineStart: '8px',
    paddingInlineEnd: '8px',
    columnGap: '8px',
  };
  const merged = { ...defaults, ...overrides };

  return vi.spyOn(window, 'getComputedStyle').mockReturnValue(
    merged as unknown as CSSStyleDeclaration,
  );
}

/**
 * Set a read-only layout property (offsetWidth, clientWidth, etc.)
 * on an element. Uses `configurable: true` so it can be reassigned.
 */
function mockWidth(el: HTMLElement, prop: 'offsetWidth' | 'clientWidth', value: number) {
  Object.defineProperty(el, prop, { value, configurable: true });
}

/**
 * Create a toolbar with n-button children.
 * Each entry in `items` can be a plain string (label) or an object with
 * optional overflow-priority / overflow-pin attributes.
 */
interface ItemSpec {
  label: string;
  priority?: 'low' | 'normal' | 'high';
  pin?: boolean;
  ariaLabel?: string;
}

function createToolbar(
  items: (string | ItemSpec)[],
  toolbarAttrs: Record<string, string> = {},
): HTMLElement {
  const toolbar = document.createElement('n-toolbar');
  for (const [k, v] of Object.entries(toolbarAttrs)) {
    toolbar.setAttribute(k, v);
  }

  for (const item of items) {
    const btn = document.createElement('n-button');
    if (typeof item === 'string') {
      btn.textContent = item;
    } else {
      btn.textContent = item.label;
      if (item.priority) btn.setAttribute('overflow-priority', item.priority);
      if (item.pin) btn.setAttribute('overflow-pin', '');
      if (item.ariaLabel) btn.setAttribute('aria-label', item.ariaLabel);
    }
    toolbar.appendChild(btn);
  }

  document.body.appendChild(toolbar);
  return toolbar;
}

/**
 * Get all content buttons (excludes the stamped overflow trigger).
 */
function getContentButtons(toolbar: HTMLElement): HTMLElement[] {
  return [...toolbar.querySelectorAll<HTMLElement>('n-button:not([data-overflow-trigger])')];
}

/**
 * Get items that have been overflowed (hidden via data-overflow attribute).
 */
function getOverflowedItems(toolbar: HTMLElement): HTMLElement[] {
  return [...toolbar.querySelectorAll<HTMLElement>('[data-overflow]:not([data-overflow-trigger])')];
}

/**
 * Trigger the overflow measurement cycle and wait for it to complete.
 *
 * The toolbar uses MutationObserver -> #scheduleMeasure() -> requestAnimationFrame -> #measure().
 * Both MutationObserver and rAF fire asynchronously in happy-dom, so we:
 *   1. Mutate the child list to trigger the MutationObserver.
 *   2. Wait enough async ticks for the MO callback and rAF to fire.
 */
async function triggerMeasure(toolbar: HTMLElement): Promise<void> {
  // Force MutationObserver callback by mutating child list
  const probe = document.createElement('span');
  toolbar.appendChild(probe);
  probe.remove();

  // Wait for MutationObserver (microtask/macrotask) + rAF (macrotask) to settle.
  // happy-dom fires rAF after ~16ms by default.
  await new Promise(r => setTimeout(r, 50));
}

/**
 * Apply width mocks to toolbar and its children.
 */
function applyWidthMocks(
  toolbar: HTMLElement,
  containerWidth: number,
  buttonWidth: number,
  moreBtnWidth = 32,
) {
  mockWidth(toolbar, 'clientWidth', containerWidth);
  const buttons = getContentButtons(toolbar);
  for (const btn of buttons) mockWidth(btn, 'offsetWidth', buttonWidth);
  const moreBtn = toolbar.querySelector('[data-overflow-trigger]') as HTMLElement;
  if (moreBtn) mockWidth(moreBtn, 'offsetWidth', moreBtnWidth);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('toolbar overflow priority', () => {

  // ── Priority ordering ──

  it('low-priority items overflow before normal priority', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar([
      { label: 'Low', priority: 'low' },
      'Normal-A',
      'Normal-B',
    ]);

    // Toolbar has 200px content; each button is 80px; gap is 8px.
    // Total: 80 + 8 + 80 + 8 + 80 = 256 (exceeds 200).
    // After subtracting more-btn (32px) + gap (8px) => available = 152.
    // Overflow candidates sorted: Low (priority 0, index 0) first,
    //   then Normal-B (priority 1, index 2), then Normal-A (priority 1, index 1).
    // Removing Low: 256 - (80 + 8) = 168 > 152.
    // Removing Normal-B: 168 - (80 + 8) = 80 <= 152. Done.
    applyWidthMocks(toolbar, 216, 80); // content = 216 - 8 - 8 = 200

    await triggerMeasure(toolbar);

    const overflowed = getOverflowedItems(toolbar);
    const overflowedLabels = overflowed.map(el => el.textContent);

    // Low should always overflow first
    expect(overflowedLabels).toContain('Low');
    cssSpy.mockRestore();
  });

  it('high-priority items overflow last', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar([
      'Normal-A',
      'Normal-B',
      { label: 'High', priority: 'high' },
    ]);

    // 3 buttons x 80px + 2 gaps x 8px = 256.
    // Content = 216 - 16 = 200 — overflow needed.
    // Available after more-btn: 200 - 32 - 8 = 160.
    // Candidates sorted: Normal-B (pri=1, idx=1) first, Normal-A (pri=1, idx=0),
    //   High (pri=2, idx=2) last.
    // Removing Normal-B: 256 - 88 = 168 > 160.
    // Removing Normal-A: 168 - 88 = 80 <= 160. Done.
    applyWidthMocks(toolbar, 216, 80);

    await triggerMeasure(toolbar);

    const overflowed = getOverflowedItems(toolbar);
    const overflowedLabels = overflowed.map(el => el.textContent);

    // Normal items should overflow, High should remain visible
    expect(overflowedLabels).not.toContain('High');
    expect(overflowedLabels.length).toBeGreaterThan(0);
    cssSpy.mockRestore();
  });

  // ── Pinned items ──

  it('pinned items never overflow', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar([
      'Normal',
      { label: 'Pinned', pin: true },
    ]);

    // 2 buttons x 120px + 1 gap x 8px = 248.
    // Content = 132 - 16 = 116 — overflow needed.
    // Available after more-btn: 116 - 32 - 8 = 76.
    // Candidates: only Normal (Pinned is excluded).
    applyWidthMocks(toolbar, 132, 120);

    await triggerMeasure(toolbar);

    const overflowed = getOverflowedItems(toolbar);
    const overflowedLabels = overflowed.map(el => el.textContent);

    // Pinned must never overflow
    expect(overflowedLabels).not.toContain('Pinned');
    // Normal should have overflowed
    expect(overflowedLabels).toContain('Normal');
    cssSpy.mockRestore();
  });

  // ── Same priority — reverse DOM order ──

  it('same priority uses reverse DOM order (later items overflow first)', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar(['A', 'B', 'C']);

    // 3 x 80 + 2 x 8 = 256.
    // Content = 200.
    // Available after more-btn: 200 - 32 - 8 = 160.
    // All normal priority. Sorted by reverse index: C(idx=2), B(idx=1), A(idx=0).
    // Removing C: 256 - 88 = 168 > 160.
    // Removing B: 168 - 88 = 80 <= 160. Done.
    // C and B overflow; A stays.
    applyWidthMocks(toolbar, 216, 80);

    await triggerMeasure(toolbar);

    const overflowed = getOverflowedItems(toolbar);
    const overflowedLabels = overflowed.map(el => el.textContent);

    expect(overflowedLabels).toContain('C');
    expect(overflowedLabels).toContain('B');
    expect(overflowedLabels).not.toContain('A');
    cssSpy.mockRestore();
  });

  // ── Single item overflow at boundary ──

  it('overflows only the minimum items needed to fit', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar(['A', 'B', 'C']);

    // 3 x 60 + 2 x 8 = 196.
    // Content = 206 - 16 = 190. Total 196 > 190, overflow needed.
    // Available after more-btn: 190 - 32 - 8 = 150.
    // Candidates: C(idx=2), B(idx=1), A(idx=0).
    // Removing C: 196 - 68 = 128 <= 150. Done.
    // Only C overflows.
    applyWidthMocks(toolbar, 206, 60);

    await triggerMeasure(toolbar);

    const overflowed = getOverflowedItems(toolbar);
    expect(overflowed).toHaveLength(1);
    expect(overflowed[0].textContent).toBe('C');
    cssSpy.mockRestore();
  });

  // ── Diagnostics event ──

  it('native:toolbar-overflow event fires with correct payload when overflowing', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar([
      { label: 'Bold', ariaLabel: 'Bold' },
      { label: 'Italic', ariaLabel: 'Italic' },
      { label: 'Strike', ariaLabel: 'Strike' },
    ]);

    applyWidthMocks(toolbar, 216, 80); // content = 200

    const handler = vi.fn();
    toolbar.addEventListener('native:toolbar-overflow', handler);

    await triggerMeasure(toolbar);

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail).toHaveProperty('visibleCount');
    expect(detail).toHaveProperty('overflowedCount');
    expect(detail).toHaveProperty('overflowedLabels');
    expect(detail).toHaveProperty('availableWidth');
    expect(detail).toHaveProperty('totalWidth');

    // Some items overflowed
    expect(detail.overflowedCount).toBeGreaterThan(0);
    expect(detail.visibleCount + detail.overflowedCount).toBe(3);
    expect(detail.overflowedLabels.length).toBe(detail.overflowedCount);
    cssSpy.mockRestore();
  });

  it('native:toolbar-overflow fires with zero overflow when everything fits', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar(['A', 'B']);

    // 2 x 60 + 1 x 8 = 128. Content area = 500 - 16 = 484. Fits easily.
    applyWidthMocks(toolbar, 500, 60);

    const handler = vi.fn();
    toolbar.addEventListener('native:toolbar-overflow', handler);

    await triggerMeasure(toolbar);

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.overflowedCount).toBe(0);
    expect(detail.visibleCount).toBe(2);
    expect(detail.overflowedLabels).toEqual([]);
    cssSpy.mockRestore();
  });

  // ── Toolbar group (atomic overflow) ──

  it('toolbar-group overflows atomically as a single unit', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = document.createElement('n-toolbar');

    // Standalone button
    const standaloneBtn = document.createElement('n-button');
    standaloneBtn.textContent = 'Standalone';
    toolbar.appendChild(standaloneBtn);

    // Group with two buttons
    const group = document.createElement('n-toolbar-group');
    const groupBtnA = document.createElement('n-button');
    groupBtnA.textContent = 'Group-A';
    const groupBtnB = document.createElement('n-button');
    groupBtnB.textContent = 'Group-B';
    group.appendChild(groupBtnA);
    group.appendChild(groupBtnB);
    toolbar.appendChild(group);

    document.body.appendChild(toolbar);

    // Content = 200. Total: standalone(80) + groupA(80) + groupB(80) + 2 gaps(16) = 256.
    // Overflow needed. Available after more-btn: 200 - 32 - 8 = 160.
    // Units: standalone(idx=0, width=80), group(idx=1, width=80+8+80=168).
    // Candidates sorted by reverse index: group(idx=1) first, standalone(idx=0) second.
    // Removing group: 256 - 168 - 8 = 80 <= 160. Done.
    mockWidth(toolbar, 'clientWidth', 216);
    mockWidth(standaloneBtn, 'offsetWidth', 80);
    mockWidth(groupBtnA, 'offsetWidth', 80);
    mockWidth(groupBtnB, 'offsetWidth', 80);
    const moreBtn = toolbar.querySelector('[data-overflow-trigger]') as HTMLElement;
    if (moreBtn) mockWidth(moreBtn, 'offsetWidth', 32);

    await triggerMeasure(toolbar);

    // The group element itself should get data-overflow, not the individual buttons
    expect(group.hasAttribute('data-overflow')).toBe(true);
    expect(standaloneBtn.hasAttribute('data-overflow')).toBe(false);
    cssSpy.mockRestore();
  });

  // ── Group with priority ──

  it('toolbar-group respects overflow-priority attribute', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = document.createElement('n-toolbar');

    // A high-priority group
    const highGroup = document.createElement('n-toolbar-group');
    highGroup.setAttribute('overflow-priority', 'high');
    const highA = document.createElement('n-button');
    highA.textContent = 'High-A';
    const highB = document.createElement('n-button');
    highB.textContent = 'High-B';
    highGroup.appendChild(highA);
    highGroup.appendChild(highB);
    toolbar.appendChild(highGroup);

    // A normal standalone button
    const normalBtn = document.createElement('n-button');
    normalBtn.textContent = 'Normal';
    toolbar.appendChild(normalBtn);

    document.body.appendChild(toolbar);

    // Content = 250. highGroup width = 80+8+80 = 168. normalBtn = 80.
    // Total = 168 + 8 + 80 = 256 > 250. Overflow needed.
    // Available after more-btn: 250 - 32 - 8 = 210.
    // Candidates: normalBtn (pri=1, idx=1), highGroup (pri=2, idx=0).
    // Sorted: normalBtn first (lower priority value).
    // Removing normalBtn: 256 - 88 = 168 <= 210. Done.
    mockWidth(toolbar, 'clientWidth', 266); // content = 266 - 16 = 250
    mockWidth(highA, 'offsetWidth', 80);
    mockWidth(highB, 'offsetWidth', 80);
    mockWidth(normalBtn, 'offsetWidth', 80);
    const moreBtn = toolbar.querySelector('[data-overflow-trigger]') as HTMLElement;
    if (moreBtn) mockWidth(moreBtn, 'offsetWidth', 32);

    await triggerMeasure(toolbar);

    // Normal should overflow, high-priority group should stay
    expect(normalBtn.hasAttribute('data-overflow')).toBe(true);
    expect(highGroup.hasAttribute('data-overflow')).toBe(false);
    cssSpy.mockRestore();
  });

  // ── Data-overflowing attribute ──

  it('sets data-overflowing on toolbar when overflow occurs', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar(['A', 'B', 'C']);

    applyWidthMocks(toolbar, 216, 80); // content = 200

    await triggerMeasure(toolbar);

    expect(toolbar.hasAttribute('data-overflowing')).toBe(true);
    cssSpy.mockRestore();
  });

  it('removes data-overflowing when everything fits', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar(['A', 'B']);

    applyWidthMocks(toolbar, 500, 60);

    await triggerMeasure(toolbar);

    expect(toolbar.hasAttribute('data-overflowing')).toBe(false);
    cssSpy.mockRestore();
  });

  // ── Overflow menu population ──

  it('populates overflow listbox with labels from overflowed items', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar([
      { label: 'Bold', ariaLabel: 'Bold' },
      { label: 'Italic', ariaLabel: 'Italic' },
      { label: 'Strike', ariaLabel: 'Strike' },
    ]);

    // Force all but one to overflow
    applyWidthMocks(toolbar, 132, 80); // content = 116

    await triggerMeasure(toolbar);

    const listbox = toolbar.querySelector('n-listbox');
    expect(listbox).not.toBeNull();
    const options = listbox!.querySelectorAll('n-option');
    const overflowed = getOverflowedItems(toolbar);

    // The overflow menu should have one option per overflowed item
    expect(options.length).toBe(overflowed.length);
    expect(options.length).toBeGreaterThan(0);
    cssSpy.mockRestore();
  });

  // ── Reset when resize grows ──

  it('clears overflow when container grows to fit all items', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar(['A', 'B', 'C']);

    // First trigger: narrow — causes overflow
    applyWidthMocks(toolbar, 216, 80);

    await triggerMeasure(toolbar);
    expect(getOverflowedItems(toolbar).length).toBeGreaterThan(0);

    // Second trigger: wide — everything fits
    mockWidth(toolbar, 'clientWidth', 600);
    await triggerMeasure(toolbar);

    expect(getOverflowedItems(toolbar).length).toBe(0);
    expect(toolbar.hasAttribute('data-overflowing')).toBe(false);
    cssSpy.mockRestore();
  });

  // ── Edge case: contentWidth <= 0 ──

  it('does not crash when container has zero width', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar(['A', 'B']);

    mockWidth(toolbar, 'clientWidth', 0);

    // Should not throw
    await triggerMeasure(toolbar);
    cssSpy.mockRestore();
  });

  // ── Combined: priority + pinned ──

  it('respects both priority and pinned together', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar([
      { label: 'Low-Pinned', priority: 'low', pin: true },
      { label: 'Normal' },
      { label: 'High', priority: 'high' },
    ]);

    // Narrow: force overflow.
    // 3 x 80 + 2 x 8 = 256. Content = 116.
    // Available after more-btn: 116 - 32 - 8 = 76.
    // Candidates (non-pinned): Normal(pri=1, idx=1), High(pri=2, idx=2).
    // Sorted: Normal first (lower priority value).
    // Removing Normal: 256 - 88 = 168 > 76.
    // Removing High: 168 - 88 = 80 > 76. No more candidates.
    // Both Normal and High overflow; Low-Pinned stays.
    applyWidthMocks(toolbar, 132, 80);

    await triggerMeasure(toolbar);

    const overflowed = getOverflowedItems(toolbar);
    const overflowedLabels = overflowed.map(el => el.textContent);

    // Low-Pinned must never overflow, despite being low priority
    expect(overflowedLabels).not.toContain('Low-Pinned');
    // Both Normal and High should overflow since space is very tight
    expect(overflowedLabels).toContain('Normal');
    expect(overflowedLabels).toContain('High');
    cssSpy.mockRestore();
  });

  // ── Event label extraction ──

  it('overflow event labels use aria-label when present', async () => {
    const cssSpy = mockGetComputedStyle();
    const toolbar = createToolbar([
      { label: '', ariaLabel: 'Format Bold' },
      { label: '', ariaLabel: 'Format Italic' },
    ]);

    // Force overflow of at least one
    applyWidthMocks(toolbar, 132, 80); // content = 116

    const handler = vi.fn();
    toolbar.addEventListener('native:toolbar-overflow', handler);

    await triggerMeasure(toolbar);

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    // Overflowed labels should come from aria-label, not textContent
    for (const label of detail.overflowedLabels) {
      expect(label).toMatch(/^Format /);
    }
    cssSpy.mockRestore();
  });
});
