import { PopoverController } from './popover-controller.ts';

export interface SlashCommand {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  /** Action when selected: 'tag' (styled pill, default), 'insert' (plain text), 'event' (host handles). */
  action?: 'tag' | 'insert' | 'event';
  /** Text to insert for action 'insert'. Defaults to label if omitted. */
  insertText?: string;
}

export interface SlashCommandOptions {
  input: HTMLElement;
  commands: SlashCommand[];
}

interface SlashMatch {
  query: string;
  slashNode: Text;
  slashOffset: number;
  caretOffset: number;
}

/**
 * Detects `/` at the caret position (preceded by whitespace or at text start),
 * shows a caret-anchored command listbox popover, filters by query, and
 * dispatches selection events. Works anywhere in the text, not just at the start.
 *
 * Events:
 * - `native:slash-query` — dispatched on host when typing after `/`. Detail: `{ query, commands }`
 * - `native:slash-select` — dispatched on host when a command is selected. Detail: `{ command }`
 */
export class SlashCommandController {
  readonly host: HTMLElement;
  readonly #input: HTMLElement;
  #commands: SlashCommand[];
  #popover: PopoverController;
  #listbox: HTMLElement | null = null;
  #tag: HTMLElement | null = null;
  #currentSlash: SlashMatch | null = null;
  #open = false;

  constructor(host: HTMLElement, options: SlashCommandOptions) {
    this.host = host;
    this.#input = options.input;
    this.#commands = options.commands;
    this.#popover = new PopoverController(host);

    this.host.addEventListener('native:input', this.#onInput);
    this.#input.addEventListener('keydown', this.#onKeydown);
    this.host.addEventListener('native:dismiss', this.#onDismiss);
  }

  get commands(): SlashCommand[] { return this.#commands; }
  set commands(val: SlashCommand[]) {
    this.#commands = val;
    if (this.#open) {
      const query = this.#currentSlash?.query ?? '';
      this.#renderOptions(query);
    }
  }

  get open(): boolean { return this.#open; }

  // ── Caret-based slash detection ──

  #detectSlashAtCaret(): SlashMatch | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    if (!range.collapsed) return null;

    const focusNode = sel.focusNode;
    if (!focusNode || focusNode.nodeType !== Node.TEXT_NODE) return null;

    // Ensure the caret is inside our input (or its contenteditable surface)
    const editable = this.#getEditable();
    if (!editable || !editable.contains(focusNode)) return null;

    const text = focusNode.textContent ?? '';
    const caretOffset = sel.focusOffset;

    // Walk backward from caret to find '/'
    for (let i = caretOffset - 1; i >= 0; i--) {
      const ch = text[i];
      if (ch === '/') {
        // Valid if preceded by whitespace or at the start of editable text
        const precededByWhitespace = i > 0 && /\s/.test(text[i - 1]);
        const atNodeStart = i === 0;

        // If at node start, verify no non-whitespace text precedes in the editable
        const atEditableStart = atNodeStart && this.#isFirstTextPosition(editable, focusNode);

        if (precededByWhitespace || atEditableStart) {
          const query = text.slice(i + 1, caretOffset);
          return { query, slashNode: focusNode as Text, slashOffset: i, caretOffset };
        }
        return null;
      }
      // Hit whitespace before finding '/' — no match
      if (/\s/.test(ch)) return null;
    }
    return null;
  }

  /** Check if a text node is at the first text position of the editable. */
  #isFirstTextPosition(editable: HTMLElement, node: Node): boolean {
    const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
    let first = walker.nextNode();
    // Skip empty text nodes
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

  /** Position the listbox directly at the caret using fixed coordinates. */
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

    const result = this.#detectSlashAtCaret();
    if (result) {
      this.#currentSlash = result;
      this.#show(result.query);
    } else {
      this.#currentSlash = null;
      this.#hide();
    }
  };

  #onKeydown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const key = ke.key;

    // Cmd+/ (macOS) or Ctrl+/ — insert / at caret and open popover
    if ((ke.metaKey || ke.ctrlKey) && key === '/') {
      ke.preventDefault();
      if (this.#open) {
        this.#hide();
      } else {
        this.#insertSlashAtCaret();
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
      const active = this.#listbox?.querySelector<HTMLElement>('[active]');
      if (active) {
        const value = active.getAttribute('value') ?? '';
        this.#selectCommand(value);
      }
      return;
    }

    // Tab selects closest match when query has 2+ characters
    if (key === 'Tab' && this.#open) {
      const query = this.#currentSlash?.query ?? '';
      if (query.length >= 2) {
        ke.preventDefault();
        const active = this.#listbox?.querySelector<HTMLElement>('[active]');
        const first = this.#listbox?.querySelector<HTMLElement>('n-option');
        const target = active ?? first;
        if (target) {
          const value = target.getAttribute('value') ?? '';
          this.#selectCommand(value);
        }
      }
      return;
    }

    // Delegate arrow keys to the listbox for built-in keyboard navigation
    if ((key === 'ArrowDown' || key === 'ArrowUp') && this.#open && this.#listbox) {
      ke.preventDefault();
      this.#listbox.dispatchEvent(new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      }));
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
      this.#selectCommand(value);
    }
  };

  // ── Internal methods ──

  /** Insert a `/` character at the current caret position for Cmd+/ shortcut. */
  #insertSlashAtCaret(): void {
    this.#input.focus();

    const editable = this.#getEditable();
    if (editable) {
      // Insert '/' via execCommand for contenteditable (fires input event natively)
      document.execCommand('insertText', false, '/');
    } else {
      // Fallback for native inputs
      const input = this.#input as HTMLInputElement;
      if ('value' in input) {
        const pos = input.selectionStart ?? input.value.length;
        input.value = input.value.slice(0, pos) + '/' + input.value.slice(pos);
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

    this.host.dispatchEvent(new CustomEvent('native:slash-query', {
      bubbles: true,
      composed: true,
      detail: {
        query,
        commands: this.#getFilteredCommands(query),
      },
    }));
  }

  #hide(): void {
    if (!this.#open) return;
    this.#open = false;
    this.#currentSlash = null;
    this.#popover.syncPopover(false);
  }

  #selectCommand(value: string): void {
    const command = this.#commands.find(c => c.value === value);
    if (!command) return;

    const action = command.action ?? 'tag';

    // WHY: DOM mutation before hide — hide() clears #currentSlash which the methods need
    switch (action) {
      case 'tag':
        this.#insertTag(command);
        break;
      case 'insert':
        this.#insertText(command);
        break;
      case 'event':
        this.#removeSlashQuery();
        break;
    }

    this.#hide();

    this.host.dispatchEvent(new CustomEvent('native:slash-select', {
      bubbles: true,
      composed: true,
      detail: { command, action },
    }));
  }

  #insertTag(command: SlashCommand): void {
    const editable = this.#getEditable();

    if (!editable || !this.#currentSlash) {
      // Fallback for native inputs or missing slash context
      const input = this.#input as HTMLInputElement;
      if ('value' in input) input.value = `/${command.value} `;
      return;
    }

    const { slashNode, slashOffset, caretOffset } = this.#currentSlash;

    // Replace the /query text range with the tag span
    const replaceRange = document.createRange();
    replaceRange.setStart(slashNode, slashOffset);
    replaceRange.setEnd(slashNode, caretOffset);
    replaceRange.deleteContents();

    // Create styled tag span
    const tag = document.createElement('span');
    tag.setAttribute('data-slash-command', command.value);
    tag.contentEditable = 'false';
    tag.textContent = `/${command.value}`;

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

    // Insert tag at the deletion point
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

    // Trigger input event so the host element syncs state (form value, empty state)
    this.#input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /** Replace /query with plain text (for action: 'insert'). */
  #insertText(command: SlashCommand): void {
    const editable = this.#getEditable();

    if (!editable || !this.#currentSlash) {
      const input = this.#input as HTMLInputElement;
      if ('value' in input) input.value = command.insertText ?? command.label;
      return;
    }

    const { slashNode, slashOffset, caretOffset } = this.#currentSlash;

    const replaceRange = document.createRange();
    replaceRange.setStart(slashNode, slashOffset);
    replaceRange.setEnd(slashNode, caretOffset);
    replaceRange.deleteContents();

    const text = command.insertText ?? command.label;
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

  /** Remove /query text without inserting anything (for action: 'event'). */
  #removeSlashQuery(): void {
    const editable = this.#getEditable();

    if (!editable || !this.#currentSlash) {
      const input = this.#input as HTMLInputElement;
      if ('value' in input) input.value = input.value.replace(/\/\S*$/, '');
      return;
    }

    const { slashNode, slashOffset, caretOffset } = this.#currentSlash;

    const deleteRange = document.createRange();
    deleteRange.setStart(slashNode, slashOffset);
    deleteRange.setEnd(slashNode, caretOffset);
    deleteRange.deleteContents();

    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      newRange.setStart(slashNode, slashOffset);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    this.#input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  #getFilteredCommands(query: string): SlashCommand[] {
    if (!query) return this.#commands;
    const lowerQuery = query.toLowerCase();
    return this.#commands.filter(c =>
      c.label.toLowerCase().includes(lowerQuery) ||
      c.value.toLowerCase().includes(lowerQuery) ||
      (c.description && c.description.toLowerCase().includes(lowerQuery))
    );
  }

  #createListbox(): void {
    this.#listbox = document.createElement('n-listbox');
    this.#listbox.setAttribute('popover', 'manual');
    this.#listbox.setAttribute('role', 'listbox');
    this.#listbox.setAttribute('size', 'sm');
    this.#listbox.setAttribute('density', 'compact');
    this.host.appendChild(this.#listbox);

    // WHY: wirePopover sets #popoverEl so syncPopover() can show/hide + dismiss layer.
    // We don't use CSS anchor positioning — position is set directly via #updateListboxPosition.
    this.#popover.wirePopover(this.host, this.#listbox);

    const s = this.#listbox.style;
    s.setProperty('position', 'fixed');
    s.setProperty('margin', '0');
    s.setProperty('min-width', '12rem');
    s.setProperty('max-height', 'var(--n-popover-max-height)');
    s.setProperty('overflow-y', 'auto');

    this.#listbox.addEventListener('native:change', this.#onListboxChange);
  }

  #renderOptions(query: string): void {
    if (!this.#listbox) return;

    const filtered = this.#getFilteredCommands(query);

    // Clear existing options
    this.#listbox.innerHTML = '';

    for (const cmd of filtered) {
      const option = document.createElement('n-option');
      option.setAttribute('value', cmd.value);
      option.style.display = 'flex';
      option.style.alignItems = 'center';

      const labelSpan = document.createElement('span');
      labelSpan.textContent = cmd.label;
      option.appendChild(labelSpan);

      if (cmd.description) {
        option.setAttribute('title', cmd.description);
        const descSpan = document.createElement('span');
        descSpan.textContent = cmd.description;
        const ds = descSpan.style;
        ds.marginInlineStart = 'auto';
        ds.paddingInlineStart = '0.75em';
        ds.fontSize = '0.75em';
        ds.color = 'var(--n-ink-muted)';
        ds.fontWeight = '400';
        option.appendChild(descSpan);
      }

      this.#listbox.appendChild(option);
    }
  }

  destroy(): void {
    this.#hide();

    this.host.removeEventListener('native:input', this.#onInput);
    this.#input.removeEventListener('keydown', this.#onKeydown);
    this.host.removeEventListener('native:dismiss', this.#onDismiss);

    if (this.#listbox) {
      this.#listbox.removeEventListener('native:change', this.#onListboxChange);
      this.#listbox.remove();
      this.#listbox = null;
    }

    this.#tag = null;
    this.#currentSlash = null;
    this.#popover.destroy();
  }
}
