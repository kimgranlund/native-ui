export interface CSSInspectOptions {
  /** Z-spacing between depth levels in px (default 16) */
  depth?: number;
  /** Scale factor when inspecting (default 0.85) */
  scale?: number;
  /** Maximum rotation angle in degrees (default 60) */
  maxTilt?: number;
  /** Distance from host center (in px) at which max tilt is reached (default 384 ≈ 24rem) */
  tiltRadius?: number;
  /** CSS perspective in px (default 1200) */
  perspective?: number;
  /** Show layer labels via data-inspect-label (default true) */
  labels?: boolean;
  /** Walk all descendants recursively, not just direct children (default true) */
  recursive?: boolean;
  /** Pick mode: Alt+hover highlights descendants, Alt+click picks the inspection target (default false) */
  pick?: boolean;
  /** Disable the controller */
  disabled?: boolean;
}

/**
 * Explode child layers in 3D space with interactive mouse-driven tilt.
 *
 * Two modes:
 * - **Fixed host** (default): the host element is the inspection target.
 *   Click to activate, Escape/click-outside to dismiss.
 * - **Pick mode** (`pick: true`): the host is a container. Alt+hover highlights
 *   any descendant, Alt+click picks that element as the inspection target.
 *
 * On activation, the target is deep-cloned into a popover (top layer) so the
 * 3D explosion escapes ancestor overflow clipping. The original is hidden
 * with visibility:hidden to preserve layout.
 */
export class CSSInspectController {
  readonly host: HTMLElement;
  depth: number;
  scale: number;
  maxTilt: number;
  tiltRadius: number;
  perspective: number;
  labels: boolean;
  recursive: boolean;
  pick: boolean;
  disabled: boolean;

  #attached = false;
  #active = false;
  #altHeld = false;
  #pointerInside = false;
  #pointerDownActivated = false;
  #hoveredChild: HTMLElement | null = null;
  #selectedChild: HTMLElement | null = null;
  #explodedElements: HTMLElement[] = [];
  #activationId = 0;
  #depthMultiplier = 1;
  /** Base z-offset for the clone root (non-zero in pick mode so picked elements float) */
  #baseZ = 0;
  #clone: HTMLElement | null = null;
  #popover: HTMLElement | null = null;
  /** The original element being inspected (host in fixed mode, picked element in pick mode) */
  #inspectTarget: HTMLElement | null = null;
  /** Popover overlay for pre-inspection highlights (escapes overflow clipping) */
  #hlPopover: HTMLElement | null = null;
  #hlReady: HTMLElement | null = null;
  #hlHover: HTMLElement | null = null;

  constructor(host: HTMLElement, options: CSSInspectOptions = {}) {
    this.host = host;
    this.depth = options.depth ?? 16;
    this.scale = options.scale ?? 0.85;
    this.maxTilt = options.maxTilt ?? 60;
    this.tiltRadius = options.tiltRadius ?? 384;
    this.perspective = options.perspective ?? 1200;
    this.labels = options.labels ?? true;
    this.recursive = options.recursive ?? true;
    this.pick = options.pick ?? false;
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  get active(): boolean { return this.#active; }

  /** The active inspection root (clone during inspection, host otherwise) */
  get inspectRoot(): HTMLElement { return this.#clone ?? this.host; }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('pointerenter', this.#onPointerEnter);
    this.host.addEventListener('pointerleave', this.#onPointerLeave);
    this.host.addEventListener('pointermove', this.#onHoverMove);
    this.host.addEventListener('pointerdown', this.#onPointerDown);
    this.host.addEventListener('click', this.#onClick);
    document.addEventListener('keydown', this.#onAltDown);
    document.addEventListener('keyup', this.#onAltUp);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('pointerenter', this.#onPointerEnter);
    this.host.removeEventListener('pointerleave', this.#onPointerLeave);
    this.host.removeEventListener('pointermove', this.#onHoverMove);
    this.host.removeEventListener('pointerdown', this.#onPointerDown);
    this.host.removeEventListener('click', this.#onClick);
    document.removeEventListener('keydown', this.#onAltDown);
    document.removeEventListener('keyup', this.#onAltUp);
    if (this.#active) this.#deactivate();
    this.#clearHover();
    this.#teardownHighlights();
    this.#altHeld = false;
    this.#pointerInside = false;
  }

  destroy(): void {
    this.detach();
  }

  // ── Public API ──

  /** Programmatically activate the 3D inspection view on a target element.
   *  In pick mode, pass the element to inspect. In fixed mode, omit to use host. */
  inspect(target?: HTMLElement): void {
    if (this.#active) return;
    const el = target ?? this.host;
    const rect = el.getBoundingClientRect();
    this.#activate(el, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  /** Programmatically deactivate */
  dismiss(): void {
    if (this.#active) this.#deactivate();
  }

  // ── Handlers ──

  #onPointerEnter = (_e: PointerEvent): void => {
    this.#pointerInside = true;
    if (this.disabled || this.#active) return;
    if (this.#altHeld) this.#setReady(true);
  };

  #onPointerLeave = (_e: PointerEvent): void => {
    this.#pointerInside = false;
    this.#setReady(false);
    if (!this.#active) {
      this.#clearHover();
      this.#teardownHighlights();
    }
  };

  #onAltDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Alt' || this.#altHeld) return;
    this.#altHeld = true;
    if (this.disabled || this.#active) return;
    if (this.#pointerInside) this.#setReady(true);
  };

  #onAltUp = (e: KeyboardEvent): void => {
    if (e.key !== 'Alt') return;
    this.#altHeld = false;
    if (this.#active) return;
    this.#setReady(false);
    this.#clearHover();
    this.#teardownHighlights();
  };

  /** Tilt tracking — runs on document so the entire viewport is the hit area. */
  #onDocTilt = (e: PointerEvent): void => {
    const clone = this.#clone;
    if (!clone) return;
    const rect = (this.#popover ?? clone).getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const nx = Math.max(-1, Math.min(1, dx / this.tiltRadius));
    const ny = Math.max(-1, Math.min(1, dy / this.tiltRadius));
    const tiltX = ny * this.maxTilt;
    const tiltY = nx * -this.maxTilt;
    const bz = this.#baseZ * this.#depthMultiplier;
    clone.style.transform = `translateZ(${bz}px) perspective(${this.perspective}px) scale(${this.scale}) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    clone.style.setProperty('--inspect-tilt-x', `${tiltX}deg`);
    clone.style.setProperty('--inspect-tilt-y', `${tiltY}deg`);
  };

  /** Alt+pointerdown activates immediately — enables press-and-drag tilt without a full click. */
  #onPointerDown = (e: PointerEvent): void => {
    if (this.disabled || this.#active) return;
    if (!e.altKey || e.button !== 0) return;

    e.preventDefault(); // prevent text selection during drag-to-tilt
    this.#pointerDownActivated = true;

    if (this.pick) {
      if (!this.#hoveredChild) return;
      const target = this.#hoveredChild;
      this.#clearHover();
      this.#activate(target, e.clientX, e.clientY);
    } else {
      this.#activate(this.host, e.clientX, e.clientY);
    }
  };

  /** Hover highlighting — pre-inspection via popover overlay, active-mode via attributes on clone */
  #onHoverMove = (e: PointerEvent): void => {
    if (this.disabled) return;
    if (!this.#active && !this.#altHeld) return;

    const root = this.#clone ?? this.host;
    const target = (e.target as HTMLElement);
    const hoverTarget = target === root ? null : this.#closestChildOf(target, root);
    if (hoverTarget === this.#hoveredChild) return;

    this.#clearHover();
    if (hoverTarget) {
      this.#hoveredChild = hoverTarget;
      if (!this.#active) {
        // Pre-inspection: popover overlay (escapes overflow clipping)
        this.#ensureHighlights();
        this.#showBox(this.#hlHover!, hoverTarget, this.labels ? this.#labelText(hoverTarget) : undefined);
      } else {
        // Inspection: attributes on clone children (already in top layer)
        hoverTarget.toggleAttribute('inspect-hover', true);
        let walk: HTMLElement | null = hoverTarget.parentElement;
        while (walk && walk !== root) {
          walk.toggleAttribute('inspect-hover', true);
          walk = walk.parentElement;
        }
      }
    }
  };

  #onClick = (e: MouseEvent): void => {
    if (this.disabled) return;

    if (!this.#active) {
      // Alt+pointerdown already activated — swallow the trailing click
      if (this.#pointerDownActivated) {
        this.#pointerDownActivated = false;
        e.stopPropagation();
        return;
      }

      if (this.pick) {
        // Pick mode: Alt+click on a hovered child picks it as inspection target
        if (!this.#altHeld || !this.#hoveredChild) return;
        e.stopPropagation();
        const target = this.#hoveredChild;
        this.#clearHover();
        this.#activate(target, e.clientX, e.clientY);
      } else {
        // Non-pick mode: plain click activates
        e.stopPropagation();
        this.#activate(this.host, e.clientX, e.clientY);
      }
      return;
    }

    // Active mode: click to select a layer in the clone
    e.stopPropagation();
    const root = this.#clone!;
    const target = e.target as HTMLElement;
    const child = target === root ? null : this.#closestChildOf(target, root);
    if (child) this.#select(child);
  };

  #onWheel = (e: WheelEvent): void => {
    if (!this.#active) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    this.#depthMultiplier = Math.max(0.1, this.#depthMultiplier + delta);
    this.#updateDepths();
  };

  #onDocClick = (e: MouseEvent): void => {
    if (!this.#active) return;
    // Ignore the click that follows the Alt+pointerdown activation
    if (this.#pointerDownActivated) {
      this.#pointerDownActivated = false;
      return;
    }
    const target = e.target as Node;
    if (this.#popover && !this.#popover.contains(target)) {
      this.#deactivate();
    }
  };

  #onDocKeydown = (e: KeyboardEvent): void => {
    if (!this.#active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.#deactivate();
    }
  };

  /** Block text selection and drag-to-select while inspecting */
  #onDocSelectStart = (e: Event): void => { e.preventDefault(); };
  #onDocPointerDown = (e: PointerEvent): void => { e.preventDefault(); };

  // ── Internals ──

  #setReady(on: boolean): void {
    if (on) {
      this.host.toggleAttribute('inspect-ready', true);
      this.#ensureHighlights();
      this.#showBox(this.#hlReady!, this.host, this.labels ? this.#labelText(this.host) : undefined);
    } else {
      this.host.removeAttribute('inspect-ready');
      this.#hideBox(this.#hlReady);
    }
  }

  // ── Highlight overlays (top-layer popover escapes overflow clipping) ──

  #ensureHighlights(): void {
    if (this.#hlPopover) return;
    const pop = document.createElement('div');
    pop.setAttribute('popover', 'manual');
    pop.setAttribute('data-inspect-highlights', '');
    pop.style.cssText = 'position:fixed;inset:0;margin:0;padding:0;border:none;background:transparent;pointer-events:none;overflow:visible;';
    this.#hlReady = this.#makeBox('oklch(0.6 0.2 250 / 0.5)');
    this.#hlReady.setAttribute('data-inspect-hl', 'ready');
    this.#hlHover = this.#makeBox('oklch(0.6 0.2 250 / 0.7)');
    this.#hlHover.setAttribute('data-inspect-hl', 'hover');
    pop.append(this.#hlReady, this.#hlHover);
    document.body.appendChild(pop);
    if (typeof pop.showPopover === 'function') pop.showPopover();
    this.#hlPopover = pop;
  }

  #makeBox(color: string): HTMLElement {
    const box = document.createElement('div');
    box.style.cssText = `position:fixed;pointer-events:none;display:none;box-sizing:border-box;outline:2px solid ${color};outline-offset:-1px;`;
    const label = document.createElement('span');
    label.style.cssText = 'position:absolute;bottom:100%;left:0.25rem;margin-bottom:2px;font:600 0.625rem/1.4 ui-monospace,monospace;color:oklch(0.85 0.15 250);background:oklch(0.2 0.05 250/0.85);padding:0.1rem 0.35rem;border-radius:0.2rem;white-space:nowrap;display:none;';
    box.appendChild(label);
    return box;
  }

  #showBox(box: HTMLElement, el: HTMLElement, labelText?: string): void {
    const rect = el.getBoundingClientRect();
    box.style.top = `${rect.top}px`;
    box.style.left = `${rect.left}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    box.style.display = 'block';
    const label = box.firstElementChild as HTMLElement;
    if (labelText) {
      label.textContent = labelText;
      label.style.display = 'block';
    } else {
      label.style.display = 'none';
    }
  }

  #hideBox(box: HTMLElement | null): void {
    if (box) box.style.display = 'none';
  }

  #teardownHighlights(): void {
    if (!this.#hlPopover) return;
    try { this.#hlPopover.hidePopover(); } catch { /* already hidden */ }
    this.#hlPopover.remove();
    this.#hlPopover = null;
    this.#hlReady = null;
    this.#hlHover = null;
  }

  #updateDepths(): void {
    const root = this.#clone ?? this.host;
    this.#explodedElements.forEach((child, i) => {
      const base = this.recursive ? this.#domDepthFrom(child, root) * this.depth : (i + 1) * this.depth;
      child.style.transform = `translateZ(${base * this.#depthMultiplier}px)`;
    });
    // Scale clone root's base z-offset with the multiplier (pick mode float)
    if (this.#clone && this.#baseZ) {
      const current = this.#clone.style.transform;
      const bz = this.#baseZ * this.#depthMultiplier;
      this.#clone.style.transform = current.replace(/translateZ\([^)]+\)/, `translateZ(${bz}px)`);
    }
  }

  #closestChildOf(target: HTMLElement, root: HTMLElement): HTMLElement | null {
    if (this.recursive && root.contains(target) && target !== root) {
      return target;
    }
    let el: HTMLElement | null = target;
    while (el && el !== root) {
      if (el.parentElement === root) return el;
      el = el.parentElement;
    }
    return null;
  }

  #clearHover(): void {
    if (!this.#hoveredChild) return;
    // Remove attributes (inspection mode on clone children — no-op if pre-inspection)
    const root = this.#clone ?? this.host;
    let walk: HTMLElement | null = this.#hoveredChild;
    while (walk && walk !== root) {
      walk.removeAttribute('inspect-hover');
      walk = walk.parentElement;
    }
    // Hide overlay (pre-inspection — no-op if not shown)
    this.#hideBox(this.#hlHover);
    this.#hoveredChild = null;
  }

  #select(el: HTMLElement): void {
    this.#clearSelection();
    this.#selectedChild = el;
    const root = this.#clone ?? this.host;
    let walk: HTMLElement | null = el;
    while (walk && walk !== root) {
      walk.toggleAttribute('inspect-selected', true);
      walk = walk.parentElement;
    }
  }

  #clearSelection(): void {
    if (!this.#selectedChild) return;
    const root = this.#clone ?? this.host;
    let walk: HTMLElement | null = this.#selectedChild;
    while (walk && walk !== root) {
      walk.removeAttribute('inspect-selected');
      walk = walk.parentElement;
    }
    this.#selectedChild = null;
  }

  #labelText(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className
      ? `.${el.className.split(/\s+/)[0]}`
      : '';
    return `${tag}${id}${cls}`;
  }

  #createLabel(el: HTMLElement): void {
    el.setAttribute('data-inspect-label', this.#labelText(el));
  }

  #isOpaqueLeaf(el: HTMLElement): boolean {
    if (!el.tagName.includes('-')) return false;
    if (el.hasAttribute('contenteditable') || el.hasAttribute('tabindex')) return true;
    for (const child of el.children) {
      if (child instanceof HTMLElement
        && (child.hasAttribute('contenteditable') || child.hasAttribute('tabindex'))) {
        return true;
      }
    }
    return false;
  }

  #domDepthFrom(el: HTMLElement, root: HTMLElement): number {
    let depth = 0;
    let node: HTMLElement | null = el;
    while (node && node !== root) {
      depth++;
      node = node.parentElement;
    }
    return depth;
  }

  #collectElements(root: HTMLElement): HTMLElement[] {
    if (!this.recursive) {
      return Array.from(root.children).filter(
        (el): el is HTMLElement => el instanceof HTMLElement,
      );
    }
    const elements: HTMLElement[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node: Node) => {
        if (!(node instanceof HTMLElement)) return NodeFilter.FILTER_SKIP;
        const parent = node.parentElement;
        if (parent && parent !== root && this.#isOpaqueLeaf(parent)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node instanceof HTMLElement) elements.push(node);
    }
    return elements;
  }

  #activate(target: HTMLElement, px: number, py: number): void {
    this.#active = true;
    const id = ++this.#activationId;
    this.#clearHover();
    this.#setReady(false);
    this.#inspectTarget = target;
    target.toggleAttribute('inspecting', true);

    // Snapshot target rect before cloning
    const rect = target.getBoundingClientRect();

    // Deep-clone target into a popover wrapper → top layer escapes ancestor clipping
    const clone = target.cloneNode(true) as HTMLElement;
    const popover = document.createElement('div');
    popover.setAttribute('popover', 'manual');
    popover.style.cssText = [
      'position: fixed',
      'inset: auto',
      'margin: 0',
      'padding: 0',
      'border: none',
      'background: transparent',
      'overflow: visible',
      `top: ${rect.top}px`,
      `left: ${rect.left}px`,
      `width: ${rect.width}px`,
      `height: ${rect.height}px`,
    ].join(';');
    popover.appendChild(clone);
    document.body.appendChild(popover);

    // Promote to top layer (graceful no-op if popover API unavailable)
    if (typeof popover.showPopover === 'function') {
      popover.showPopover();
    }

    this.#clone = clone;
    this.#popover = popover;

    // Hide original (preserve layout space)
    target.style.visibility = 'hidden';

    // Pick mode: clone root gets a base z-offset so it "floats" above the page
    this.#baseZ = this.pick ? this.depth * 2 : 0;

    // Apply 3D transforms to clone
    clone.toggleAttribute('inspecting', true);
    clone.style.transformStyle = 'preserve-3d';
    clone.style.transformOrigin = 'center center';
    clone.style.userSelect = 'none';
    clone.style.overflow = 'visible'; // prevent overflow:hidden from flattening preserve-3d

    // Popover needs preserve-3d so clone's translateZ is visible
    popover.style.transformStyle = 'preserve-3d';
    popover.style.perspective = `${this.perspective}px`;

    // Compute initial tilt from pointer offset to center
    const dx = px - (rect.left + rect.width / 2);
    const dy = py - (rect.top + rect.height / 2);
    const nx = Math.max(-1, Math.min(1, dx / this.tiltRadius));
    const ny = Math.max(-1, Math.min(1, dy / this.tiltRadius));
    const tiltX = ny * this.maxTilt;
    const tiltY = nx * -this.maxTilt;
    const bz = this.#baseZ * this.#depthMultiplier;
    clone.style.transform = `translateZ(${bz}px) perspective(${this.perspective}px) scale(${this.scale}) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    clone.style.setProperty('--inspect-tilt-x', `${tiltX}deg`);
    clone.style.setProperty('--inspect-tilt-y', `${tiltY}deg`);
    clone.style.transition = 'transform 500ms cubic-bezier(0.2, 0, 0, 1)';

    // Collect and explode clone's children
    const elements = this.#collectElements(clone);
    this.#explodedElements = elements;

    elements.forEach((child, i) => {
      const z = this.recursive ? this.#domDepthFrom(child, clone) * this.depth : (i + 1) * this.depth;
      child.toggleAttribute('inspect-layer', true);
      child.style.transformStyle = 'preserve-3d';
      child.style.overflow = 'visible'; // prevent 3D flattening
      child.style.transform = `translateZ(${z}px)`;
      child.style.transition = 'transform 500ms cubic-bezier(0.2, 0, 0, 1)';
      if (this.labels) this.#createLabel(child);
    });

    // Label the clone (inspection root) itself
    if (this.labels) this.#createLabel(clone);

    // After explosion animation, shorten transition for responsive tilt
    setTimeout(() => {
      if (this.#activationId === id && this.#active) {
        clone.style.transition = 'transform 60ms ease-out';
      }
    }, 520);

    // Wire listeners on clone for interaction during inspection
    clone.addEventListener('pointermove', this.#onHoverMove);
    clone.addEventListener('click', this.#onClick);
    popover.addEventListener('wheel', this.#onWheel, { passive: false });

    // Document listeners for dismiss, tilt tracking, scroll/selection interception
    document.addEventListener('click', this.#onDocClick, true);
    document.addEventListener('keydown', this.#onDocKeydown);
    document.addEventListener('pointermove', this.#onDocTilt);
    document.addEventListener('wheel', this.#onWheel, { passive: false });
    document.addEventListener('selectstart', this.#onDocSelectStart);
    document.addEventListener('pointerdown', this.#onDocPointerDown);

    this.host.dispatchEvent(new CustomEvent('native:inspect', {
      bubbles: true,
      composed: true,
      detail: { active: true, layers: elements.length },
    }));
  }

  #deactivate(): void {
    this.#active = false;
    ++this.#activationId;
    this.#clearSelection();
    this.#clearHover();

    const count = this.#explodedElements.length;
    this.#explodedElements = [];

    // Tear down clone listeners
    if (this.#clone) {
      this.#clone.removeEventListener('pointermove', this.#onHoverMove);
      this.#clone.removeEventListener('click', this.#onClick);
    }
    if (this.#popover) {
      this.#popover.removeEventListener('wheel', this.#onWheel);
      if (typeof this.#popover.hidePopover === 'function') {
        try { this.#popover.hidePopover(); } catch { /* already hidden */ }
      }
      this.#popover.remove();
    }

    this.#clone = null;
    this.#popover = null;
    this.#depthMultiplier = 1;
    this.#baseZ = 0;

    // Restore the inspected element
    const target = this.#inspectTarget ?? this.host;
    target.style.visibility = '';
    target.removeAttribute('inspecting');
    this.#inspectTarget = null;

    // Remove document listeners
    document.removeEventListener('click', this.#onDocClick, true);
    document.removeEventListener('keydown', this.#onDocKeydown);
    document.removeEventListener('pointermove', this.#onDocTilt);
    document.removeEventListener('wheel', this.#onWheel);
    document.removeEventListener('selectstart', this.#onDocSelectStart);
    document.removeEventListener('pointerdown', this.#onDocPointerDown);

    this.host.dispatchEvent(new CustomEvent('native:inspect', {
      bubbles: true,
      composed: true,
      detail: { active: false, layers: count },
    }));
  }
}
