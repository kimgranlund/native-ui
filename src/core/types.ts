export interface Lifecycle {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  setup?(): void;
  teardown?(): void;
  attributeChangedCallback?(name: string, old: string | null, val: string | null): void;
}

// WHY: any[] required for mixin constructor constraints
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T extends HTMLElement & Lifecycle = HTMLElement & Lifecycle> =
  new (...args: any[]) => T;
