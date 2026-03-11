/**
 * Check if a keyboard event originated from a text-input context.
 * Uses composedPath() to handle shadow DOM retargeting.
 *
 * Returns true if the event target (or any element in the composed path)
 * is an input, textarea, contenteditable, or has role="textbox".
 */
export function isTypingContext(event: KeyboardEvent): boolean {
  const path = event.composedPath();
  for (const el of path) {
    if (!(el instanceof HTMLElement)) continue;
    const tag = el.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return true;
    if (el.isContentEditable) return true;
    if (el.getAttribute('role') === 'textbox') return true;
    // Check for n-input, n-textarea custom elements (contenteditable-based)
    if (tag === 'n-input' || tag === 'n-textarea' || tag === 'n-chat-input') return true;
  }
  return false;
}
