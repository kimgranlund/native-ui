import { signal } from '@nonoun/native-core';
import { batch } from '@nonoun/native-core';
import type { Signal } from '@nonoun/native-core';

export class SelectController {
  readonly open: Signal<boolean> = signal(false);
  readonly value: Signal<string | null> = signal(null);
  readonly label: Signal<string> = signal('');

  toggle(): void {
    this.open.value = !this.open.value;
  }

  show(): void {
    this.open.value = true;
  }

  hide(): void {
    this.open.value = false;
  }

  select(val: string, label: string): void {
    batch(() => {
      this.value.value = val;
      this.label.value = label;
      this.open.value = false;
    });
  }

  reset(): void {
    batch(() => {
      this.open.value = false;
      this.value.value = null;
      this.label.value = '';
    });
  }
}
