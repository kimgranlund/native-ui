// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../tooltip.ts';

function create(attrs: Record<string, string> = {}): { anchor: HTMLElement; tooltip: HTMLElement } {
  const anchor = document.createElement('button');
  anchor.textContent = 'Hover me';
  const tip = document.createElement('n-tooltip');
  tip.textContent = 'Tooltip text';
  for (const [k, v] of Object.entries(attrs)) tip.setAttribute(k, v);
  anchor.appendChild(tip);
  document.body.appendChild(anchor);
  return { anchor, tooltip: tip };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('n-tooltip', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-tooltip')).toBeDefined();
  });

  it('placement defaults to "top"', () => {
    const { tooltip } = create();
    expect((tooltip as any).placement).toBe('top');
  });

  it('placement property reflects to attribute', () => {
    const { tooltip } = create();
    (tooltip as any).placement = 'bottom';
    expect(tooltip.getAttribute('placement')).toBe('bottom');
  });

  it('placement attribute reflects to property', () => {
    const { tooltip } = create({ placement: 'right' });
    expect((tooltip as any).placement).toBe('right');
  });

  it('delay defaults to 500', () => {
    const { tooltip } = create();
    expect((tooltip as any).delay).toBe(500);
  });

  it('delay property reflects to attribute', () => {
    const { tooltip } = create();
    (tooltip as any).delay = 1000;
    expect(tooltip.getAttribute('delay')).toBe('1000');
  });

  it('delay attribute reflects to property as number', () => {
    const { tooltip } = create({ delay: '250' });
    expect((tooltip as any).delay).toBe(250);
  });

  it('sets popover="manual" on setup', () => {
    const { tooltip } = create();
    expect(tooltip.getAttribute('popover')).toBe('manual');
  });

  it('generates an ID if none provided', () => {
    const { tooltip } = create();
    expect(tooltip.id).toBeTruthy();
    expect(tooltip.id.length).toBeGreaterThan(0);
  });

  it('preserves existing ID if one is provided', () => {
    const { tooltip } = create({ id: 'my-custom-tip' });
    expect(tooltip.id).toBe('my-custom-tip');
  });

  it('sets aria-describedby on anchor referencing tooltip id', () => {
    const { anchor, tooltip } = create();
    expect(anchor.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('sets anchor-name style on parent element', () => {
    const { anchor } = create();
    const anchorName = anchor.style.getPropertyValue('anchor-name');
    expect(anchorName).toBeTruthy();
    expect(anchorName).toMatch(/^--tip-/);
  });

  it('mouseenter after delay opens the tooltip', () => {
    vi.useFakeTimers();
    const showPopover = vi.fn();
    const { anchor, tooltip } = create();
    (tooltip as any).showPopover = showPopover;

    anchor.dispatchEvent(new Event('mouseenter'));
    expect(showPopover).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(showPopover).toHaveBeenCalledTimes(1);
  });

  it('mouseenter with custom delay waits for the correct duration', () => {
    vi.useFakeTimers();
    const showPopover = vi.fn();
    const { anchor, tooltip } = create({ delay: '200' });
    (tooltip as any).showPopover = showPopover;

    anchor.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(199);
    expect(showPopover).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(showPopover).toHaveBeenCalledTimes(1);
  });

  it('mouseleave before delay cancels the pending open', () => {
    vi.useFakeTimers();
    const showPopover = vi.fn();
    const { anchor, tooltip } = create();
    (tooltip as any).showPopover = showPopover;

    anchor.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(300);
    anchor.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(300);

    expect(showPopover).not.toHaveBeenCalled();
  });

  it('mouseleave closes an open tooltip immediately', () => {
    vi.useFakeTimers();
    const showPopover = vi.fn();
    const hidePopover = vi.fn();
    const { anchor, tooltip } = create();
    (tooltip as any).showPopover = showPopover;
    (tooltip as any).hidePopover = hidePopover;

    // Open the tooltip
    anchor.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(500);
    expect(showPopover).toHaveBeenCalledTimes(1);

    // Close it
    anchor.dispatchEvent(new Event('mouseleave'));
    expect(hidePopover).toHaveBeenCalledTimes(1);
  });

  it('focusin on anchor starts the delay timer', () => {
    vi.useFakeTimers();
    const showPopover = vi.fn();
    const { anchor, tooltip } = create();
    (tooltip as any).showPopover = showPopover;

    anchor.dispatchEvent(new Event('focusin'));
    vi.advanceTimersByTime(500);
    expect(showPopover).toHaveBeenCalledTimes(1);
  });

  it('focusout on anchor closes the tooltip', () => {
    vi.useFakeTimers();
    const showPopover = vi.fn();
    const hidePopover = vi.fn();
    const { anchor, tooltip } = create();
    (tooltip as any).showPopover = showPopover;
    (tooltip as any).hidePopover = hidePopover;

    anchor.dispatchEvent(new Event('focusin'));
    vi.advanceTimersByTime(500);
    expect(showPopover).toHaveBeenCalledTimes(1);

    anchor.dispatchEvent(new Event('focusout'));
    expect(hidePopover).toHaveBeenCalledTimes(1);
  });

  it('Escape keydown closes an open tooltip', () => {
    vi.useFakeTimers();
    const showPopover = vi.fn();
    const hidePopover = vi.fn();
    const { anchor, tooltip } = create();
    (tooltip as any).showPopover = showPopover;
    (tooltip as any).hidePopover = hidePopover;

    // Open via mouseenter
    anchor.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(500);
    expect(showPopover).toHaveBeenCalledTimes(1);

    // Escape should close
    anchor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(hidePopover).toHaveBeenCalledTimes(1);
  });

  it('Escape keydown does not close a tooltip that is not open', () => {
    const hidePopover = vi.fn();
    const { anchor, tooltip } = create();
    (tooltip as any).hidePopover = hidePopover;

    anchor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(hidePopover).not.toHaveBeenCalled();
  });

  it('teardown removes aria-describedby from anchor', () => {
    const { anchor, tooltip } = create();
    expect(anchor.hasAttribute('aria-describedby')).toBe(true);

    // Remove tooltip from DOM to trigger teardown
    tooltip.remove();
    expect(anchor.hasAttribute('aria-describedby')).toBe(false);
  });

  it('teardown removes anchor-name style from parent', () => {
    const { anchor, tooltip } = create();
    expect(anchor.style.getPropertyValue('anchor-name')).toBeTruthy();

    tooltip.remove();
    expect(anchor.style.getPropertyValue('anchor-name')).toBe('');
  });

  it('teardown removes event listeners so mouseenter no longer triggers open', () => {
    vi.useFakeTimers();
    const showPopover = vi.fn();
    const { anchor, tooltip } = create();
    (tooltip as any).showPopover = showPopover;

    tooltip.remove();

    anchor.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(500);
    expect(showPopover).not.toHaveBeenCalled();
  });
});
