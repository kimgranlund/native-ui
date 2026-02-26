export interface DropZoneOptions {
  accept?: string;
  disabled?: boolean;
  multiple?: boolean;
}

/** Handles native drag-and-drop file/data reception, dispatching `ui-drop-enter`, `ui-drop-leave`, and `ui-drop`. */
export class DropZoneController {
  readonly host: HTMLElement;
  accept: string;
  disabled: boolean;
  multiple: boolean;

  #dragCounter = 0;
  #attached = false;

  constructor(host: HTMLElement, options: DropZoneOptions = {}) {
    this.host = host;
    this.accept = options.accept ?? '*';
    this.disabled = options.disabled ?? false;
    this.multiple = options.multiple ?? true;
    this.attach();
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('dragenter', this.#onDragEnter);
    this.host.addEventListener('dragover', this.#onDragOver);
    this.host.addEventListener('dragleave', this.#onDragLeave);
    this.host.addEventListener('drop', this.#onDrop);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('dragenter', this.#onDragEnter);
    this.host.removeEventListener('dragover', this.#onDragOver);
    this.host.removeEventListener('dragleave', this.#onDragLeave);
    this.host.removeEventListener('drop', this.#onDrop);
    this.host.removeAttribute('drop-active');
    this.host.removeAttribute('drop-invalid');
    this.#dragCounter = 0;
  }

  destroy(): void {
    this.detach();
  }

  #matchesMime(dt: DataTransfer): boolean {
    if (this.accept === '*') return true;
    for (const item of dt.items) {
      if (item.type.match(this.accept.replace('*', '.*'))) return true;
    }
    return false;
  }

  #onDragEnter = (e: DragEvent): void => {
    if (this.disabled || !e.dataTransfer) return;
    e.preventDefault();
    this.#dragCounter++;
    if (this.#matchesMime(e.dataTransfer)) {
      this.host.toggleAttribute('drop-active', true);
      this.host.removeAttribute('drop-invalid');
    } else {
      this.host.toggleAttribute('drop-invalid', true);
      this.host.removeAttribute('drop-active');
    }
  };

  #onDragOver = (e: DragEvent): void => {
    if (this.disabled) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  #onDragLeave = (_e: DragEvent): void => {
    this.#dragCounter--;
    if (this.#dragCounter <= 0) {
      this.#dragCounter = 0;
      this.host.removeAttribute('drop-active');
      this.host.removeAttribute('drop-invalid');
    }
  };

  #onDrop = (e: DragEvent): void => {
    e.preventDefault();
    this.#dragCounter = 0;
    this.host.removeAttribute('drop-active');
    this.host.removeAttribute('drop-invalid');

    if (this.disabled || !e.dataTransfer) return;

    // File drop
    if (e.dataTransfer.files.length > 0) {
      let files = Array.from(e.dataTransfer.files);
      if (!this.multiple) files = files.slice(0, 1);
      this.host.dispatchEvent(new CustomEvent('ui-file-drop', {
        bubbles: true, composed: true,
        detail: { files, dataTransfer: e.dataTransfer },
      }));
      return;
    }

    // Text drop
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      this.host.dispatchEvent(new CustomEvent('ui-text-drop', {
        bubbles: true, composed: true,
        detail: { text },
      }));
    }
  };
}
