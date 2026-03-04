import { NativeElement } from '@nonoun/native-ui';

/**
 * Message group — cluster of messages from the same sender.
 *
 * Provides alignment (user = right, assistant/system = left) and
 * groups an avatar + message column.
 *
 * ```html
 * <n-chat-messages role="user" sender="Kim">
 *   <n-chat-avatar name="Kim"></n-chat-avatar>
 *   <n-chat-message role="user" message-id="1">
 *     <n-chat-message-text>Hello!</n-chat-message-text>
 *   </n-chat-message>
 * </n-chat-messages>
 * ```
 *
 * @attr {string} role - `user` | `assistant` | `system`
 * @attr {string} sender - Display name of the sender
 * @attr {string} avatar-align - `"top"` (default) | `"center"` | `"bottom"` — avatar vertical alignment
 */
export class NChatMessages extends NativeElement {
  static observedAttributes = ['role', 'sender', 'avatar-align'];

  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    super.attributeChangedCallback(name, old, val);
  }

  setup(): void {
    super.setup();
    this.#internals.role = 'group';
    const sender = this.getAttribute('sender');
    if (sender) {
      this.#internals.ariaLabel = `Messages from ${sender}`;
    }
  }

  teardown(): void {
    super.teardown();
  }
}
