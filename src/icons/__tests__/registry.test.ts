// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { registerIcon, getIcon, onIconRegistered } from '../registry.ts';

const TEST_SVG = '<svg viewBox="0 0 256 256" fill="currentColor"><circle cx="128" cy="128" r="100"/></svg>';

describe('icon registry', () => {
  it('stores and retrieves an icon', () => {
    registerIcon('test-store', TEST_SVG);
    expect(getIcon('test-store')).toBe(TEST_SVG);
  });

  it('returns undefined for unknown names', () => {
    expect(getIcon('nonexistent-icon')).toBeUndefined();
  });

  it('overwrites existing entries', () => {
    registerIcon('test-overwrite', '<svg>old</svg>');
    registerIcon('test-overwrite', '<svg>new</svg>');
    expect(getIcon('test-overwrite')).toBe('<svg>new</svg>');
  });

  it('notifies subscribers on registration', () => {
    const fn = vi.fn();
    onIconRegistered(fn);

    registerIcon('test-notify', TEST_SVG);
    expect(fn).toHaveBeenCalledWith('test-notify');

    // Cleanup: unsubscribe so this fn doesn't fire in other tests
    const unsub = onIconRegistered(() => {});
    unsub(); // just testing the API works
  });

  it('stops notifying after unsubscribe', () => {
    const fn = vi.fn();
    const unsub = onIconRegistered(fn);

    registerIcon('test-unsub-1', TEST_SVG);
    expect(fn).toHaveBeenCalledTimes(1);

    unsub();

    registerIcon('test-unsub-2', TEST_SVG);
    expect(fn).toHaveBeenCalledTimes(1); // Not called again
  });
});
