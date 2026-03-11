import { signal, computed, batch } from '@nonoun/native-ui';
import type { Signal, ReadonlySignal } from '@nonoun/native-ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewMode = 'preview' | 'source';

export const DEFAULT_TOOLBAR = [
  'bold', 'italic', 'code', '|',
  'h1', 'h2', 'h3', '|',
  'bullet-list', 'ordered-list', 'blockquote', '|',
  'link', 'image', '|',
  'mode-toggle',
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export class EditorStore {
  readonly mode: Signal<ViewMode> = signal<ViewMode>('preview');
  readonly disabled: Signal<boolean> = signal(false);
  readonly readonly: Signal<boolean> = signal(false);
  readonly placeholder: Signal<string> = signal('');
  readonly toolbar: Signal<string[]> = signal(DEFAULT_TOOLBAR);
  readonly src: Signal<string | null> = signal(null);

  /** True when disabled OR readonly — drives CodeMirror readOnly + editable. */
  readonly locked: ReadonlySignal<boolean> = computed(
    () => this.disabled.value || this.readonly.value,
  );

  // ── Actions ──

  setMode(mode: ViewMode): void {
    if (mode !== 'preview' && mode !== 'source') return;
    this.mode.value = mode;
  }

  toggleMode(): void {
    this.mode.value = this.mode.value === 'preview' ? 'source' : 'preview';
  }

  setToolbar(val: string | string[]): void {
    this.toolbar.value = typeof val === 'string'
      ? val.split(',').map((s) => s.trim()).filter(Boolean)
      : val;
  }

  reset(): void {
    batch(() => {
      this.mode.value = 'preview';
      this.disabled.value = false;
      this.readonly.value = false;
      this.placeholder.value = '';
      this.toolbar.value = DEFAULT_TOOLBAR;
      this.src.value = null;
    });
  }
}
