import { ShortcutController } from './shortcut-controller.ts';

// ── Demo 1: Global shortcuts (imperative) ──

const log1 = document.getElementById('log-global');
const host1 = document.getElementById('demo-global');

new ShortcutController(host1, {
  shortcuts: [
    { id: 'search', combo: 'mod+k', handler: () => appendLog(log1, 'search', 'mod+k') },
    { id: 'help', combo: 'shift+?', handler: () => appendLog(log1, 'help', 'shift+?') },
    { id: 'dismiss', combo: 'escape', handler: () => appendLog(log1, 'dismiss', 'escape') },
  ],
  global: true,
});

// ── Demo 2: Scoped shortcuts (imperative) ──

const log2 = document.getElementById('log-scoped');
const host2 = document.getElementById('demo-scoped');

new ShortcutController(host2, {
  shortcuts: [
    { id: 'save', combo: 'mod+s', handler: () => appendLog(log2, 'save', 'mod+s') },
    { id: 'undo', combo: 'mod+z', handler: () => appendLog(log2, 'undo', 'mod+z') },
  ],
});

// ── Demo 3: Editable shortcut ──

const log3 = document.getElementById('log-editable');
const host3 = document.getElementById('demo-editable');

new ShortcutController(host3, {
  shortcuts: [
    { id: 'submit', combo: 'mod+enter', handler: () => appendLog(log3, 'submit', 'mod+enter'), allowEditable: true },
  ],
});

// ── Demo 4: Declarative log ──

const logEl = document.getElementById('log-declarative');
document.getElementById('demo-declarative').addEventListener('native:shortcut', (e) => {
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.textContent = `${new Date().toLocaleTimeString()} — ${e.detail.id} (${e.detail.combo})`;
  logEl.prepend(entry);
});

// ── Logging ──

function appendLog(el: HTMLElement, id: string, combo: string): void {
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.textContent = `${new Date().toLocaleTimeString()} — ${id} (${combo})`;
  el.prepend(entry);
}
