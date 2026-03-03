import { NativeElement } from '@nonoun/native-ui';

/**
 * Stamped panel for the chat interface.
 *
 * Creates `<n-header>` (icon, title), `<n-body>` containing
 * `<n-chat-content>`, and `<n-footer>` with `<n-chat-input>` directly
 * as children. The host element itself is the panel surface.
 *
 * Usage:
 * ```html
 * <native-chat-panel></native-chat-panel>
 * ```
 *
 * Listen for messages:
 * ```js
 * panel.addEventListener('native:send', (e) => {
 *   console.log(e.detail.value);
 * });
 * ```
 */
export class NChatPanel extends NativeElement {
  setup(): void {
    super.setup();

    // ── Header ──
    const header = document.createElement('n-header');
    header.setAttribute('dividers', '');

    const icon = document.createElement('n-icon');
    icon.setAttribute('name', 'chat-dots');
    icon.setAttribute('slot', 'leading');
    header.appendChild(icon);

    const label = document.createElement('span');
    label.setAttribute('slot', 'label');
    label.textContent = 'Assistant';
    header.appendChild(label);

    // ── Body ──
    const body = document.createElement('n-body');
    const chatContent = document.createElement('n-chat-content');
    body.appendChild(chatContent);

    // ── Footer ──
    const footer = document.createElement('n-footer');
    footer.setAttribute('dividers', '');
    footer.setAttribute('padding', 'none');

    const chatInput = document.createElement('n-chat-input');
    chatInput.setAttribute('variant', 'plain');

    const textarea = document.createElement('n-textarea');
    textarea.setAttribute('placeholder', 'Ask anything');
    textarea.setAttribute('autogrow', '');
    textarea.setAttribute('rows', '3');
    chatInput.appendChild(textarea);

    const actions = document.createElement('n-chat-input-actions');

    const plusBtn = document.createElement('n-button');
    plusBtn.setAttribute('variant', 'ghost');
    plusBtn.setAttribute('inline', '');
    plusBtn.innerHTML = '<n-icon name="plus"></n-icon>';
    actions.appendChild(plusBtn);

    const micBtn = document.createElement('n-button');
    micBtn.setAttribute('variant', 'ghost');
    micBtn.setAttribute('inline', '');
    micBtn.innerHTML = '<n-icon name="microphone"></n-icon>';
    actions.appendChild(micBtn);

    const submitBtn = document.createElement('n-button');
    submitBtn.setAttribute('variant', 'primary');
    submitBtn.setAttribute('intent', 'accent');
    submitBtn.setAttribute('radius', 'round');
    submitBtn.setAttribute('inline', '');
    submitBtn.setAttribute('disabled', '');
    submitBtn.classList.add('submit-btn');
    submitBtn.innerHTML = '<n-icon name="arrow-up"></n-icon>';
    actions.appendChild(submitBtn);

    chatInput.appendChild(actions);

    footer.appendChild(chatInput);

    // ── Assemble ──
    this.append(header, body, footer);
  }

  teardown(): void {
    this.innerHTML = '';
    super.teardown();
  }
}
