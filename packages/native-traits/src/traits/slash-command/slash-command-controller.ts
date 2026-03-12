import { TextTriggerController } from '../text-trigger/text-trigger-controller.ts';
import type { TextTriggerItem } from '../text-trigger/text-trigger-types.ts';

/** Backward-compatible type alias. */
export type SlashCommand = TextTriggerItem;

export interface SlashCommandOptions {
  input: HTMLElement;
  commands: SlashCommand[];
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
export class SlashCommandController extends TextTriggerController {
  protected get triggerChar(): string { return '/'; }
  protected get eventPrefix(): string { return 'slash'; }
  protected get dataAttribute(): string { return 'data-slash-command'; }
  protected get keyboardShortcut(): string { return '/'; }

  constructor(host: HTMLElement, options: SlashCommandOptions) {
    super(host, { input: options.input, items: options.commands });
  }

  /** Backward-compatible getter. */
  get commands(): SlashCommand[] { return this.items; }
  set commands(val: SlashCommand[]) { this.items = val; }
}
