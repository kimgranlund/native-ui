import '../nav/native-dashboard.ts';
import './icon.ts';
import '../components/button/button.ts';
import '../components/select/select.ts';
import '../components/listbox/listbox.ts';
import '../components/input/input.ts';

// Register ALL icons
import './phosphor/index.ts';

import { registerIcon, getIconNames } from './registry.ts';

// Dynamic name change
const dynamicIcon = document.getElementById('dynamic-icon');
const iconPicker = document.getElementById('icon-picker');
iconPicker?.addEventListener('native:change', (e: Event) => {
  dynamicIcon?.setAttribute('name', (e as CustomEvent).detail.value);
});

// Late registration demo
const registerBtn = document.getElementById('register-btn');
const lateLog = document.getElementById('late-log');

function log(msg: string): void {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = msg;
  lateLog?.prepend(entry);
}

log('n-icon[name="late-demo"] created — icon not yet registered, renders empty.');

registerBtn?.addEventListener('native:press', () => {
  registerIcon('late-demo', '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></svg>');
  log('registerIcon("late-demo", ...) called — icon should now appear!');
  (registerBtn as HTMLElement & { disabled: boolean }).disabled = true;
});

// ── All Icons Grid ──

const grid = document.getElementById('all-icons-grid')!;
const searchInput = document.getElementById('icon-search')!;
const countEl = document.getElementById('icon-count')!;

// Get all registered names, sorted, excluding -fill variants for cleaner display
const allNames = getIconNames().sort();

function renderGrid(filter: string): void {
  const q = filter.toLowerCase().trim();
  const matched = q ? allNames.filter((n) => n.includes(q)) : allNames;

  countEl.textContent = `${matched.length} icons`;

  // Virtual render — only create visible elements
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();

  for (const name of matched) {
    const cell = document.createElement('div');
    cell.className = 'icon-cell';
    cell.innerHTML = `<n-icon name="${name}"></n-icon><span>${name}</span>`;
    frag.appendChild(cell);
  }

  grid.appendChild(frag);
}

searchInput.addEventListener('native:input', (e: Event) => {
  renderGrid((e as CustomEvent).detail.value);
});

renderGrid('');
