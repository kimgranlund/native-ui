import { signal } from '../reactivity/signal.ts';
import { computed } from '../reactivity/computed.ts';
import type { Signal, ReadonlySignal, Dispose } from '../reactivity/types.ts';
import type { Shortcut } from './types.ts';

interface ShortcutEntry {
  readonly shortcut: Shortcut;
  readonly id: number;
}

let nextId = 0;

export class FocusRouter {
  #shortcuts: ShortcutEntry[] = [];
  #scopeStack: Signal<string[]> = signal(['global']);
  #listenersAttached = false;

  readonly activeScope: ReadonlySignal<string> = computed(() => {
    const stack = this.#scopeStack.value;
    return stack[stack.length - 1]!;
  });

  register(shortcut: Shortcut): Dispose {
    const entry: ShortcutEntry = { shortcut, id: nextId++ };
    this.#shortcuts.push(entry);
    this.#attachGlobalListener();

    return () => {
      const idx = this.#shortcuts.findIndex((e) => e.id === entry.id);
      if (idx !== -1) this.#shortcuts.splice(idx, 1);
      if (this.#shortcuts.length === 0) this.#detachGlobalListener();
    };
  }

  pushScope(name: string): void {
    this.#scopeStack.value = [...this.#scopeStack.value, name];
  }

  popScope(): void {
    const stack = this.#scopeStack.value;
    // Never pop the 'global' base scope
    if (stack.length <= 1) return;
    this.#scopeStack.value = stack.slice(0, -1);
  }

  getShortcuts(scope?: string): readonly Shortcut[] {
    if (scope === undefined) {
      return this.#shortcuts.map((e) => e.shortcut);
    }
    return this.#shortcuts
      .filter((e) => (e.shortcut.scope ?? 'global') === scope)
      .map((e) => e.shortcut);
  }

  destroy(): void {
    this.#shortcuts = [];
    this.#scopeStack.value = ['global'];
    this.#detachGlobalListener();
  }

  #attachGlobalListener(): void {
    if (this.#listenersAttached) return;
    document.addEventListener('keydown', this.#onKeyDown, true);
    this.#listenersAttached = true;
  }

  #detachGlobalListener(): void {
    if (!this.#listenersAttached) return;
    document.removeEventListener('keydown', this.#onKeyDown, true);
    this.#listenersAttached = false;
  }

  #onKeyDown = (e: KeyboardEvent): void => {
    // Don't intercept events from inputs/textareas/contenteditables
    const target = e.target as HTMLElement;
    if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    const currentScope = this.activeScope.peek();

    for (const entry of this.#shortcuts) {
      const s = entry.shortcut;
      const scope = s.scope ?? 'global';

      // Only match shortcuts in current scope or 'global' scope
      if (scope !== currentScope && scope !== 'global') continue;

      if (!this.#matchesKey(e, s)) continue;

      e.preventDefault();
      e.stopPropagation();
      s.handler(e);
      return;
    }
  };

  #matchesKey(e: KeyboardEvent, s: Shortcut): boolean {
    if (e.key !== s.key) return false;

    const mod = s.mod;
    if (!mod) {
      // No modifiers required — event must not have any
      return !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
    }

    if (!!mod.ctrl !== e.ctrlKey) return false;
    if (!!mod.meta !== e.metaKey) return false;
    if (!!mod.shift !== e.shiftKey) return false;
    if (!!mod.alt !== e.altKey) return false;

    return true;
  }
}

export function createFocusRouter(): FocusRouter {
  return new FocusRouter();
}
