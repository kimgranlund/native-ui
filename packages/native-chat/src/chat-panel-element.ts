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

    const chatInput = document.createElement('n-chat-input');

    const textarea = document.createElement('n-textarea');
    textarea.setAttribute('placeholder', 'Ask anything');
    textarea.setAttribute('autogrow', '');
    textarea.setAttribute('rows', '3');
    chatInput.appendChild(textarea);

    const actions = document.createElement('n-chat-input-actions');
    const sendBtn = document.createElement('n-button');
    sendBtn.setAttribute('variant', 'primary');
    sendBtn.setAttribute('intent', 'accent');
    sendBtn.textContent = 'Send';
    actions.appendChild(sendBtn);
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
