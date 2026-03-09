import { signal } from '../../reactivity/signal.ts';
import type { Signal } from '../../reactivity/types.ts';
import { RovingFocusController } from '../roving-focus/roving-focus-controller.ts';

export interface ListNavigateOptions {
  itemSelector?: string;
  ariaAttr?: 'aria-selected' | 'aria-checked' | 'aria-current';
  autoSync?: boolean;
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
  disabled?: boolean;
  onChildSelect?: (detail: { value: string; label: string }) => void;
  addEffect?: (fn: () => void) => void;
  deferChildren?: (fn: () => void) => void;
}

/** Coordinates roving focus, ARIA selection sync, and child select events for list-based components. */
export class ListNavigateController {
  readonly host: HTMLElement;
  readonly listValue: Signal<string | null> = signal(null);

  itemSelector: string;
  ariaAttr: 'aria-selected' | 'aria-checked' | 'aria-current';
  autoSync: boolean;
  onChildSelect: (detail: { value: string; label: string }) => void;

  readonly #roving: RovingFocusController;
  #attached = false;

  constructor(host: HTMLElement, options: ListNavigateOptions = {}) {
    this.host = host;
    this.itemSelector = options.itemSelector ?? ':scope > [role]';
    this.ariaAttr = options.ariaAttr ?? 'aria-selected';
    this.autoSync = options.autoSync ?? true;

    // Default onChildSelect: set value + dispatch native:change
    this.onChildSelect = options.onChildSelect ?? ((detail) => {
      this.listValue.value = detail.value;
      host.dispatchEvent(new CustomEvent('native:change', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail,
      }));
    });

    this.#roving = new RovingFocusController(host, {
      selector: this.itemSelector,
      orientation: options.orientation ?? 'vertical',
      wrap: options.wrap ?? true,
      disabled: options.disabled ?? false,
    });

    this.attach();

    // Auto-sync ARIA if enabled and host provides addEffect/deferChildren
    if (this.autoSync && options.addEffect && options.deferChildren) {
      const addEffect = options.addEffect;
      options.deferChildren(() => {
        addEffect(() => {
          const selected = this.listValue.value;
          const items = host.querySelectorAll<HTMLElement>(this.itemSelector);
          const isCurrent = this.ariaAttr === 'aria-current';
          for (const item of items) {
            // WHY: Prefer attribute over property — child elements may not be upgraded yet
            // when this effect first runs (e.g. static HTML from Astro set:html).
            // Fall back to property for dynamically created items without attributes.
            const val = item.getAttribute('value') ?? (item as unknown as { value?: string }).value;
            if (val !== undefined) {
              const isMatch = val === selected;
              if (isCurrent) {
                // aria-current uses "page" when active, removed when not
                if (isMatch) item.setAttribute('aria-current', 'page');
                else item.removeAttribute('aria-current');
              } else {
                item.setAttribute(this.ariaAttr, isMatch ? 'true' : 'false');
              }
            }
          }
        });
      });
    }
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('native:select', this.#onSelect as EventListener);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('native:select', this.#onSelect as EventListener);
  }

  destroy(): void {
    this.detach();
    this.#roving.destroy();
  }

  /** Access the underlying roving focus controller for direct configuration. */
  get rovingFocus(): RovingFocusController {
    return this.#roving;
  }

  #onSelect = (e: Event): void => {
    if ((this.host as unknown as { disabled?: boolean }).disabled === true) return;
    const detail = (e as CustomEvent).detail as { value: string; label: string };
    this.onChildSelect(detail);
  };
}
