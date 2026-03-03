import { NativeElement, signal } from '@nonoun/native-ui';

/**
 * Streaming activity indicator — typing, thinking, or tool-use status.
 *
 * When `active`, shows an animated indicator with elapsed time.
 * When `expandable`, clicking toggles visibility of slotted trace content.
 *
 * ```html
 * <n-chat-message-activity type="thinking" active>
 *   <pre>Reasoning trace here...</pre>
 * </n-chat-message-activity>
 * ```
 *
 * @attr {string} type - `typing` | `thinking` | `tool-use`
 * @attr {string} label - Custom label text (overrides default per-type label)
 * @attr {boolean} active - Currently streaming / in progress
 * @attr {boolean} expandable - Allow click to expand trace content
 * @fires native:activity-toggle - Fired when trace is expanded/collapsed
 */
export class NChatMessageActivity extends NativeElement {
  static observedAttributes = ['type', 'label', 'active', 'expandable'];

  #internals: ElementInternals;
  #type = signal<string>('typing');
  #label = signal<string>('');
  #active = signal(false);
  #expandable = signal(false);
  #expanded = signal(false);
  #startTime = 0;
  #timerFrame = 0;
  #statusEl: HTMLElement | null = null;
  #timeEl: HTMLElement | null = null;
  #dotsEl: HTMLElement | null = null;
  #contentEl: HTMLElement | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  // ── Public API ──

  get active(): boolean { return this.#active.value; }
  set active(val: boolean) {
    this.#active.value = val;
    this.toggleAttribute('active', val);
  }

  get expanded(): boolean { return this.#expanded.value; }
  set expanded(val: boolean) {
    this.#expanded.value = val;
    this.toggleAttribute('expanded', val);
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'type': this.#type.value = val ?? 'typing'; break;
      case 'label': this.#label.value = val ?? ''; break;
      case 'active': this.#active.value = val !== null; break;
      case 'expandable': this.#expandable.value = val !== null; break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // Stamp DOM
    this.#stamp();

    // Timer: start/stop based on active
    this.addEffect(() => {
      if (this.#active.value) {
        this.#startTimer();
        this.#internals.states.add('active');
      } else {
        this.#stopTimer();
        this.#internals.states.delete('active');
      }
    });

    // Label sync
    this.addEffect(() => {
      if (!this.#statusEl) return;
      const label = this.#label.value || defaultLabel(this.#type.value);
      this.#statusEl.textContent = label;
    });

    // Dots visibility
    this.addEffect(() => {
      if (!this.#dotsEl) return;
      this.#dotsEl.hidden = !this.#active.value;
    });

    // Expandable state
    this.addEffect(() => {
      if (!this.#contentEl) return;
      const show = this.#expanded.value && this.#expandable.value;
      this.#contentEl.hidden = !show;
      this.#internals.states[show ? 'add' : 'delete']('expanded');
    });

    this.addEventListener('click', this.#onClick);
  }

  teardown(): void {
    this.#stopTimer();
    this.removeEventListener('click', this.#onClick);
    this.#statusEl = null;
    this.#timeEl = null;
    this.#dotsEl = null;
    this.#contentEl = null;
    super.teardown();
  }

  // ── DOM ──

  #stamp(): void {
    // Move existing children into content slot
    const fragment = document.createDocumentFragment();
    while (this.firstChild) fragment.appendChild(this.firstChild);

    // Status row
    const row = document.createElement('div');
    row.className = 'n-chat-activity-row';

    this.#timeEl = document.createElement('span');
    this.#timeEl.className = 'n-chat-activity-time';
    this.#timeEl.textContent = '0s';

    const sep = document.createElement('span');
    sep.className = 'n-chat-activity-sep';
    sep.textContent = '|';
    sep.setAttribute('aria-hidden', 'true');

    this.#statusEl = document.createElement('span');
    this.#statusEl.className = 'n-chat-activity-label';

    this.#dotsEl = document.createElement('span');
    this.#dotsEl.className = 'n-chat-activity-dots';
    this.#dotsEl.setAttribute('aria-hidden', 'true');
    this.#dotsEl.innerHTML = '<i></i><i></i><i></i>';

    row.append(this.#timeEl, sep, this.#statusEl, this.#dotsEl);

    // Content area (for reasoning trace)
    this.#contentEl = document.createElement('div');
    this.#contentEl.className = 'n-chat-activity-content';
    this.#contentEl.hidden = true;
    this.#contentEl.appendChild(fragment);

    this.append(row, this.#contentEl);
  }

  // ── Timer ──

  #startTimer(): void {
    this.#startTime = performance.now();
    this.#tickTimer();
  }

  #stopTimer(): void {
    if (this.#timerFrame) {
      cancelAnimationFrame(this.#timerFrame);
      this.#timerFrame = 0;
    }
  }

  #tickTimer = (): void => {
    if (!this.#active.value || !this.#timeEl) return;
    const elapsed = performance.now() - this.#startTime;
    this.#timeEl.textContent = formatElapsed(elapsed);
    this.#timerFrame = requestAnimationFrame(this.#tickTimer);
  };

  // ── Expand/collapse ──

  #onClick = (): void => {
    if (!this.#expandable.value) return;
    this.#expanded.value = !this.#expanded.value;
    this.toggleAttribute('expanded', this.#expanded.value);

    this.dispatchEvent(new CustomEvent('native:activity-toggle', {
      bubbles: true,
      composed: true,
      detail: { expanded: this.#expanded.value },
    }));
  };
}

function defaultLabel(type: string): string {
  switch (type) {
    case 'thinking': return 'Thinking…';
    case 'tool-use': return 'Using tools…';
    default: return 'Host is typing…';
  }
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m:${String(sec).padStart(2, '0')}s`;
}
