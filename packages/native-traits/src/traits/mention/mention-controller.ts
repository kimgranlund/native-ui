import { TextTriggerController } from '../text-trigger/text-trigger-controller.ts';
import type { TextTriggerItem } from '../text-trigger/text-trigger-types.ts';

export interface MentionItem extends TextTriggerItem {
  /** Optional avatar URL for display in the listbox. */
  avatar?: string;
}

export interface MentionOptions {
  input: HTMLElement;
  items: MentionItem[];
}

/**
 * Detects `@` at the caret position (preceded by whitespace or at text start),
 * shows a caret-anchored mention listbox popover, filters by query, and
 * dispatches selection events.
 *
 * Events:
 * - `native:mention-query` — dispatched on host when typing after `@`. Detail: `{ query, commands }`
 * - `native:mention-select` — dispatched on host when a mention is selected. Detail: `{ command }`
 */
export class MentionController extends TextTriggerController {
  protected get triggerChar(): string { return '@'; }
  protected get eventPrefix(): string { return 'mention'; }
  protected get dataAttribute(): string { return 'data-mention'; }

  constructor(host: HTMLElement, options: MentionOptions) {
    super(host, { input: options.input, items: options.items });
  }

  /** Tag displays `@label` (display name), not `@value` (ID). */
  protected formatTagText(item: TextTriggerItem): string {
    return `@${item.label}`;
  }

  /** Mention tags use accent color styling. */
  protected styleTag(tag: HTMLElement, _item: TextTriggerItem): void {
    const s = tag.style;
    s.display = 'inline';
    s.background = 'var(--n-color-accent-100)';
    s.color = 'var(--n-color-accent-700)';
    s.borderRadius = 'calc(var(--n-radius) * 0.5)';
    s.padding = '0 0.3em';
    s.fontSize = '0.8125em';
    s.fontWeight = '500';
    s.lineHeight = '1.25';
    s.verticalAlign = 'baseline';
    s.userSelect = 'all';
  }

  /** Render avatar + label in listbox options. */
  protected renderOptionContent(option: HTMLElement, item: TextTriggerItem): void {
    const mentionItem = item as MentionItem;

    if (mentionItem.avatar) {
      const avatar = document.createElement('n-avatar');
      avatar.setAttribute('size', 'xs');
      avatar.setAttribute('src', mentionItem.avatar);
      avatar.style.marginInlineEnd = '0.5em';
      option.appendChild(avatar);
    }

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
}
