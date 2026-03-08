import { uid } from '../core/uid.ts';

// ── Types ──

export type PortSide = 'top' | 'right' | 'bottom' | 'left';

export interface NoodleConnection {
  /** Unique connection ID (auto-generated via uid if not provided) */
  id: string;
  /** Element ID for the source element */
  from: string;
  /** Element ID for the target element */
  to: string;
  /** Port side on the source element (default: 'right') */
  fromPort: PortSide;
  /** Port side on the target element (default: 'left') */
  toPort: PortSide;
  /** Optional color override for this specific noodle */
  color?: string;
}

export interface NoodleOptions {
  /** CSS selector for elements that can be connection endpoints (default: '[data-noodle-port]') */
  selector?: string;
  /** Allow interactive creation/deletion of connections (default: false) */
  editable?: boolean;
  /** Noodle stroke color (default: 'var(--n-color-accent-500)') */
  color?: string;
  /** Noodle stroke width in px (default: 2) */
  strokeWidth?: number;
  /** Bezier curve tension — how far control points extend (default: 0.5) */
  tension?: number;
  /** Show port indicator dots on connectable elements (default: true when editable) */
  showPorts?: boolean;
  /** Port indicator dot size in px (default: 10) */
  portSize?: number;
  /** Initial connections (default: []) */
  connections?: NoodleConnection[];
  /** Noodle curve style (default: 'bezier') */
  style?: 'bezier' | 'step' | 'straight';
  /** Animate noodles with a flowing dash pattern (default: false) */
  animated?: boolean;
  /** Disable the controller */
  disabled?: boolean;
}

interface DragState {
  fromElement: HTMLElement;
  fromPort: PortSide;
  fromId: string;
  pointerId: number;
}

const NS = 'http://www.w3.org/2000/svg';

/** Renders SVG noodle connections between DOM elements within a host container. */
export class NoodleController {
  readonly host: HTMLElement;

  // ── Public mutable options ──
  selector: string;
  editable: boolean;
  color: string;
  strokeWidth: number;
  tension: number;
  showPorts: boolean;
  portSize: number;
  style: 'bezier' | 'step' | 'straight';
  animated: boolean;
  disabled: boolean;

  // ── Private state ──
  #attached = false;
  #svg: SVGSVGElement | null = null;
  #connections: Map<string, NoodleConnection> = new Map();
  #pathGroup: SVGGElement | null = null;
  #hitGroup: SVGGElement | null = null;
  #portElements: HTMLElement[] = [];
  #dragState: DragState | null = null;
  #dragPath: SVGPathElement | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #mutationObserver: MutationObserver | null = null;
  #rafId = 0;
  #updateQueued = false;
  #styleEl: HTMLStyleElement | null = null;

  constructor(host: HTMLElement, options: NoodleOptions = {}) {
    this.host = host;
    this.selector = options.selector ?? '[data-noodle-port]';
    this.editable = options.editable ?? false;
    this.color = options.color ?? 'var(--n-color-accent-500)';
    this.strokeWidth = options.strokeWidth ?? 2;
    this.tension = options.tension ?? 0.5;
    this.showPorts = options.showPorts ?? this.editable;
    this.portSize = options.portSize ?? 10;
    this.style = options.style ?? 'bezier';
    this.animated = options.animated ?? false;
    this.disabled = options.disabled ?? false;

    if (options.connections) {
      for (const c of options.connections) {
        this.#connections.set(c.id, {
          ...c,
          fromPort: c.fromPort ?? 'right',
          toPort: c.toPort ?? 'left',
        });
      }
    }

    this.attach();
  }

  // ── Lifecycle ──

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;

    // Ensure host is positioned
    const pos = getComputedStyle(this.host).position;
    if (pos === 'static') this.host.style.position = 'relative';

    this.#createSVG();
    this.#injectKeyframes();
    this.#startObserving();

    if (this.showPorts) this.#createPortIndicators();

    // Listen for drag events from MagnetController / DragController
    this.host.addEventListener('native:magnet-snap', this.#onExternalMove);
    this.host.addEventListener('native:magnet-drop', this.#onExternalMove);
    this.host.addEventListener('native:drag-move', this.#onExternalMove);

    this.#renderAllPaths();
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;

    this.#stopObserving();
    this.#removePortIndicators();
    this.#removeSVG();
    this.#removeKeyframes();

    this.host.removeEventListener('native:magnet-snap', this.#onExternalMove);
    this.host.removeEventListener('native:magnet-drop', this.#onExternalMove);
    this.host.removeEventListener('native:drag-move', this.#onExternalMove);

    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = 0;
    }
    this.#updateQueued = false;
  }

  destroy(): void {
    this.#endDrag();
    this.detach();
    this.#connections.clear();
  }

  // ── Public API ──

  /** Add a connection. Returns the connection ID. */
  connect(from: string, to: string, fromPort: PortSide = 'right', toPort: PortSide = 'left'): string {
    const id = uid('noodle');
    const conn: NoodleConnection = { id, from, to, fromPort, toPort };
    this.#connections.set(id, conn);
    this.#renderAllPaths();

    this.host.dispatchEvent(new CustomEvent('native:noodle-connect', {
      bubbles: true, composed: true,
      detail: { id, from, to, fromPort, toPort },
    }));

    return id;
  }

  /** Remove a connection by ID. */
  disconnect(id: string): boolean {
    const conn = this.#connections.get(id);
    if (!conn) return false;
    this.#connections.delete(id);
    this.#renderAllPaths();

    this.host.dispatchEvent(new CustomEvent('native:noodle-disconnect', {
      bubbles: true, composed: true,
      detail: { id, from: conn.from, to: conn.to, fromPort: conn.fromPort, toPort: conn.toPort },
    }));

    return true;
  }

  /** Remove all connections. */
  clear(): void {
    const conns = [...this.#connections.values()];
    this.#connections.clear();
    this.#renderAllPaths();
    for (const conn of conns) {
      this.host.dispatchEvent(new CustomEvent('native:noodle-disconnect', {
        bubbles: true, composed: true,
        detail: { id: conn.id, from: conn.from, to: conn.to, fromPort: conn.fromPort, toPort: conn.toPort },
      }));
    }
  }

  /** Get all current connections. */
  getConnections(): NoodleConnection[] {
    return [...this.#connections.values()];
  }

  /** Replace all connections. */
  setConnections(connections: NoodleConnection[]): void {
    this.#connections.clear();
    for (const c of connections) {
      this.#connections.set(c.id ?? uid('noodle'), {
        ...c,
        fromPort: c.fromPort ?? 'right',
        toPort: c.toPort ?? 'left',
      });
    }
    this.#renderAllPaths();
  }

  /** Force re-render all paths. Call after programmatic element moves. */
  update(): void {
    this.#renderAllPaths();
    if (this.showPorts) this.#positionPortIndicators();
  }

  // ── SVG overlay ──

  #createSVG(): void {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('data-noodle-svg', '');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:0;';
    // Groups: hit areas behind visible paths
    this.#hitGroup = document.createElementNS(NS, 'g');
    this.#hitGroup.setAttribute('data-noodle-hits', '');
    svg.appendChild(this.#hitGroup);
    this.#pathGroup = document.createElementNS(NS, 'g');
    this.#pathGroup.setAttribute('data-noodle-paths', '');
    svg.appendChild(this.#pathGroup);
    this.host.appendChild(svg);
    this.#svg = svg;
  }

  #removeSVG(): void {
    this.#svg?.remove();
    this.#svg = null;
    this.#pathGroup = null;
    this.#hitGroup = null;
  }

  #injectKeyframes(): void {
    if (this.#styleEl) return;
    const style = document.createElement('style');
    style.textContent = '@keyframes noodle-flow{to{stroke-dashoffset:-12}}';
    this.host.appendChild(style);
    this.#styleEl = style;
  }

  #removeKeyframes(): void {
    this.#styleEl?.remove();
    this.#styleEl = null;
  }

  // ── Path computation ──

  #getPortPosition(elementId: string, port: PortSide): { x: number; y: number } | null {
    const el = this.host.querySelector(`#${CSS.escape(elementId)}`);
    if (!el) return null;
    const hostRect = this.host.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const relLeft = elRect.left - hostRect.left;
    const relTop = elRect.top - hostRect.top;

    switch (port) {
      case 'top':    return { x: relLeft + elRect.width / 2, y: relTop };
      case 'right':  return { x: relLeft + elRect.width, y: relTop + elRect.height / 2 };
      case 'bottom': return { x: relLeft + elRect.width / 2, y: relTop + elRect.height };
      case 'left':   return { x: relLeft, y: relTop + elRect.height / 2 };
    }
  }

  #controlPoint(x: number, y: number, port: PortSide, offset: number): [number, number] {
    switch (port) {
      case 'right':  return [x + offset, y];
      case 'left':   return [x - offset, y];
      case 'bottom': return [x, y + offset];
      case 'top':    return [x, y - offset];
    }
  }

  #computePath(conn: NoodleConnection): string | null {
    const p1 = this.#getPortPosition(conn.from, conn.fromPort);
    const p2 = this.#getPortPosition(conn.to, conn.toPort);
    if (!p1 || !p2) return null;

    switch (this.style) {
      case 'straight':
        return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
      case 'step': {
        const mx = (p1.x + p2.x) / 2;
        return `M ${p1.x} ${p1.y} L ${mx} ${p1.y} L ${mx} ${p2.y} L ${p2.x} ${p2.y}`;
      }
      case 'bezier':
      default: {
        const dist = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
        const offset = Math.max(50, dist * this.tension);
        const [cx1, cy1] = this.#controlPoint(p1.x, p1.y, conn.fromPort, offset);
        const [cx2, cy2] = this.#controlPoint(p2.x, p2.y, conn.toPort, offset);
        return `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`;
      }
    }
  }

  // ── Rendering ──

  #renderAllPaths(): void {
    if (!this.#pathGroup || !this.#hitGroup) return;

    // Clear existing
    this.#pathGroup.textContent = '';
    this.#hitGroup.textContent = '';

    // Re-render temp drag path if active
    if (this.#dragPath) this.#pathGroup.appendChild(this.#dragPath);

    for (const conn of this.#connections.values()) {
      const d = this.#computePath(conn);
      if (!d) continue;

      // Hit area (edit mode)
      if (this.editable) {
        const hit = document.createElementNS(NS, 'path');
        hit.setAttribute('d', d);
        hit.setAttribute('stroke', 'transparent');
        hit.setAttribute('stroke-width', '14');
        hit.setAttribute('fill', 'none');
        hit.style.pointerEvents = 'stroke';
        hit.style.cursor = 'pointer';
        hit.dataset.noodleId = conn.id;
        hit.addEventListener('click', this.#onPathClick);
        this.#hitGroup.appendChild(hit);
      }

      // Visible path
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', conn.color ?? this.color);
      path.setAttribute('stroke-width', String(this.strokeWidth));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      if (this.animated) {
        path.setAttribute('stroke-dasharray', '8 4');
        path.style.animation = 'noodle-flow 0.6s linear infinite';
      }
      this.#pathGroup.appendChild(path);
    }
  }

  #queueUpdate(): void {
    if (this.#updateQueued) return;
    this.#updateQueued = true;
    this.#rafId = requestAnimationFrame(() => {
      this.#updateQueued = false;
      this.#renderAllPaths();
      if (this.showPorts) this.#positionPortIndicators();
    });
  }

  // ── Port indicators (edit mode) ──

  #createPortIndicators(): void {
    this.#removePortIndicators();
    const portElements = this.host.querySelectorAll(this.selector);
    for (const el of portElements) {
      const sides = (el.getAttribute('data-noodle-port') ?? '').split(/\s+/).filter(Boolean);
      const elId = el.id;
      if (!elId) continue;

      for (const side of sides) {
        const dot = document.createElement('div');
        dot.setAttribute('data-noodle-port-indicator', '');
        dot.setAttribute('data-noodle-side', side);
        dot.setAttribute('data-noodle-target', elId);
        dot.style.cssText = `position:absolute;width:${this.portSize}px;height:${this.portSize}px;border-radius:50%;background:${this.color};border:2px solid white;pointer-events:auto;cursor:crosshair;z-index:1;transform:translate(-50%,-50%);transition:transform 150ms ease,box-shadow 150ms ease;box-shadow:0 1px 3px rgba(0,0,0,0.2);`;
        dot.addEventListener('pointerdown', this.#onPortPointerDown);
        this.host.appendChild(dot);
        this.#portElements.push(dot);
      }
    }
    this.#positionPortIndicators();
  }

  #positionPortIndicators(): void {
    for (const dot of this.#portElements) {
      const targetId = dot.getAttribute('data-noodle-target')!;
      const side = dot.getAttribute('data-noodle-side')! as PortSide;
      const pos = this.#getPortPosition(targetId, side);
      if (pos) {
        dot.style.left = `${pos.x}px`;
        dot.style.top = `${pos.y}px`;
      }
    }
  }

  #removePortIndicators(): void {
    for (const dot of this.#portElements) {
      dot.removeEventListener('pointerdown', this.#onPortPointerDown);
      dot.remove();
    }
    this.#portElements = [];
  }

  // ── Edit mode: drag-to-connect ──

  #onPortPointerDown = (e: PointerEvent): void => {
    if (this.disabled || !this.editable || e.button !== 0) return;
    const dot = (e.target as HTMLElement).closest('[data-noodle-port-indicator]') as HTMLElement;
    if (!dot) return;

    e.preventDefault();
    e.stopPropagation();
    dot.setPointerCapture(e.pointerId);

    const targetId = dot.getAttribute('data-noodle-target')!;
    const side = dot.getAttribute('data-noodle-side')! as PortSide;
    const el = this.host.querySelector(`#${CSS.escape(targetId)}`);
    if (!el) return;

    this.#dragState = {
      fromElement: el as HTMLElement,
      fromPort: side,
      fromId: targetId,
      pointerId: e.pointerId,
    };

    // Create temporary dashed path
    this.#dragPath = document.createElementNS(NS, 'path');
    this.#dragPath.setAttribute('stroke', this.color);
    this.#dragPath.setAttribute('stroke-width', String(this.strokeWidth));
    this.#dragPath.setAttribute('fill', 'none');
    this.#dragPath.setAttribute('stroke-dasharray', '6 4');
    this.#dragPath.setAttribute('stroke-linecap', 'round');
    this.#dragPath.style.opacity = '0.6';
    this.#pathGroup?.appendChild(this.#dragPath);

    this.host.dispatchEvent(new CustomEvent('native:noodle-drag', {
      bubbles: true, composed: true,
      detail: { from: targetId, fromPort: side, x: e.clientX, y: e.clientY },
    }));

    document.addEventListener('pointermove', this.#onPortPointerMove);
    document.addEventListener('pointerup', this.#onPortPointerUp);
    document.addEventListener('pointercancel', this.#onPortPointerCancel);
  };

  #onPortPointerMove = (e: PointerEvent): void => {
    const state = this.#dragState;
    if (!state || !this.#dragPath) return;

    const p1 = this.#getPortPosition(state.fromId, state.fromPort);
    if (!p1) return;

    // Pointer position relative to host
    const hostRect = this.host.getBoundingClientRect();
    const mx = e.clientX - hostRect.left;
    const my = e.clientY - hostRect.top;

    // Compute bezier from port to pointer
    const dist = Math.max(Math.abs(mx - p1.x), Math.abs(my - p1.y));
    const offset = Math.max(50, dist * this.tension);
    const [cx1, cy1] = this.#controlPoint(p1.x, p1.y, state.fromPort, offset);
    const d = `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${mx} ${my}, ${mx} ${my}`;
    this.#dragPath.setAttribute('d', d);
  };

  #onPortPointerUp = (e: PointerEvent): void => {
    const state = this.#dragState;
    if (!state) return;

    // Check if we're over a port indicator
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const dot = target?.closest?.('[data-noodle-port-indicator]') as HTMLElement | null;

    if (dot) {
      const toId = dot.getAttribute('data-noodle-target')!;
      const toPort = dot.getAttribute('data-noodle-side')! as PortSide;

      // Don't connect to same port on same element
      if (toId !== state.fromId || toPort !== state.fromPort) {
        this.connect(state.fromId, toId, state.fromPort, toPort);
      }
    }

    this.#endDrag();
  };

  #onPortPointerCancel = (): void => {
    this.#endDrag();
  };

  #endDrag(): void {
    this.#dragPath?.remove();
    this.#dragPath = null;
    this.#dragState = null;
    document.removeEventListener('pointermove', this.#onPortPointerMove);
    document.removeEventListener('pointerup', this.#onPortPointerUp);
    document.removeEventListener('pointercancel', this.#onPortPointerCancel);
  }

  // ── Click-to-delete ──

  #onPathClick = (e: MouseEvent): void => {
    if (this.disabled || !this.editable) return;
    const target = e.target as SVGPathElement;
    const id = target.dataset.noodleId;
    if (id) this.disconnect(id);
  };

  // ── Movement tracking ──

  #onExternalMove = (): void => {
    this.#queueUpdate();
  };

  #startObserving(): void {
    // ResizeObserver for host size changes
    this.#resizeObserver = new ResizeObserver(() => this.#queueUpdate());
    this.#resizeObserver.observe(this.host);

    // MutationObserver for style changes on children (drag-based movement)
    this.#mutationObserver = new MutationObserver(() => this.#queueUpdate());
    this.#mutationObserver.observe(this.host, {
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'translate'],
    });
  }

  #stopObserving(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
  }
}
