import { UIElement } from '../core/ui-element.ts';
import { uid } from '../core/uid.ts';

/* ── Color-space conversion helpers ── */

/** Parse a computed `rgb(...)` / `rgba(...)` string into [r, g, b, a] (0–255, 0–1). */
function parseRGB(rgb: string): [number, number, number, number] {
  const m = rgb.match(/[\d.]+/g);
  if (!m || m.length < 3) return [0, 0, 0, 1];
  return [Number(m[0]), Number(m[1]), Number(m[2]), m[3] !== undefined ? Number(m[3]) : 1];
}

/** Relative luminance (ITU-R BT.709). Returns true if light. */
function isLightColor(r: number, g: number, b: number): boolean {
  const lin = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2] > 0.4;
}

/** Convert 0–255 component to 2-digit hex. */
function hex2(n: number): string {
  return Math.round(n).toString(16).padStart(2, '0');
}

/** sRGB → linear. */
function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** linear → sRGB (0–1 range). */
// function linearToSrgb(c: number): number {
//   return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
// }

/** sRGB (0–255) → OKLCH via OKLab. Returns [L (0–1), C, H (degrees)]. */
function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  // sRGB → linear
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  // Linear sRGB → LMS (via OKLab matrix)
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  // Cube root
  const l1 = Math.cbrt(l_);
  const m1 = Math.cbrt(m_);
  const s1 = Math.cbrt(s_);

  // LMS → OKLab
  const L = 0.2104542553 * l1 + 0.7936177850 * m1 - 0.0040720468 * s1;
  const a = 1.9779984951 * l1 - 2.4285922050 * m1 + 0.4505937099 * s1;
  const bLab = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.8086757660 * s1;

  // OKLab → OKLCH
  const C = Math.sqrt(a * a + bLab * bLab);
  let H = Math.atan2(bLab, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return [L, C, H];
}

/** sRGB (0–255) → HSL. Returns [H (0–360), S (0–100), L (0–100)]. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = ((g - b) / d + 6) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

/** sRGB (0–255) → HSB/HSV. Returns [H (0–360), S (0–100), B (0–100)]. */
function rgbToHsb(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const brightness = max * 100;
  if (max === 0) return [0, 0, brightness];
  const s = (d / max) * 100;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, brightness];
}

/* ── Format helpers ── */

function fmtOklch(r: number, g: number, b: number, a: number): string {
  const [L, C, H] = rgbToOklch(r, g, b);
  const base = `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(4)} ${H.toFixed(1)})`;
  return a < 1 ? `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(4)} ${H.toFixed(1)} / ${a.toFixed(2)})` : base;
}

function fmtHexa(r: number, g: number, b: number, a: number): string {
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return a < 1 ? `${base}${hex2(Math.round(a * 255))}` : base;
}

function fmtRgba(r: number, g: number, b: number, a: number): string {
  return a < 1
    ? `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(2)})`
    : `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function fmtHsla(r: number, g: number, b: number, a: number): string {
  const [h, s, l] = rgbToHsl(r, g, b);
  return a < 1
    ? `hsla(${h.toFixed(0)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%, ${a.toFixed(2)})`
    : `hsl(${h.toFixed(0)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

function fmtHsba(r: number, g: number, b: number, _a: number): string {
  const [h, s, bri] = rgbToHsb(r, g, b);
  return `hsb(${h.toFixed(0)}, ${s.toFixed(1)}%, ${bri.toFixed(1)}%)`;
}

interface ColorFormat {
  label: string;
  fn: (r: number, g: number, b: number, a: number) => string;
}

const COLOR_FORMATS: ColorFormat[] = [
  { label: 'OKLCH', fn: fmtOklch },
  { label: 'HEX', fn: fmtHexa },
  { label: 'RGB', fn: fmtRgba },
  { label: 'HSL', fn: fmtHsla },
  { label: 'HSB', fn: fmtHsba },
];

/* ── Element ── */

export class DSColorSwatch extends UIElement {
  static observedAttributes = ['token', 'name'];

  #popover: HTMLElement | null = null;
  #label: HTMLElement | null = null;
  #anchorName = '';

  get token(): string { return this.getAttribute('token') ?? ''; }
  set token(val: string) { this.setAttribute('token', val); }

  get name(): string { return this.getAttribute('name') ?? ''; }
  set name(val: string) { this.setAttribute('name', val); }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'token' && this.isConnected) {
      this.style.background = val ? `var(${val})` : '';
      this.title = `${this.name}\n${val}`;
      requestAnimationFrame(() => this.#syncContrast());
    }
    if (name === 'name' && this.#label) {
      this.#label.textContent = val ?? '';
      this.title = `${val}\n${this.token}`;
    }
  }

  setup(): void {
    super.setup();

    // Set background from token
    if (this.token) {
      this.style.background = `var(${this.token})`;
      this.title = `${this.name}\n${this.token}`;
    }

    // Render label
    const label = document.createElement('span');
    label.className = 'ds-swatch-label';
    label.textContent = this.name;
    this.#label = label;
    this.appendChild(label);

    // Create popover panel for color info
    this.#anchorName = uid('swatch');
    this.style.setProperty('anchor-name', `--${this.#anchorName}`);

    const popover = document.createElement('div');
    popover.className = 'ds-swatch-popover';
    popover.setAttribute('popover', 'auto');
    popover.style.setProperty('position-anchor', `--${this.#anchorName}`);
    this.#popover = popover;
    this.appendChild(popover);

    // Click to toggle popover
    this.addEventListener('click', this.#onClick);

    // Listen for theme/variable changes to refresh
    this.addEventListener('ds-change', this.#onUpdate);
    this.addEventListener('ds-theme-change', this.#onUpdate);

    requestAnimationFrame(() => this.#syncContrast());
  }

  teardown(): void {
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('ds-change', this.#onUpdate);
    this.removeEventListener('ds-theme-change', this.#onUpdate);
    this.#popover = null;
    this.#label = null;
    this.innerHTML = '';
    super.teardown();
  }

  /** Refresh background and contrast from current token value. */
  refresh(): void {
    if (this.token) {
      this.style.background = `var(${this.token})`;
    }
    this.#syncContrast();
  }

  #onUpdate = (): void => {
    requestAnimationFrame(() => this.refresh());
  };

  #onClick = (e: MouseEvent): void => {
    // Don't trigger if clicking inside the popover
    if (this.#popover && (e.target as HTMLElement).closest('.ds-swatch-popover')) return;

    if (!this.#popover) return;
    this.#buildPopoverContent();
    try { this.#popover.showPopover(); } catch { /* already open */ }
  };

  #syncContrast(): void {
    const bg = getComputedStyle(this).backgroundColor;
    const [r, g, b] = parseRGB(bg);
    if (this.#label) {
      this.#label.style.color = isLightColor(r, g, b) ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)';
    }
  }

  #buildPopoverContent(): void {
    if (!this.#popover) return;
    this.#popover.innerHTML = '';

    const bg = getComputedStyle(this).backgroundColor;
    const [r, g, b, a] = parseRGB(bg);

    // Token name header
    const header = document.createElement('div');
    header.className = 'ds-swatch-popover-header';
    header.textContent = this.token;
    this.#popover.appendChild(header);

    // Color format rows
    for (const fmt of COLOR_FORMATS) {
      const value = fmt.fn(r, g, b, a);

      const row = document.createElement('button');
      row.className = 'ds-swatch-popover-row';
      row.type = 'button';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'ds-swatch-popover-label';
      labelSpan.textContent = fmt.label;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'ds-swatch-popover-value';
      valueSpan.textContent = value;

      row.append(labelSpan, valueSpan);

      row.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value).then(() => {
          valueSpan.textContent = 'Copied!';
          setTimeout(() => { valueSpan.textContent = value; }, 1200);
        });
      });

      this.#popover.appendChild(row);
    }
  }
}
