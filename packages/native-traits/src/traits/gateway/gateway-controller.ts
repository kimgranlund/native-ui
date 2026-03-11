import { signal } from '@nonoun/native-core';
import type { Signal } from '@nonoun/native-core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GatewayOptions {
  /** Parse the fetch response into a string. Default: `res.text()` */
  parse?: (res: Response) => Promise<string>;
  /** Build the save request body from content. Default: plain text body */
  serialize?: (content: string) => BodyInit;
  /** Content-Type header for save requests. Default: `text/plain` */
  contentType?: string;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class GatewayController {
  readonly host: HTMLElement;

  /** True while a load request is in-flight. */
  readonly loading: Signal<boolean>;
  /** True while a save request is in-flight. */
  readonly saving: Signal<boolean>;
  /** Last error message, or null. */
  readonly error: Signal<string | null>;
  /** True when content has changed since the last load or save. */
  readonly dirty: Signal<boolean>;

  #loadController: AbortController | null = null;
  #saveController: AbortController | null = null;

  #parse: (res: Response) => Promise<string>;
  #serialize: (content: string) => BodyInit;
  #contentType: string;

  constructor(host: HTMLElement, options: GatewayOptions = {}) {
    this.host = host;
    this.loading = signal(false);
    this.saving = signal(false);
    this.error = signal<string | null>(null);
    this.dirty = signal(false);

    this.#parse = options.parse ?? ((res) => res.text());
    this.#serialize = options.serialize ?? ((content) => content);
    this.#contentType = options.contentType ?? 'text/plain';
  }

  // ── Load ──

  async load(url: string): Promise<string | null> {
    this.#loadController?.abort();
    const controller = new AbortController();
    this.#loadController = controller;

    this.loading.value = true;
    this.error.value = null;

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (controller.signal.aborted) return null;

      if (!res.ok) {
        this.error.value = `Load failed (${res.status})`;
        this.loading.value = false;
        return null;
      }

      const content = await this.#parse(res);
      if (controller.signal.aborted) return null;

      this.loading.value = false;
      this.dirty.value = false;
      return content;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      this.error.value = err instanceof Error ? err.message : 'Load failed';
      this.loading.value = false;
      return null;
    }
  }

  // ── Save ──

  async save(url: string, content: string): Promise<boolean> {
    this.#saveController?.abort();
    const controller = new AbortController();
    this.#saveController = controller;

    this.saving.value = true;
    this.error.value = null;

    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': this.#contentType },
        body: this.#serialize(content),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return false;

      if (!res.ok) {
        this.error.value = `Save failed (${res.status})`;
        this.saving.value = false;
        return false;
      }

      this.saving.value = false;
      this.dirty.value = false;
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      this.error.value = err instanceof Error ? err.message : 'Save failed';
      this.saving.value = false;
      return false;
    }
  }

  // ── Dirty Tracking ──

  markDirty(): void {
    this.dirty.value = true;
  }

  markClean(): void {
    this.dirty.value = false;
  }

  // ── Cleanup ──

  abort(): void {
    this.#loadController?.abort();
    this.#loadController = null;
    this.#saveController?.abort();
    this.#saveController = null;
  }

  destroy(): void {
    this.abort();
  }
}
