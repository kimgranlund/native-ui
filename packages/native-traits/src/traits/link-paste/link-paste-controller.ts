export interface LinkPasteOptions {
  input: HTMLElement;
  /** Disable the controller without destroying it. */
  disabled?: boolean;
}

/** Simple URL pattern — http(s), ftp, or protocol-relative. */
const URL_RE = /^(https?:\/\/|ftp:\/\/|\/\/)\S+$/i;

/**
 * Converts selected text into a hyperlink when a URL is pasted.
 *
 * If the user has text selected in a contenteditable input and pastes clipboard
 * content that looks like a URL, the selected text is wrapped in an `<a>` element
 * pointing to the pasted URL. If no text is selected, the paste proceeds normally.
 *
 * Events:
 * - `native:link-paste` — dispatched on host when a link is created. Detail: `{ url, text, element }`
 */
export class LinkPasteController {
  readonly host: HTMLElement;
  readonly #input: HTMLElement;
  #disabled: boolean;

  constructor(host: HTMLElement, options: LinkPasteOptions) {
    this.host = host;
    this.#input = options.input;
    this.#disabled = options.disabled ?? false;

    this.#input.addEventListener('paste', this.#onPaste, { capture: true });
  }

  get disabled(): boolean { return this.#disabled; }
  set disabled(val: boolean) { this.#disabled = val; }

  // ── Event handlers ──

  #onPaste = (e: Event): void => {
    if (this.#disabled) return;

    const editable = this.#getEditable();
    if (!editable) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);

    // Only act when there is a non-collapsed selection
    if (range.collapsed) return;

    const clipboardEvent = e as ClipboardEvent;
    const pastedText = clipboardEvent.clipboardData?.getData('text/plain')?.trim();
    if (!pastedText) return;

    // Must look like a URL
    if (!URL_RE.test(pastedText)) return;

    // We're handling this paste — prevent default insertion
    clipboardEvent.preventDefault();

    const selectedText = range.toString().trimEnd();

    // Delete the selected text
    range.deleteContents();

    // Create <a> element
    const anchor = document.createElement('a');
    anchor.href = pastedText;
    anchor.textContent = selectedText;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    this.#styleLink(anchor);

    // Insert at deletion point
    range.insertNode(anchor);

    // Place cursor after the link
    const newRange = document.createRange();
    newRange.setStartAfter(anchor);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    this.#input.dispatchEvent(new Event('input', { bubbles: true }));

    this.host.dispatchEvent(new CustomEvent('native:link-paste', {
      bubbles: true,
      composed: true,
      detail: { url: pastedText, text: selectedText, element: anchor },
    }));
  };

  // ── Internal methods ──

  #styleLink(anchor: HTMLElement): void {
    const s = anchor.style;
    s.color = 'var(--n-color-accent-700)';
    s.textDecoration = 'underline';
    s.textUnderlineOffset = '2px';
  }

  #getEditable(): HTMLElement | null {
    if (this.#input.hasAttribute('contenteditable')) return this.#input;
    return this.#input.querySelector<HTMLElement>('[contenteditable]') ?? null;
  }

  destroy(): void {
    this.#input.removeEventListener('paste', this.#onPaste, { capture: true });
  }
}
