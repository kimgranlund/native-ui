import { PopoverController } from './popover-controller.ts';

export interface SlashCommand {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface SlashCommandOptions {
  input: HTMLElement;
  commands: SlashCommand[];
}

/**
 * Detects `/` prefix at the start of an input's value, shows an anchored command
 * listbox popover, filters by query, and dispatches selection events.
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
    // If open, re-render with new commands
    if (this.#open) {
      const query = this.#extractQuery();
      this.#renderOptions(query);
    }
  }

  get open(): boolean { return this.#open; }

  // ── Event handlers (arrow functions for auto-bind) ──

  #onInput = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    const value: string = detail?.value ?? '';

    if (value.startsWith('/')) {
      const query = value.slice(1);
      this.#show(query);
    } else {
      this.#hide();
    }
  };

  #onKeydown = (e: Event): void => {
    const key = (e as KeyboardEvent).key;

    if (key === 'Escape' && this.#open) {
      e.preventDefault();
      this.#hide();
      return;
    }

    if (key === 'Enter' && this.#open) {
      e.preventDefault();
      const active = this.#listbox?.querySelector<HTMLElement>('[active]');
      if (active) {
        const value = active.getAttribute('value') ?? '';
        this.#selectCommand(value);
      }
      return;
    }

    // Delegate arrow keys to the listbox for built-in keyboard navigation
    if ((key === 'ArrowDown' || key === 'ArrowUp') && this.#open && this.#listbox) {
      e.preventDefault();
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

  #extractQuery(): string {
    // Attempt to read current value from input
    const inputEl = this.#input as HTMLInputElement;
    const value = inputEl.value ?? (this.#input as HTMLElement).textContent ?? '';
    if (value.startsWith('/')) return value.slice(1);
    return '';
  }

  #show(query: string): void {
    if (!this.#listbox) {
      this.#createListbox();
    }

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
    this.#popover.syncPopover(false);
  }

  #selectCommand(value: string): void {
    const command = this.#commands.find(c => c.value === value);
    if (!command) return;

    this.#hide();

    // Clear the input value (remove the /query text)
    this.#clearInput();

    this.host.dispatchEvent(new CustomEvent('native:slash-select', {
      bubbles: true,
      composed: true,
      detail: { command },
    }));
  }

  #clearInput(): void {
    const inputEl = this.#input as HTMLInputElement;
    if ('value' in inputEl) {
      inputEl.value = '';
    }
    // Also set textContent for contenteditable elements (n-input, n-textarea)
    if (this.#input.hasAttribute('contenteditable') || this.#input.tagName === 'N-INPUT' || this.#input.tagName === 'N-TEXTAREA') {
      this.#input.textContent = '';
    }
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
    this.host.appendChild(this.#listbox);

    this.#popover.wirePopover(this.#input, this.#listbox);
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
      option.textContent = cmd.label;
      if (cmd.description) {
        option.setAttribute('title', cmd.description);
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

    this.#popover.destroy();
  }
}
