export function uid(prefix = 'ui'): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
