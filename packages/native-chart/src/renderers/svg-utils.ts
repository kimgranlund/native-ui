// ---------------------------------------------------------------------------
// SVG Helpers
// ---------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Create an SVG element with optional attributes. */
export function svgEl(tag: string, attrs?: Record<string, string>): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) setAttrs(el, attrs);
  return el;
}

/** Set multiple attributes on an SVG element. */
export function setAttrs(el: SVGElement, attrs: Record<string, string>): void {
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
}

/**
 * Keyed reconciliation — find or create a child SVG element by `data-key`.
 * Updates attributes if the element already exists; creates new if not.
 */
export function reconcile(
  parent: SVGElement,
  key: string,
  tag: string,
  attrs: Record<string, string>,
): SVGElement {
  let el = parent.querySelector(`[data-key="${key}"]`) as SVGElement | null;
  if (!el) {
    el = svgEl(tag, { 'data-key': key, ...attrs });
    parent.appendChild(el);
  } else {
    setAttrs(el, attrs);
  }
  return el;
}

/** Remove all children with `data-key` that are NOT in the given key set. */
export function pruneKeys(parent: SVGElement, validKeys: Set<string>): void {
  const children = parent.querySelectorAll('[data-key]');
  for (const child of children) {
    const key = child.getAttribute('data-key');
    if (key && !validKeys.has(key)) {
      child.remove();
    }
  }
}

/**
 * Generate an SVG path `d` attribute from a list of points.
 * Supports optional cubic bezier smoothing.
 */
export function pathD(points: [number, number][], smooth = false): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`;

  if (!smooth) {
    let d = `M${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      d += `L${points[i][0]},${points[i][1]}`;
    }
    return d;
  }

  // Cubic bezier interpolation (Catmull-Rom → cubic bezier)
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[Math.max(0, i - 2)];
    const p1 = points[i - 1];
    const p2 = points[i];
    const p3 = points[Math.min(points.length - 1, i + 1)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += `C${cp1x},${cp1y},${cp2x},${cp2y},${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Compute the total length of a polyline path (for stroke-dasharray animation). */
export function pathLength(points: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}
