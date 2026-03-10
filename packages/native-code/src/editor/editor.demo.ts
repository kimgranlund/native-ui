// Form demo
const form = document.getElementById('demo-form');
const formOutput = document.getElementById('form-output');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const content = data.get('content');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `FormData "content": ${content?.toString().slice(0, 100)}...`;
  formOutput.prepend(entry);
});

// Event log demo
const eventEditor = document.getElementById('demo-events');
const eventLog = document.getElementById('event-log');
let count = 0;
eventEditor.addEventListener('change', (e) => {
  count++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${count} change — ${e.detail.value.length} chars`;
  eventLog.prepend(entry);
  if (eventLog.children.length > 20) eventLog.lastChild.remove();
});

// Gateway demo
const gatewayEditor = document.getElementById('demo-gateway');
const gatewayStatus = document.getElementById('gateway-status');
const saveBtn = document.getElementById('gateway-save');
const reloadBtn = document.getElementById('gateway-reload');

gatewayEditor.value = '# Data Gateway Demo\n\nEdit this content, then observe the **dirty** state.\n\nThe save and reload buttons wire to `editor.save()` and `editor.reload()`.';

gatewayEditor.addEventListener('dirty-change', (e) => {
  saveBtn.disabled = !e.detail.dirty;
  gatewayStatus.textContent = e.detail.dirty ? 'Unsaved changes' : 'Clean';
});

gatewayEditor.addEventListener('native:save', () => {
  gatewayStatus.textContent = 'Saved!';
});

gatewayEditor.addEventListener('native:error', (e) => {
  gatewayStatus.textContent = `Error: ${e.detail.error}`;
});

saveBtn.addEventListener('native:press', () => gatewayEditor.save());
reloadBtn.addEventListener('native:press', () => gatewayEditor.reload());

// Copy buttons
for (const btn of document.querySelectorAll('.copy-btn')) {
  btn.addEventListener('click', async () => {
    const code = btn.closest('.demo-code')?.querySelector('code');
    if (!code) return;
    await navigator.clipboard.writeText(code.textContent);
    const icon = btn.querySelector('n-icon');
    if (icon) {
      icon.setAttribute('name', 'check');
      setTimeout(() => { icon.setAttribute('name', 'copy'); }, 1500);
    }
  });
}
