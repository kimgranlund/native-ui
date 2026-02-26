import type { Signal } from '../reactivity/types.ts';

export interface BaseOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Validates a JSON string → typed option array.
 * Filters out entries missing `value` or `label` strings.
 */
export function parseDataOptions<T extends BaseOption>(
  json: string,
  componentName: string,
): T[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (o: unknown): o is T =>
        typeof o === 'object' && o !== null &&
        typeof (o as BaseOption).value === 'string' &&
        typeof (o as BaseOption).label === 'string',
    );
  } catch {
    console.warn(`<${componentName}>: invalid options JSON`, json);
    return [];
  }
}

/**
 * Fetches remote options with abort-guard and stale-response protection.
 * Aborts any in-flight request before starting a new one.
 * Returns the new AbortController for the caller to store.
 */
export async function fetchDataOptions<T extends BaseOption>(
  url: string,
  previous: AbortController | null,
  target: Signal<T[]>,
  componentName: string,
): Promise<AbortController> {
  previous?.abort();
  const controller = new AbortController();

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      console.warn(`<${componentName}>: fetch failed (${res.status}) for ${url}`);
      return controller;
    }
    const data = await res.json();
    // WHY: Guard against stale response if src changed or element disconnected
    if (controller.signal.aborted) return controller;
    const opts = Array.isArray(data) ? data : [];
    target.value = opts.filter(
      (o: unknown): o is T =>
        typeof o === 'object' && o !== null &&
        typeof (o as BaseOption).value === 'string' &&
        typeof (o as BaseOption).label === 'string',
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return controller;
    console.warn(`<${componentName}>: fetch error`, err);
  }

  return controller;
}
