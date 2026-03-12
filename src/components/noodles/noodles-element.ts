import { NativeElement } from '@nonoun/native-core';
import { NoodleController } from '@nonoun/native-traits';
import type { NoodleConnection, NoodleOptions, PortSide } from '@nonoun/native-traits';

/**
 * `<n-noodles>` — Declarative SVG noodle canvas.
 *
 * Wraps NoodleController with a zero-config custom element. Children declare
 * ports via `data-noodle-port="left right"` and the element handles the SVG
 * overlay, coordinate system, and stacking context automatically.
 *
 * ```html
 * <n-noodles editable>
 *   <div id="a" data-noodle-port="right">Node A</div>
 *   <div id="b" data-noodle-port="left">Node B</div>
 * </n-noodles>
 * ```
 *
 * @attr {boolean} editable - Allow interactive creation/deletion of connections
 * @attr {string} color - Noodle stroke color (default: accent)
 * @attr {string} stroke-width - Stroke width in px (default: 2)
 * @attr {string} tension - Bezier control point distance 0–1 (default: 0.5)
 * @attr {boolean} show-ports - Show port indicator dots (default: auto from editable)
 * @attr {string} port-size - Port dot size in px (default: 10)
 * @attr {'bezier'|'step'|'straight'} curve - Curve style (default: bezier)
 * @attr {boolean} animated - Flowing dash animation
 * @attr {boolean} disabled - Disable the controller
 * @fires native:noodle-connect - Connection created. Detail: `{ id, from, to, fromPort, toPort }`
 * @fires native:noodle-disconnect - Connection removed. Detail: `{ id, from, to, fromPort, toPort }`
 * @fires native:noodle-drag - Pointer moves during drag. Detail: `{ from, fromPort, x, y, reconnect? }`
 */
export class NNoodles extends NativeElement {
  static observedAttributes = [
    'editable', 'color', 'stroke-width', 'tension',
    'show-ports', 'port-size', 'curve', 'animated', 'disabled',
  ];

  #ctrl: NoodleController | null = null;

  // ── Public API (pass-through) ──

  /** Current connections. */
  get connections(): NoodleConnection[] {
    return this.#ctrl?.getConnections() ?? [];
  }

  /** Create a connection between two elements. Returns the connection ID. */
  connect(from: string, to: string, fromPort?: PortSide, toPort?: PortSide): string {
    return this.#ctrl!.connect(from, to, fromPort, toPort);
  }

  /** Remove a connection by ID. */
  disconnect(id: string): boolean {
    return this.#ctrl?.disconnect(id) ?? false;
  }

  /** Replace all connections. */
  setConnections(connections: NoodleConnection[]): void {
    this.#ctrl?.setConnections(connections);
  }

  /** Remove all connections. */
  clear(): void {
    this.#ctrl?.clear();
  }

  /** Force re-render paths and port indicators. */
  update(): void {
    this.#ctrl?.update();
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();
    this.#ctrl = new NoodleController(this, this.#buildOptions());
  }

  teardown(): void {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    super.attributeChangedCallback(name, old, val);
    if (this.#ctrl) this.#syncOption(name, val);
  }

  // ── Private ──

  #buildOptions(): NoodleOptions {
    const opts: NoodleOptions = {};

    if (this.hasAttribute('editable')) opts.editable = true;
    if (this.hasAttribute('animated')) opts.animated = true;
    if (this.hasAttribute('disabled')) opts.disabled = true;

    const color = this.getAttribute('color');
    if (color) opts.color = color;

    const sw = this.getAttribute('stroke-width');
    if (sw) { const n = Number(sw); if (!isNaN(n)) opts.strokeWidth = n; }

    const tension = this.getAttribute('tension');
    if (tension) { const n = Number(tension); if (!isNaN(n)) opts.tension = n; }

    if (this.hasAttribute('show-ports')) {
      opts.showPorts = this.getAttribute('show-ports') !== 'false';
    }

    const ps = this.getAttribute('port-size');
    if (ps) { const n = Number(ps); if (!isNaN(n)) opts.portSize = n; }

    const curve = this.getAttribute('curve') as NoodleOptions['style'];
    if (curve === 'bezier' || curve === 'step' || curve === 'straight') {
      opts.style = curve;
    }

    return opts;
  }

  #syncOption(name: string, val: string | null): void {
    const ctrl = this.#ctrl!;
    switch (name) {
      case 'editable':
        ctrl.editable = val !== null;
        ctrl.update();
        break;
      case 'color':
        ctrl.color = val ?? 'var(--n-color-accent-500)';
        ctrl.update();
        break;
      case 'stroke-width': {
        const n = Number(val);
        if (!isNaN(n)) { ctrl.strokeWidth = n; ctrl.update(); }
        break;
      }
      case 'tension': {
        const n = Number(val);
        if (!isNaN(n)) { ctrl.tension = n; ctrl.update(); }
        break;
      }
      case 'show-ports':
        ctrl.showPorts = val !== 'false' && val !== null;
        ctrl.update();
        break;
      case 'port-size': {
        const n = Number(val);
        if (!isNaN(n)) { ctrl.portSize = n; ctrl.update(); }
        break;
      }
      case 'curve':
        if (val === 'bezier' || val === 'step' || val === 'straight') {
          ctrl.style = val;
          ctrl.update();
        }
        break;
      case 'animated':
        ctrl.animated = val !== null;
        ctrl.update();
        break;
      case 'disabled':
        ctrl.disabled = val !== null;
        ctrl.update();
        break;
    }
  }
}
