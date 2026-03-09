const logEl = document.getElementById('log-declarative');
document.getElementById('demo-declarative').addEventListener('native:shortcut', (e) => {
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.textContent = `${new Date().toLocaleTimeString()} — ${e.detail.id} (${e.detail.combo})`;
  logEl.prepend(entry);
});
