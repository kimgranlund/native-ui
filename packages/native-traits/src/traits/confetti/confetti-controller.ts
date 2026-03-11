export interface ConfettiOptions {
  /** Number of particles (default 30) */
  count?: number;
  /** Spread angle in degrees (default 90) */
  spread?: number;
  /** Initial velocity in px/frame (default 12) */
  velocity?: number;
  /** Gravity in px/frame² (default 0.5) */
  gravity?: number;
  /** Particle size range [min, max] in px (default [6, 10]) */
  size?: [number, number];
  /** Colors array (default: rainbow) */
  colors?: string[];
  /** Duration before cleanup in ms (default 2000) */
  duration?: number;
  /** Trigger: 'click' | 'manual' (default 'click') */
  trigger?: 'click' | 'manual';
  /** Particle shapes: 'square' | 'circle' | 'mixed' (default 'mixed') */
  shapes?: 'square' | 'circle' | 'mixed';
  /** Disable the controller */
  disabled?: boolean;
}

interface Particle {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  scale: number;
}

const DEFAULT_COLORS = ['#ff577f', '#ff884b', '#ffd384', '#fff9b0', '#3ec1d3', '#7c5cbf', '#ff6b6b', '#48dbfb'];

/** Burst of confetti particles from an element. DOM-based particles with randomized trajectories + gravity. */
export class ConfettiController {
  readonly host: HTMLElement;
  count: number;
  spread: number;
  velocity: number;
  gravity: number;
  size: [number, number];
  colors: string[];
  duration: number;
  trigger: 'click' | 'manual';
  shapes: 'square' | 'circle' | 'mixed';
  disabled: boolean;

  #attached = false;
  #containers: Set<HTMLElement> = new Set();

  constructor(host: HTMLElement, options: ConfettiOptions = {}) {
    this.host = host;
    this.count = options.count ?? 30;
    this.spread = options.spread ?? 90;
    this.velocity = options.velocity ?? 12;
    this.gravity = options.gravity ?? 0.5;
    this.size = options.size ?? [6, 10];
    this.colors = options.colors ?? DEFAULT_COLORS;
    this.duration = options.duration ?? 2000;
    this.trigger = options.trigger ?? 'click';
    this.shapes = options.shapes ?? 'mixed';
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  get active(): boolean { return this.#containers.size > 0; }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    if (this.trigger === 'click') {
      this.host.addEventListener('click', this.#onClick);
    }
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('click', this.#onClick);
  }

  destroy(): void {
    this.detach();
    // Remove all active containers
    for (const container of this.#containers) {
      container.remove();
    }
    this.#containers.clear();
  }

  /** Programmatic trigger — burst confetti from the host element. */
  fire(): void {
    if (this.disabled) return;

    const rect = this.host.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    // Create fixed overlay container
    const container = document.createElement('div');
    container.dataset.confettiContainer = '';
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9999;';
    document.body.appendChild(container);
    this.#containers.add(container);

    // Create particles
    const particles: Particle[] = [];
    const spreadRad = (this.spread / 2) * (Math.PI / 180);
    const baseAngle = -Math.PI / 2; // upward

    for (let i = 0; i < this.count; i++) {
      const el = document.createElement('div');
      const s = this.size[0] + Math.random() * (this.size[1] - this.size[0]);
      const color = this.colors[i % this.colors.length];
      const shape = this.shapes === 'mixed'
        ? (Math.random() > 0.5 ? '50%' : '0')
        : (this.shapes === 'circle' ? '50%' : '0');

      el.style.cssText = `position:absolute;width:${s}px;height:${s}px;background:${color};border-radius:${shape};left:${originX}px;top:${originY}px;pointer-events:none;`;
      container.appendChild(el);

      // Random angle within spread, random velocity variance +-30%
      const angle = baseAngle + (Math.random() * 2 - 1) * spreadRad;
      const v = this.velocity * (0.7 + Math.random() * 0.6);

      particles.push({
        el,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20,
        opacity: 1,
        scale: 1,
      });
    }

    // Dispatch event
    this.host.dispatchEvent(new CustomEvent('native:confetti', {
      bubbles: true,
      composed: true,
      detail: { count: this.count, origin: { x: originX, y: originY } },
    }));

    // Animate
    const startTime = performance.now();
    const duration = this.duration;
    const fadeStart = duration * 0.7;

    const step = (now: number): void => {
      const elapsed = now - startTime;

      if (elapsed >= duration) {
        container.remove();
        this.#containers.delete(container);
        return;
      }

      for (const p of particles) {
        // Apply gravity
        p.vy += this.gravity;
        // Air resistance
        p.vx *= 0.98;
        p.vy *= 0.98;
        // Move
        p.x += p.vx;
        p.y += p.vy;
        // Rotate
        p.rotation += p.rotationSpeed;

        // Fade out over last 30%
        if (elapsed > fadeStart) {
          p.opacity = 1 - (elapsed - fadeStart) / (duration - fadeStart);
        }

        p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`;
        p.el.style.opacity = String(p.opacity);
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  // ── Event handlers (arrow functions for auto-bind) ──

  #onClick = (): void => {
    this.fire();
  };
}
