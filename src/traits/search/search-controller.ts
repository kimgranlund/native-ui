export interface SearchOptions {
  selector: string;
  textField?: string;
  disabled?: boolean;
}

/** Filters child items by a text query, toggling visibility and dispatching `native:search`. */
export class SearchController {
  readonly host: HTMLElement;
  selector: string;
  textField: string;
  disabled: boolean;

  #query = '';
  #attached = false;

  constructor(host: HTMLElement, options: SearchOptions) {
    this.host = host;
    this.selector = options.selector;
    this.textField = options.textField ?? 'textContent';
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
  }

  destroy(): void {
    this.clear();
    this.detach();
  }

  get query(): string { return this.#query; }

  filter(query: string): { matches: HTMLElement[]; hidden: HTMLElement[]; total: number } {
    this.#query = query;
    const items = [...this.host.querySelectorAll<HTMLElement>(this.selector)];
    const total = items.length;
    const matches: HTMLElement[] = [];
    const hidden: HTMLElement[] = [];

    if (!query || this.disabled) {
      // Show all
      for (const item of items) {
        item.removeAttribute('search-hidden');
        item.setAttribute('search-match', '');
        matches.push(item);
      }
      this.host.dispatchEvent(new CustomEvent('native:search', {
        bubbles: true,
        composed: true,
        detail: { query, matchCount: matches.length, total },
      }));
      return { matches, hidden, total };
    }

    const lowerQuery = query.toLowerCase();

    for (const item of items) {
      const text = this.#getText(item).toLowerCase();
      if (text.includes(lowerQuery)) {
        item.removeAttribute('search-hidden');
        item.setAttribute('search-match', '');
        matches.push(item);
      } else {
        item.setAttribute('search-hidden', '');
        item.removeAttribute('search-match');
        hidden.push(item);
      }
    }

    this.host.dispatchEvent(new CustomEvent('native:search', {
      bubbles: true,
      composed: true,
      detail: { query, matchCount: matches.length, total },
    }));

    return { matches, hidden, total };
  }

  clear(): void {
    this.#query = '';
    for (const item of this.host.querySelectorAll<HTMLElement>(this.selector)) {
      item.removeAttribute('search-hidden');
      item.removeAttribute('search-match');
    }
  }

  static highlight(text: string, query: string): string {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  }

  #getText(item: HTMLElement): string {
    if (this.textField === 'textContent') return item.textContent ?? '';
    return item.getAttribute(this.textField) ?? item.textContent ?? '';
  }
}
