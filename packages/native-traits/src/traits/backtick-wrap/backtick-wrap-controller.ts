export interface BacktickWrapOptions {
  input: HTMLElement;
  /** Disable the controller without destroying it. */
  disabled?: boolean;
}

/**
 * Watches for paired backtick delimiters in a contenteditable input.
 * When the user types a closing backtick that matches an opening backtick,
 * the text between them is wrapped in a styled `<code>` element.
 *
 * Events:
 * - `native:backtick-wrap` — dispatched on host when text is wrapped. Detail: `{ text, element }`
 */
export class BacktickWrapController {
  readonly host: HTMLElement;
  readonly #input: HTMLElement;
  #disabled: boolean;

  constructor(host: HTMLElement, options: BacktickWrapOptions) {
    this.host = host;
    this.#input = options.input;
    this.#disabled = options.disabled ?? false;

    this.host.addEventListener('native:input', this.#onInput);
    this.#input.addEventListener('keydown', this.#onKeydown);
  }

  get disabled(): boolean { return this.#disabled; }
  set disabled(val: boolean) { this.#disabled = val; }

  // ── Event handlers ──

  #onKeydown = (e: Event): void => {
    if (this.#disabled) return;

    const ke = e as KeyboardEvent;
    // Only care about the backtick key
    if (ke.key !== '`') return;
    // Ignore with modifiers (Cmd+`, Ctrl+`, etc.)
    if (ke.metaKey || ke.ctrlKey || ke.altKey) return;

    const editable = this.#getEditable();
    if (!editable) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);

    // If there's a selection, wrap it (like Cmd+E but triggered by backtick)
    if (!range.collapsed) {
      ke.preventDefault();
      this.#wrapSelection(editable, sel, range);
      return;
    }

    // For collapsed caret: check if there's an opening backtick to pair with
    const focusNode = sel.focusNode;
    if (!focusNode || focusNode.nodeType !== Node.TEXT_NODE) return;
    if (!editable.contains(focusNode)) return;

    const text = focusNode.textContent ?? '';
    const caretOffset = sel.focusOffset;

    // Walk backward to find an unmatched opening backtick
    const openOffset = this.#findOpeningBacktick(text, caretOffset);
    if (openOffset === -1) return;

    // Text between opening backtick and caret
    const innerText = text.slice(openOffset + 1, caretOffset);
    if (innerText.length === 0) return; // Empty backtick pair — let it type normally

    ke.preventDefault();
    this.#wrapBacktickPair(editable, focusNode as Text, openOffset, caretOffset, innerText);
  };

  #onInput = (): void => {
    // Reserved for future: could detect backtick pairs after paste events
  };

  // ── Internal methods ──

  /** Find an unmatched opening backtick before the caret position. */
  #findOpeningBacktick(text: string, caretOffset: number): number {
    // Walk backward from caret to find a backtick
    for (let i = caretOffset - 1; i >= 0; i--) {
      if (text[i] === '`') return i;
      // Don't cross newlines — backtick pairs are single-line
      if (text[i] === '\n') return -1;
    }
    return -1;
  }

  /** Wrap text between an opening backtick and the caret (closing backtick). */
  #wrapBacktickPair(
    _editable: HTMLElement,
    textNode: Text,
    openOffset: number,
    caretOffset: number,
    innerText: string,
  ): void {
    // Delete from opening backtick through caret (the closing backtick hasn't been inserted yet)
    const deleteRange = document.createRange();
    deleteRange.setStart(textNode, openOffset);
    deleteRange.setEnd(textNode, caretOffset);
    deleteRange.deleteContents();

    // Create <code> element
    const code = document.createElement('code');
    code.textContent = innerText;
    code.contentEditable = 'false';
    this.#styleCode(code);

    // Insert at deletion point
    deleteRange.insertNode(code);

    // Trailing space for continued typing
    const space = document.createTextNode('\u00A0');
    code.after(space);

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

    this.host.dispatchEvent(new CustomEvent('native:backtick-wrap', {
      bubbles: true,
      composed: true,
      detail: { text: innerText, element: code },
    }));
  }

  /** Wrap the current text selection in a <code> element. */
  #wrapSelection(_editable: HTMLElement, sel: Selection, range: Range): void {
    const selectedText = range.toString();
    if (!selectedText) return;

    // Delete selection
    range.deleteContents();

    // Create <code> element
    const code = document.createElement('code');
    code.textContent = selectedText;
    code.contentEditable = 'false';
    this.#styleCode(code);

    range.insertNode(code);

    // Trailing space for continued typing
    const space = document.createTextNode('\u00A0');
    code.after(space);

    // Place cursor after the space
    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    this.#input.dispatchEvent(new Event('input', { bubbles: true }));

    this.host.dispatchEvent(new CustomEvent('native:backtick-wrap', {
      bubbles: true,
      composed: true,
      detail: { text: selectedText, element: code },
    }));
  }

  #styleCode(code: HTMLElement): void {
    const s = code.style;
    s.fontFamily = 'var(--n-font-family-mono)';
    s.fontSize = '0.875em';
    s.background = 'var(--n-surface)';
    s.color = 'var(--n-surface-ink)';
    s.borderRadius = 'calc(var(--n-radius) * 0.5)';
    s.padding = '0.1em 0.3em';
    s.userSelect = 'all';
  }

  #getEditable(): HTMLElement | null {
    if (this.#input.hasAttribute('contenteditable')) return this.#input;
    return this.#input.querySelector<HTMLElement>('[contenteditable]') ?? null;
  }

  destroy(): void {
    this.host.removeEventListener('native:input', this.#onInput);
    this.#input.removeEventListener('keydown', this.#onKeydown);
  }
}
