import '../../nav/native-dashboard.ts';
import '../../components/button/button.ts';
import './controller.ts';
import { NativeElement, ContextRequestEvent, define } from '../../index.ts';

// WHY: Use underscore-prefixed fields instead of private #fields because
// Rolldown's dep scanner can't parse private class fields in inline scripts.

// ── Consumer element: reads store signals and displays them ──

class StoreConsumerDemo extends NativeElement {
  _store = null;
  get store() { return this._store; }

  setup() {
    super.setup();
    const key = this.getAttribute('context-key') || 'user';
    const label = this.getAttribute('label') || '';

    this.dispatchEvent(new ContextRequestEvent(key, (store) => {
      this._store = store;
      this.addEffect(() => {
        const entries = [];
        for (const k of store.keys()) {
          entries.push(`${k}: ${store.get(k).value}`);
        }
        this.innerHTML = `<div class="demo-output">${label ? `<strong>${label}</strong> — ` : ''}${entries.join(', ') || '<em>empty</em>'}</div>`;
      });
    }));
  }
}
define('store-consumer-demo', StoreConsumerDemo);

// ── State consumer: shows loading/error ──

class StoreStateDemo extends NativeElement {
  _store = null;
  get store() { return this._store; }

  setup() {
    super.setup();
    const key = this.getAttribute('context-key') || 'api-data';

    this.dispatchEvent(new ContextRequestEvent(key, (store) => {
      this._store = store;
      this.addEffect(() => {
        const loading = store.loading.value;
        const error = store.error.value;
        const entries = [];
        for (const k of store.keys()) {
          entries.push(`${k}: ${store.get(k).value}`);
        }

        let status = '';
        if (loading) status = '<span style="color:var(--n-ink-info)">Loading...</span>';
        else if (error) status = `<span style="color:var(--n-ink-danger)">${error}</span>`;
        else status = entries.join(', ') || '<em>no data</em>';

        this.innerHTML = `<div class="demo-output">${status}</div>`;
      });
    }));
  }
}
define('store-state-demo', StoreStateDemo);

// ═══════════════════════════════════════════
// DEMO 1: Static — mutate store from buttons
// ═══════════════════════════════════════════

const staticConsumer = document.getElementById('demo-static');
document.getElementById('btn-change-name')?.addEventListener('native:press', () => {
  staticConsumer?.store?.set('name', 'Bob');
});
document.getElementById('btn-change-role')?.addEventListener('native:press', () => {
  staticConsumer?.store?.set('role', 'Editor');
});

// ═══════════════════════════════════════════
// DEMO 2: Fetch — use data: URL to simulate
// ═══════════════════════════════════════════

const fetchLog = document.getElementById('fetch-log');
function appendLog(msg) {
  if (!fetchLog) return;
  const line = document.createElement('div');
  line.textContent = `${new Date().toLocaleTimeString()} — ${msg}`;
  fetchLog.appendChild(line);
  fetchLog.scrollTop = fetchLog.scrollHeight;
  while (fetchLog.children.length > 20) fetchLog.removeChild(fetchLog.firstChild);
}

document.getElementById('btn-fetch')?.addEventListener('native:press', () => {
  const provider = document.getElementById('fetch-provider');
  const json = JSON.stringify({ name: 'Charlie', email: 'charlie@example.com', plan: 'Pro' });
  const dataUrl = `data:application/json,${encodeURIComponent(json)}`;
  provider?.setAttribute('src', dataUrl);
  appendLog('Fetch triggered via src attribute');
});

// Watch for fetch consumer to update
const fetchConsumer = document.getElementById('demo-fetch');
if (fetchConsumer) {
  const observer = new MutationObserver(() => {
    appendLog('Consumer updated: ' + fetchConsumer.textContent?.trim());
  });
  observer.observe(fetchConsumer, { childList: true, subtree: true, characterData: true });
}

// ═══════════════════════════════════════════
// DEMO 4: Loading/error states
// ═══════════════════════════════════════════

document.getElementById('btn-load-ok')?.addEventListener('native:press', () => {
  const provider = document.getElementById('state-provider');
  const json = JSON.stringify({ status: 'active', items: 42 });
  const dataUrl = `data:application/json,${encodeURIComponent(json)}`;
  provider?.setAttribute('src', dataUrl);
});

document.getElementById('btn-load-fail')?.addEventListener('native:press', () => {
  const provider = document.getElementById('state-provider');
  // Use an unreachable URL that will fail
  provider?.setAttribute('src', 'http://localhost:1/nonexistent');
});
