import { PopoverController } from '../popover/popover-controller.ts';
import type { TextTriggerItem, TextTriggerOptions, TextTriggerMatch } from './text-trigger-types.ts';

/**
 * Base class for trigger-char-at-caret → popover → select → action pattern.
 *
 * Subclasses provide identity (trigger char, event prefix, data attribute)
 * and optional customization (tag text format, tag styling, option rendering).
 *
 * Used by SlashCommandController (`/`) and MentionController (`@`).
 */
export abstract class TextTriggerController {
  readonly host: HTMLElement;
  readonly #input: HTMLElement;
  #items: TextTriggerItem[];
  #popover: PopoverController;
  #listbox: HTMLElement | null = null;
  #tag: HTMLElement | null = null;
  #currentMatch: TextTriggerMatch | null = null;
  #open = false;
  #activeIndex = -1;

  // ── Abstract: subclass identity ──

  protected abstract get triggerChar(): string;
  protected abstract get eventPrefix(): string;
  protected abstract get dataAttribute(): string;

  // ── Overridable: subclass customization ──

  /** Format the text displayed inside an inserted tag. Default: `{trigger}{item.value}`. */
  protected formatTagText(item: TextTriggerItem): string {
    return `${this.triggerChar}${item.value}`;
  }

  /** Apply inline styles to an inserted tag element. Override for custom styling. */
  protected styleTag(tag: HTMLElement, _item: TextTriggerItem): void {
    const s = tag.style;
    s.display = 'inline';
    s.background = 'var(--n-surface)';
    s.color = 'var(--n-surface-ink)';
    s.borderRadius = 'calc(var(--n-radius) * 0.5)';
    s.padding = '0 0.3em';
    s.fontSize = '0.8125em';
    s.fontWeight = '500';
    s.lineHeight = '1.25';
    s.verticalAlign = 'baseline';
    s.userSelect = 'all';
  }

  /** Render content inside a listbox option. Override for custom rendering (e.g. avatars). */
  protected renderOptionContent(option: HTMLElement, item: TextTriggerItem): void {
    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    option.appendChild(labelSpan);

    if (item.description) {
      option.setAttribute('title', item.description);
      const descSpan = document.createElement('span');
      descSpan.textContent = item.description;
      const ds = descSpan.style;
      ds.marginInlineStart = 'auto';
      ds.paddingInlineStart = '0.75em';
      ds.fontSize = '0.75em';
      ds.color = 'var(--n-ink-muted)';
      ds.fontWeight = '400';
      option.appendChild(descSpan);
    }
  }

  /** Keyboard shortcut key for Cmd/Ctrl+{key} toggle. Return null for no shortcut. */
  protected get keyboardShortcut(): string | null { return null; }

  // ── Constructor ──

  constructor(host: HTMLElement, options: TextTriggerOptions) {
    this.host = host;
    this.#input = options.input;
    this.#items = options.items;
    this.#popover = new PopoverController(host);

    this.host.addEventListener('native:input', this.#onInput);
    this.#input.addEventListener('keydown', this.#onKeydown);
    this.host.addEventListener('native:dismiss', this.#onDismiss);
  }

  // ── Public API ──

  get items(): TextTriggerItem[] { return this.#items; }
  set items(val: TextTriggerItem[]) {
    this.#items = val;
    if (this.#open) {
      const query = this.#currentMatch?.query ?? '';
      this.#renderOptions(query);
    }
  }

  get open(): boolean { return this.#open; }

  destroy(): void {
    this.#hide();

    this.host.removeEventListener('native:input', this.#onInput);
    this.#input.removeEventListener('keydown', this.#onKeydown);
    this.host.removeEventListener('native:dismiss', this.#onDismiss);

    if (this.#listbox) {
      this.#listbox.removeEventListener('native:change', this.#onListboxChange);
      this.#listbox.removeEventListener('click', this.#onListboxClick);
      this.#listbox.remove();
      this.#listbox = null;
    }

    this.#tag = null;
    this.#currentMatch = null;
    this.#popover.destroy();
  }

  // ── Caret-based trigger detection ──

  #detectTriggerAtCaret(): TextTriggerMatch | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    if (!range.collapsed) return null;

    const focusNode = sel.focusNode;
    if (!focusNode || focusNode.nodeType !== Node.TEXT_NODE) return null;

    const editable = this.#getEditable();
    if (!editable || !editable.contains(focusNode)) return null;

    const text = focusNode.textContent ?? '';
    const caretOffset = sel.focusOffset;
    const trigger = this.triggerChar;

    // Walk backward from caret to find trigger char
    for (let i = caretOffset - 1; i >= 0; i--) {
      const ch = text[i];
      if (ch === trigger) {
        const precededByWhitespace = i > 0 && /\s/.test(text[i - 1]);
        const atNodeStart = i === 0;
        const atEditableStart = atNodeStart && this.#isFirstTextPosition(editable, focusNode);

        if (precededByWhitespace || atEditableStart) {
          const query = text.slice(i + 1, caretOffset);
          return { query, triggerNode: focusNode as Text, triggerOffset: i, caretOffset };
        }
        return null;
      }
      // Hit whitespace before finding trigger — no match
      if (/\s/.test(ch)) return null;
    }
    return null;
  }

  #isFirstTextPosition(editable: HTMLElement, node: Node): boolean {
    const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
    let first = walker.nextNode();
    while (first && (first.textContent ?? '').trim() === '') {
      first = walker.nextNode();
    }
    return first === node;
  }

  #getEditable(): HTMLElement | null {
    if (this.#input.hasAttribute('contenteditable')) return this.#input;
    return this.#input.querySelector<HTMLElement>('[contenteditable]') ?? null;
  }

  // ── Direct caret positioning ──

  #updateListboxPosition(): void {
    if (!this.#listbox) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);

    const caretRect = range.getBoundingClientRect();
    const gap = 4;

    this.#listbox.style.left = `${caretRect.left}px`;
    this.#listbox.style.top = `${caretRect.bottom + gap}px`;
  }

  // ── Event handlers (arrow functions for auto-bind) ──

  #onInput = (_e: Event): void => {
    // If the tag was removed from the DOM (e.g. backspace), clear the reference
    if (this.#tag && !this.#tag.isConnected) {
      this.#tag = null;
    }

    const result = this.#detectTriggerAtCaret();
    if (result) {
      this.#currentMatch = result;
      this.#show(result.query);
    } else {
      this.#currentMatch = null;
      this.#hide();
    }
  };

  #onKeydown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const key = ke.key;

    // Keyboard shortcut toggle (e.g. Cmd+/ for slash commands)
    const shortcut = this.keyboardShortcut;
    if (shortcut && (ke.metaKey || ke.ctrlKey) && key === shortcut) {
      ke.preventDefault();
      if (this.#open) {
        this.#hide();
      } else {
        this.#insertTriggerAtCaret();
      }
      return;
    }

    if (key === 'Escape' && this.#open) {
      ke.preventDefault();
      this.#hide();
      return;
    }

    if (key === 'Enter' && this.#open) {
      ke.preventDefault();
      const option = this.#getActiveOption();
      if (option) {
        const value = option.getAttribute('value') ?? '';
        this.#selectItem(value);
      }
      return;
    }

    // Tab selects closest match when query has 2+ characters
    if (key === 'Tab' && this.#open) {
      const query = this.#currentMatch?.query ?? '';
      if (query.length >= 2) {
        ke.preventDefault();
        const option = this.#getActiveOption()
          ?? this.#listbox?.querySelector<HTMLElement>('n-option');
        if (option) {
          const value = option.getAttribute('value') ?? '';
          this.#selectItem(value);
        }
      }
      return;
    }

    // Navigate options — managed internally to keep focus in the input
    if ((key === 'ArrowDown' || key === 'ArrowUp') && this.#open && this.#listbox) {
      ke.preventDefault();
      const options = this.#listbox.querySelectorAll<HTMLElement>('n-option');
      if (options.length === 0) return;
      const delta = key === 'ArrowDown' ? 1 : -1;
      let next = this.#activeIndex + delta;
      if (next < 0) next = options.length - 1;
      if (next >= options.length) next = 0;
      this.#setActiveIndex(next);
    }
  };

  #onDismiss = (): void => {
    this.#hide();
  };

  #onListboxChange = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    const value: string = detail?.value ?? '';
    if (value) {
      e.stopImmediatePropagation();
      this.#selectItem(value);
    }
  };

  #onListboxClick = (e: Event): void => {
    const option = (e.target as HTMLElement).closest?.('n-option') as HTMLElement | null;
    if (!option) return;
    const value = option.getAttribute('value') ?? '';
    if (value) this.#selectItem(value);
  };

  // ── Internal methods ──

  /** Insert the trigger character at the current caret position (for keyboard shortcut). */
  #insertTriggerAtCaret(): void {
    this.#input.focus();

    const editable = this.#getEditable();
    if (editable) {
      document.execCommand('insertText', false, this.triggerChar);
    } else {
      const input = this.#input as HTMLInputElement;
      if ('value' in input) {
        const pos = input.selectionStart ?? input.value.length;
        input.value = input.value.slice(0, pos) + this.triggerChar + input.value.slice(pos);
        input.selectionStart = input.selectionEnd = pos + 1;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  #show(query: string): void {
    if (!this.#listbox) {
      this.#createListbox();
    }

    this.#updateListboxPosition();
    this.#renderOptions(query);

    if (!this.#open) {
      this.#open = true;
      this.#popover.syncPopover(true);
    }

    this.host.dispatchEvent(new CustomEvent(`native:${this.eventPrefix}-query`, {
      bubbles: true,
      composed: true,
      detail: {
        query,
        commands: this.#getFilteredItems(query),
      },
    }));
  }

  #hide(): void {
    if (!this.#open) return;
    this.#open = false;
    this.#currentMatch = null;
    this.#popover.syncPopover(false);
  }

  #selectItem(value: string): void {
    const item = this.#items.find(c => c.value === value);
    if (!item) return;

    const action = item.action ?? 'tag';

    // DOM mutation before hide — hide() clears #currentMatch which the methods need
    switch (action) {
      case 'tag':
        this.#insertTag(item);
        break;
      case 'insert':
        this.#insertText(item);
        break;
      case 'event':
        this.#removeQuery();
        break;
    }

    this.#hide();

    this.host.dispatchEvent(new CustomEvent(`native:${this.eventPrefix}-select`, {
      bubbles: true,
      composed: true,
      detail: { command: item, action },
    }));
  }

  #insertTag(item: TextTriggerItem): void {
    const editable = this.#getEditable();

    if (!editable || !this.#currentMatch) {
      const input = this.#input as HTMLInputElement;
      if ('value' in input) input.value = `${this.triggerChar}${item.value} `;
      return;
    }

    const { triggerNode, triggerOffset, caretOffset } = this.#currentMatch;

    const replaceRange = document.createRange();
    replaceRange.setStart(triggerNode, triggerOffset);
    replaceRange.setEnd(triggerNode, caretOffset);
    replaceRange.deleteContents();

    // Create styled tag span
    const tag = document.createElement('span');
    tag.setAttribute(this.dataAttribute, item.value);
    tag.contentEditable = 'false';
    tag.textContent = this.formatTagText(item);
    this.styleTag(tag, item);

    replaceRange.insertNode(tag);
    this.#tag = tag;

    // Trailing space for continued typing
    const space = document.createTextNode('\u00A0');
    tag.after(space);

    // Place cursor after the space
    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    this.#input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  #insertText(item: TextTriggerItem): void {
    const editable = this.#getEditable();

    if (!editable || !this.#currentMatch) {
      const input = this.#input as HTMLInputElement;
      if ('value' in input) input.value = item.insertText ?? item.label;
      return;
    }

    const { triggerNode, triggerOffset, caretOffset } = this.#currentMatch;

    const replaceRange = document.createRange();
    replaceRange.setStart(triggerNode, triggerOffset);
    replaceRange.setEnd(triggerNode, caretOffset);
    replaceRange.deleteContents();

    const text = item.insertText ?? item.label;
    const textNode = document.createTextNode(text);
    replaceRange.insertNode(textNode);

    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      newRange.setStartAfter(textNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    this.#input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  #removeQuery(): void {
    const editable = this.#getEditable();

    if (!editable || !this.#currentMatch) {
      const input = this.#input as HTMLInputElement;
      const triggerEscaped = this.triggerChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if ('value' in input) input.value = input.value.replace(new RegExp(`${triggerEscaped}\\S*$`), '');
      return;
    }

    const { triggerNode, triggerOffset, caretOffset } = this.#currentMatch;

    const deleteRange = document.createRange();
    deleteRange.setStart(triggerNode, triggerOffset);
    deleteRange.setEnd(triggerNode, caretOffset);
    deleteRange.deleteContents();

    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      newRange.setStart(triggerNode, triggerOffset);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    this.#input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  #setActiveIndex(index: number): void {
    if (!this.#listbox) return;
    const options = this.#listbox.querySelectorAll<HTMLElement>('n-option');
    for (let i = 0; i < options.length; i++) {
      options[i].toggleAttribute('active', i === index);
    }
    this.#activeIndex = index;
    // Scroll the active option into view
    options[index]?.scrollIntoView({ block: 'nearest' });
  }

  #getActiveOption(): HTMLElement | null {
    if (!this.#listbox || this.#activeIndex < 0) return null;
    const options = this.#listbox.querySelectorAll<HTMLElement>('n-option');
    return options[this.#activeIndex] ?? null;
  }

  #getFilteredItems(query: string): TextTriggerItem[] {
    if (!query) return this.#items;
    const lowerQuery = query.toLowerCase();
    return this.#items.filter(c =>
      c.label.toLowerCase().includes(lowerQuery) ||
      c.value.toLowerCase().includes(lowerQuery) ||
      (c.description && c.description.toLowerCase().includes(lowerQuery)),
    );
  }

  #createListbox(): void {
    this.#listbox = document.createElement('n-listbox');
    this.#listbox.setAttribute('popover', 'manual');
    this.#listbox.setAttribute('role', 'listbox');
    this.#listbox.setAttribute('size', 'sm');
    this.#listbox.setAttribute('density', 'compact');
    this.#listbox.setAttribute('virtual-focus', '');
    this.host.appendChild(this.#listbox);

    this.#popover.wirePopover(this.host, this.#listbox);

    const s = this.#listbox.style;
    s.setProperty('position', 'fixed');
    s.setProperty('margin', '0');
    s.setProperty('min-width', '12rem');
    s.setProperty('max-height', 'var(--n-popover-max-height)');
    s.setProperty('overflow-y', 'auto');

    this.#listbox.addEventListener('native:change', this.#onListboxChange);
    this.#listbox.addEventListener('click', this.#onListboxClick);
  }

  #renderOptions(query: string): void {
    if (!this.#listbox) return;

    const filtered = this.#getFilteredItems(query);

    this.#listbox.innerHTML = '';

    for (let i = 0; i < filtered.length; i++) {
      const item = filtered[i];
      const option = document.createElement('n-option');
      option.setAttribute('value', item.value);
      if (i === 0) option.setAttribute('active', '');
      option.style.display = 'flex';
      option.style.alignItems = 'center';

      this.renderOptionContent(option, item);

      this.#listbox.appendChild(option);
    }

    this.#activeIndex = filtered.length > 0 ? 0 : -1;
  }
}
