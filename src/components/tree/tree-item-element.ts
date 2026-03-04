import { signal } from '../../reactivity/signal.ts';
import { NativeElement } from '../../core/native-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';

/**
 * Expandable tree item with nesting support and selection.
 * @attr {boolean} expanded - Whether child items are visible
 * @attr {boolean} selected - Whether this item is selected
 * @attr {boolean} disabled - Disables interaction
 */
export class NTreeItem extends NativeElement {
  static observedAttributes = ['expanded', 'selected', 'disabled'];

  #internals: ElementInternals;
  #childrenWrapper: HTMLDivElement | null = null;
  #caretIcon: HTMLElement | null = null;
  #disabled = signal(false);

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'treeitem';
  }

  get expanded(): boolean { return this.hasAttribute('expanded'); }
  set expanded(val: boolean) {
    this.toggleAttribute('expanded', val);
    if (this.isConnected) this.#syncState();
  }

  get selected(): boolean { return this.hasAttribute('selected'); }
  set selected(val: boolean) {
    this.toggleAttribute('selected', val);
    if (this.isConnected) this.#syncState();
  }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  setup(): void {
    super.setup();

    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));

    this.deferChildren(() => {
      this.#organizeChildren();
      this.#syncState();
    });

    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  teardown(): void {
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('keydown', this.#onKeyDown);
    super.teardown();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'disabled') this.#disabled.value = val !== null;
    if (this.isConnected) this.#syncState();
    super.attributeChangedCallback(name, old, val);
  }

  #organizeChildren(): void {
    // Check if this item has child tree-items
    const childItems = this.querySelectorAll(':scope > n-tree-item');
    if (childItems.length > 0) {
      this.setAttribute('expandable', '');

      // Inject caret icon into label
      const label = this.querySelector(':scope > [slot="label"]');
      if (label) {
        this.#caretIcon = document.createElement('n-icon');
        this.#caretIcon.setAttribute('name', this.hasAttribute('expanded') ? 'caret-down' : 'caret-right');
        this.#caretIcon.dataset.role = 'caret';
        label.prepend(this.#caretIcon);
      }

      // Wrap child items in a container
      this.#childrenWrapper = document.createElement('div');
      this.#childrenWrapper.classList.add('n-tree-children');
      for (const child of childItems) {
        this.#childrenWrapper.appendChild(child);
      }
      this.appendChild(this.#childrenWrapper);
    }

    // Set indent based on nesting depth
    let depth = 0;
    let parent: Element | null = this.parentElement;
    while (parent) {
      if (parent.tagName === 'N-TREE-ITEM') depth++;
      else if (parent.classList?.contains('n-tree-children')) { /* skip wrapper */ }
      else break;
      parent = parent.parentElement;
    }
    if (depth > 0) {
      const label = this.querySelector(':scope > [slot="label"]');
      if (label instanceof HTMLElement) {
        label.style.setProperty('--n-tree-depth', String(depth));
      }
    }

    // Ensure label is focusable
    const label = this.querySelector(':scope > [slot="label"]');
    if (label instanceof HTMLElement && !label.hasAttribute('tabindex')) {
      label.setAttribute('tabindex', '-1');
    }
  }

  #syncState(): void {
    const expanded = this.hasAttribute('expanded');
    const selected = this.hasAttribute('selected');
    // WHY: setAttribute (not internals.ariaExpanded) so assistive tech reads the DOM attribute
    if (this.hasAttribute('expandable')) {
      this.setAttribute('aria-expanded', String(expanded));
    } else {
      this.removeAttribute('aria-expanded');
    }
    // WHY: setAttribute (not internals.ariaSelected) so CSS [aria-selected] selectors match
    this.setAttribute('aria-selected', String(selected));
    // WHY: aria-disabled is managed by createDisabledEffect — no manual handling needed

    // Update caret icon direction
    if (this.#caretIcon) {
      this.#caretIcon.setAttribute('name', expanded ? 'caret-down' : 'caret-right');
    }
  }

  #onClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    // Only handle clicks on this item's label, not child item labels
    const label = this.querySelector(':scope > [slot="label"]');
    if (target !== label && !label?.contains(target)) return;
    e.stopPropagation();

    if (this.#disabled.value) return;

    if (this.hasAttribute('expandable')) {
      this.toggleAttribute('expanded');
    }
    this.toggleAttribute('selected', true);
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement;
    const label = this.querySelector(':scope > [slot="label"]');
    if (target !== label) return;

    if (this.#disabled.value) return;

    switch (e.key) {
      case 'ArrowRight':
        if (this.hasAttribute('expandable') && !this.hasAttribute('expanded')) {
          this.setAttribute('expanded', '');
          e.preventDefault();
          e.stopPropagation();
        } else if (this.hasAttribute('expanded')) {
          // Focus first child
          const firstChild = this.querySelector(':scope > .n-tree-children > n-tree-item > [slot="label"]') as HTMLElement;
          if (firstChild) { firstChild.focus(); e.preventDefault(); e.stopPropagation(); }
        }
        break;
      case 'ArrowLeft':
        if (this.hasAttribute('expanded')) {
          this.removeAttribute('expanded');
          e.preventDefault();
          e.stopPropagation();
        } else {
          // Focus parent item's label
          const parentItem = this.parentElement?.closest('n-tree-item');
          const parentLabel = parentItem?.querySelector(':scope > [slot="label"]') as HTMLElement;
          if (parentLabel) { parentLabel.focus(); e.preventDefault(); e.stopPropagation(); }
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.stopPropagation();
        this.toggleAttribute('selected', true);
        if (this.hasAttribute('expandable')) {
          this.toggleAttribute('expanded');
        }
        break;
    }
  };
}
