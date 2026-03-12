import { uid } from '@nonoun/native-core';

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

/** Proximity threshold (px) for snap-to-port drop detection */
const DROP_SNAP_RADIUS = 50;

interface DragState {
  fromElement: HTMLElement;
  fromPort: PortSide;
  fromId: string;
  pointerId: number;
  sourceDot: HTMLElement;
  /** Set when reconnecting an existing connection (detached at drag start) */
  reconnectId?: string;
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
  #suppressObserver = false;
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

    // Ensure host is positioned and establishes a stacking context
    // WHY: isolation prevents the SVG overlay and port dots from bleeding
    // through sibling elements outside the noodle host.
    const pos = getComputedStyle(this.host).position;
    if (pos === 'static') this.host.style.position = 'relative';
    this.host.style.isolation = 'isolate';

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
    this.host.style.isolation = '';

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

  /** Force re-render all paths and rebuild port indicators.
   *  Call after programmatic element moves or when the set of port elements changes. */
  update(): void {
    this.#renderAllPaths();
    // WHY: Skip port recreation during active drag — it would destroy
    // data-noodle-droppable attrs and the source dot's pointer capture.
    if (this.showPorts && !this.#dragState) this.#createPortIndicators();
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

  // ── Coordinate helpers ──

  /** Convert client (screen) coordinates to the host's layout coordinate space,
   *  accounting for CSS transforms (zoom/pan) on the host or its ancestors. */
  #clientToLocal(clientX: number, clientY: number): { x: number; y: number } {
    const hostRect = this.host.getBoundingClientRect();
    // Detect transform scale by comparing visual size to layout size
    const scaleX = hostRect.width / (this.host.clientWidth || 1);
    const scaleY = hostRect.height / (this.host.clientHeight || 1);
    return {
      x: (clientX - hostRect.left) / scaleX,
      y: (clientY - hostRect.top) / scaleY,
    };
  }

  // ── Path computation ──

  #getPortPosition(elementId: string, port: PortSide): { x: number; y: number } | null {
    const el = this.host.querySelector(`#${CSS.escape(elementId)}`) as HTMLElement | null;
    if (!el) return null;

    // Use offset-based positioning instead of getBoundingClientRect —
    // ports and SVG paths are positioned in the host's layout coordinate space,
    // which must ignore CSS transforms on ancestor elements (e.g. zoom/pan).
    let x = 0, y = 0;
    let current: HTMLElement | null = el;
    while (current && current !== this.host) {
      x += current.offsetLeft;
      y += current.offsetTop;
      // Account for inline translate (e.g. MagnetController drag)
      const translate = current.style.translate;
      if (translate) {
        const parts = translate.match(/-?[\d.]+/g);
        if (parts) { x += parseFloat(parts[0]) || 0; y += parseFloat(parts[1]) || 0; }
      }
      current = current.offsetParent as HTMLElement | null;
    }

    const w = el.offsetWidth;
    const h = el.offsetHeight;

    switch (port) {
      case 'top':    return { x: x + w / 2, y };
      case 'right':  return { x: x + w, y: y + h / 2 };
      case 'bottom': return { x: x + w / 2, y: y + h };
      case 'left':   return { x, y: y + h / 2 };
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

    this.#suppressObserver = true;

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
        hit.addEventListener('pointerdown', this.#onHitPointerDown);
        this.#hitGroup.appendChild(hit);
      }

      // Visible path
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');

      if (this.disabled) {
        // Disabled: use muted ink for better contrast, dashed to convey inactive state
        path.setAttribute('stroke', 'var(--n-ink-muted)');
        path.setAttribute('stroke-width', String(this.strokeWidth));
        path.setAttribute('stroke-dasharray', '6 4');
        path.style.opacity = '0.6';
      } else {
        path.setAttribute('stroke', conn.color ?? this.color);
        path.setAttribute('stroke-width', String(this.strokeWidth));
        if (this.animated) {
          path.setAttribute('stroke-dasharray', '8 4');
          path.style.animation = 'noodle-flow 0.6s linear infinite';
        }
      }
      this.#pathGroup.appendChild(path);
    }

    // WHY: Delay restore via microtask — same reason as #createPortIndicators.
    // The observer microtask must fire while suppression is still active.
    if (!this.#dragState) queueMicrotask(() => { this.#suppressObserver = false; });
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

  /** Full update: recreate port indicators (for child list changes). */
  #queueFullUpdate(): void {
    if (this.#updateQueued) return;
    this.#updateQueued = true;
    this.#rafId = requestAnimationFrame(() => {
      this.#updateQueued = false;
      this.#renderAllPaths();
      // WHY: Skip port recreation during active drag — it would destroy
      // data-noodle-droppable attrs and break proximity detection.
      if (this.showPorts && !this.#dragState) this.#createPortIndicators();
    });
  }

  // ── Port indicators (edit mode) ──

  #createPortIndicators(): void {
    this.#suppressObserver = true;
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
        dot.style.cssText = `position:absolute;width:${this.portSize}px;height:${this.portSize}px;border-radius:50%;background:${this.color};border:2px solid white;pointer-events:auto;cursor:crosshair;z-index:5;touch-action:none;transform:translate(-50%,-50%);transition:transform 150ms ease,box-shadow 150ms ease;box-shadow:0 1px 3px rgba(0,0,0,0.2);`;
        dot.addEventListener('pointerdown', this.#onPortPointerDown);
        this.host.appendChild(dot);
        this.#portElements.push(dot);
      }
    }
    this.#positionPortIndicators();
    // WHY: Delay restore via microtask so the MutationObserver callback (also a
    // microtask) fires while suppression is still active. Without this, the observer
    // sees childList changes from dot creation and queues #queueFullUpdate, creating
    // an infinite recreation loop that wipes data-noodle-droppable every frame.
    if (!this.#dragState) queueMicrotask(() => { this.#suppressObserver = false; });
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

    // WHY: Do NOT call setPointerCapture — it redirects all pointer events to
    // the source dot, preventing :hover from activating on target port dots.
    // Document-level listeners handle move/up correctly without capture.

    const targetId = dot.getAttribute('data-noodle-target')!;
    const side = dot.getAttribute('data-noodle-side')! as PortSide;
    const el = this.host.querySelector(`#${CSS.escape(targetId)}`);
    if (!el) return;

    this.#dragState = {
      fromElement: el as HTMLElement,
      fromPort: side,
      fromId: targetId,
      pointerId: e.pointerId,
      sourceDot: dot,
    };

    // Mark source port as dragging
    dot.setAttribute('data-noodle-dragging', '');

    // Mark all other ports as valid drop targets
    for (const portDot of this.#portElements) {
      if (portDot === dot) continue;
      const portTargetId = portDot.getAttribute('data-noodle-target')!;
      const portSide = portDot.getAttribute('data-noodle-side')!;
      // Don't mark same port on same element
      if (portTargetId === targetId && portSide === side) continue;
      portDot.setAttribute('data-noodle-droppable', '');
    }

    // WHY: Suppress MutationObserver for the entire drag operation.
    // Appending the drag path triggers a childList mutation → #queueFullUpdate
    // which destroys all port indicators (and their data-noodle-droppable attrs),
    // breaking proximity detection and preventing connections from forming.
    this.#suppressObserver = true;

    // Create temporary drag path — visible but muted until near a valid port
    this.#dragPath = document.createElementNS(NS, 'path');
    this.#dragPath.setAttribute('stroke', 'var(--n-ink-muted)');
    this.#dragPath.setAttribute('stroke-width', String(this.strokeWidth));
    this.#dragPath.setAttribute('fill', 'none');
    this.#dragPath.setAttribute('stroke-dasharray', '6 4');
    this.#dragPath.setAttribute('stroke-linecap', 'round');
    this.#dragPath.style.opacity = '0.7';
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

    // Pointer position in host's layout coordinate space
    const { x: mx, y: my } = this.#clientToLocal(e.clientX, e.clientY);

    // Compute bezier from port to pointer
    const dist = Math.max(Math.abs(mx - p1.x), Math.abs(my - p1.y));
    const offset = Math.max(50, dist * this.tension);
    const [cx1, cy1] = this.#controlPoint(p1.x, p1.y, state.fromPort, offset);
    const d = `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${mx} ${my}, ${mx} ${my}`;
    this.#dragPath.setAttribute('d', d);

    // Update drop-ready state via proximity detection
    this.#updateDropReady(e.clientX, e.clientY);
  };

  #onPortPointerUp = (e: PointerEvent): void => {
    const state = this.#dragState;
    if (!state) return;

    // Proximity-based snap: find nearest port within threshold
    const nearest = this.#findNearestPort(e.clientX, e.clientY);
    if (nearest) {
      const toId = nearest.getAttribute('data-noodle-target')!;
      const toPort = nearest.getAttribute('data-noodle-side')! as PortSide;

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
    // Clean up interaction state attributes
    for (const dot of this.#portElements) {
      dot.removeAttribute('data-noodle-dragging');
      dot.removeAttribute('data-noodle-droppable');
      dot.removeAttribute('data-noodle-drop-ready');
    }

    this.#dragPath?.remove();
    this.#dragPath = null;
    this.#dragState = null;
    document.removeEventListener('pointermove', this.#onPortPointerMove);
    document.removeEventListener('pointerup', this.#onPortPointerUp);
    document.removeEventListener('pointercancel', this.#onPortPointerCancel);

    // Restore observer after drag — pick up any mutations that were suppressed
    this.#suppressObserver = false;
  }

  // ── Proximity helpers ──

  /** Find the nearest droppable port within DROP_SNAP_RADIUS of a screen point. */
  #findNearestPort(clientX: number, clientY: number): HTMLElement | null {
    let nearest: HTMLElement | null = null;
    let minDist = DROP_SNAP_RADIUS;

    for (const dot of this.#portElements) {
      if (!dot.hasAttribute('data-noodle-droppable')) continue;
      const rect = dot.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      if (dist < minDist) {
        minDist = dist;
        nearest = dot;
      }
    }

    return nearest;
  }

  /** Toggle data-noodle-drop-ready on the nearest droppable port and update drag path color. */
  #updateDropReady(clientX: number, clientY: number): void {
    const nearest = this.#findNearestPort(clientX, clientY);

    for (const dot of this.#portElements) {
      if (dot === nearest) {
        dot.setAttribute('data-noodle-drop-ready', '');
      } else {
        dot.removeAttribute('data-noodle-drop-ready');
      }
    }

    // Color feedback on the drag path
    if (nearest && this.#dragPath && this.#dragState) {
      // Within snap zone → alive: solid accent, snap path to target port
      this.#dragPath.setAttribute('stroke', this.color);
      this.#dragPath.style.opacity = '1';
      this.#dragPath.removeAttribute('stroke-dasharray');

      const targetId = nearest.getAttribute('data-noodle-target')!;
      const targetPort = nearest.getAttribute('data-noodle-side')! as PortSide;
      const p2 = this.#getPortPosition(targetId, targetPort);
      const p1 = this.#getPortPosition(this.#dragState.fromId, this.#dragState.fromPort);
      if (p1 && p2) {
        const dist = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
        const offset = Math.max(50, dist * this.tension);
        const [cx1, cy1] = this.#controlPoint(p1.x, p1.y, this.#dragState.fromPort, offset);
        const [cx2, cy2] = this.#controlPoint(p2.x, p2.y, targetPort, offset);
        this.#dragPath.setAttribute('d', `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`);
      }
    } else if (this.#dragPath) {
      // Outside snap zone → muted dashed
      this.#dragPath.setAttribute('stroke', 'var(--n-ink-muted)');
      this.#dragPath.style.opacity = '0.7';
      this.#dragPath.setAttribute('stroke-dasharray', '6 4');
    }
  }

  // ── Reconnect drag (grab existing noodle near endpoint) ──

  #onHitPointerDown = (e: PointerEvent): void => {
    if (this.disabled || !this.editable || e.button !== 0) return;
    const target = e.target as SVGPathElement;
    const connId = target.dataset.noodleId;
    if (!connId) return;
    const conn = this.#connections.get(connId);
    if (!conn) return;

    e.preventDefault();
    e.stopPropagation();

    // WHY: Suppress BEFORE disconnect() — disconnect calls #renderAllPaths which
    // modifies SVG DOM. Without early suppression, the MutationObserver would
    // queue #queueFullUpdate that destroys port dots before we mark them droppable.
    this.#suppressObserver = true;

    // Determine which endpoint is closer to the pointer
    const p1 = this.#getPortPosition(conn.from, conn.fromPort);
    const p2 = this.#getPortPosition(conn.to, conn.toPort);
    if (!p1 || !p2) { this.#suppressObserver = false; return; }

    const { x: pointerX, y: pointerY } = this.#clientToLocal(e.clientX, e.clientY);

    const distFrom = Math.hypot(pointerX - p1.x, pointerY - p1.y);
    const distTo = Math.hypot(pointerX - p2.x, pointerY - p2.y);

    // Anchor at the farther endpoint, detach the closer one
    const anchorId = distFrom < distTo ? conn.to : conn.from;
    const anchorPort = distFrom < distTo ? conn.toPort : conn.fromPort;

    // Remove the connection (fires native:noodle-disconnect)
    this.disconnect(connId);

    // Find the anchor port's indicator dot
    const anchorDot = this.#portElements.find(
      d => d.getAttribute('data-noodle-target') === anchorId &&
           d.getAttribute('data-noodle-side') === anchorPort
    );
    if (!anchorDot) { this.#suppressObserver = false; return; }

    const el = this.host.querySelector(`#${CSS.escape(anchorId)}`);
    if (!el) { this.#suppressObserver = false; return; }

    // WHY: No setPointerCapture — same reason as #onPortPointerDown.

    this.#dragState = {
      fromElement: el as HTMLElement,
      fromPort: anchorPort,
      fromId: anchorId,
      pointerId: e.pointerId,
      sourceDot: anchorDot,
      reconnectId: connId,
    };

    // Mark source port as dragging
    anchorDot.setAttribute('data-noodle-dragging', '');

    // Mark all other ports as valid drop targets
    for (const portDot of this.#portElements) {
      if (portDot === anchorDot) continue;
      const portTargetId = portDot.getAttribute('data-noodle-target')!;
      const portSide = portDot.getAttribute('data-noodle-side')!;
      if (portTargetId === anchorId && portSide === anchorPort) continue;
      portDot.setAttribute('data-noodle-droppable', '');
    }

    // Create temporary drag path — starts muted
    this.#dragPath = document.createElementNS(NS, 'path');
    this.#dragPath.setAttribute('stroke', 'var(--n-ink-muted)');
    this.#dragPath.setAttribute('stroke-width', String(this.strokeWidth));
    this.#dragPath.setAttribute('fill', 'none');
    this.#dragPath.setAttribute('stroke-dasharray', '6 4');
    this.#dragPath.setAttribute('stroke-linecap', 'round');
    this.#dragPath.style.opacity = '0.7';

    // Compute initial path from anchor to pointer so the drag is immediately visible
    const anchorPos = this.#getPortPosition(anchorId, anchorPort);
    const { x: mx, y: my } = this.#clientToLocal(e.clientX, e.clientY);
    if (anchorPos) {
      const dist = Math.max(Math.abs(mx - anchorPos.x), Math.abs(my - anchorPos.y));
      const offset = Math.max(50, dist * this.tension);
      const [cx1, cy1] = this.#controlPoint(anchorPos.x, anchorPos.y, anchorPort, offset);
      this.#dragPath.setAttribute('d', `M ${anchorPos.x} ${anchorPos.y} C ${cx1} ${cy1}, ${mx} ${my}, ${mx} ${my}`);
    }

    this.#pathGroup?.appendChild(this.#dragPath);

    this.host.dispatchEvent(new CustomEvent('native:noodle-drag', {
      bubbles: true, composed: true,
      detail: { from: anchorId, fromPort: anchorPort, x: e.clientX, y: e.clientY, reconnect: true },
    }));

    document.addEventListener('pointermove', this.#onPortPointerMove);
    document.addEventListener('pointerup', this.#onPortPointerUp);
    document.addEventListener('pointercancel', this.#onPortPointerCancel);
  };

  // ── Movement tracking ──

  #onExternalMove = (): void => {
    this.#queueUpdate();
  };

  #startObserving(): void {
    // ResizeObserver for host size changes
    this.#resizeObserver = new ResizeObserver(() => this.#queueUpdate());
    this.#resizeObserver.observe(this.host);

    // MutationObserver for style changes (drag-based movement) + child list changes (dataset load)
    this.#mutationObserver = new MutationObserver((mutations) => {
      if (this.#suppressObserver) return;
      const hasChildListChange = mutations.some(m => m.type === 'childList');
      if (hasChildListChange) {
        this.#queueFullUpdate(); // Recreate port indicators for new/removed elements
      } else {
        this.#queueUpdate(); // Just reposition existing indicators
      }
    });
    this.#mutationObserver.observe(this.host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'translate', 'data-noodle-port'],
    });
  }

  #stopObserving(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
  }
}
