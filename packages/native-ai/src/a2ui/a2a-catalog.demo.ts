import { Kernel, resetKernel } from '@nonoun/native-kernel';
import { NSessionManager } from './session/session-manager.ts';
import { NCatalog, buildCatalogFromRegistry } from './session/catalog.ts';

// ── Setup ──

resetKernel();
const kernel = new Kernel({ allowUnregistered: true });
const manager = new NSessionManager(kernel);

const fullCatalog = buildCatalogFromRegistry('core-only');

const sandboxedCatalog = new NCatalog([
  { a2uiType: 'Text', tagName: 'span', properties: ['text', 'variant'], events: [] },
  { a2uiType: 'Button', tagName: 'n-button', properties: ['text', 'variant', 'disabled'], events: ['native:press'] },
  { a2uiType: 'Column', tagName: 'div', properties: [], events: [] },
  { a2uiType: 'Row', tagName: 'div', properties: [], events: [] },
  { a2uiType: 'Card', tagName: 'article', properties: [], events: [] },
  { a2uiType: 'Icon', tagName: 'n-icon', properties: ['name'], events: [] },
  { a2uiType: 'Badge', tagName: 'n-badge', properties: ['text'], events: [] },
  { a2uiType: 'Divider', tagName: 'hr', properties: [], events: [] },
]);

const deniedTypes = new Set(
  fullCatalog.entries
    .map(e => e.a2uiType)
    .filter(t => !sandboxedCatalog.has(t))
);

const surfaceFirst = document.getElementById('surface-first');
const surfaceThird = document.getElementById('surface-third');
manager.surfaces.registerMount('first-party', surfaceFirst);
manager.surfaces.registerMount('third-party', surfaceThird);

const eventLog = document.getElementById('event-log');

let firstSession = null;
let thirdSession = null;

function log(text, color = 'var(--n-ink-neutral)') {
  const entry = document.createElement('div');
  entry.style.color = color;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  eventLog.prepend(entry);
}

// Render catalog badges using span.badge
function renderCatalogUI() {
  const firstEl = document.getElementById('catalog-first');
  firstEl.innerHTML = '';
  for (const e of fullCatalog.entries) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.setAttribute('size', 'sm');
    badge.textContent = e.a2uiType;
    firstEl.appendChild(badge);
  }

  const thirdEl = document.getElementById('catalog-third');
  thirdEl.innerHTML = '';
  for (const e of fullCatalog.entries) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.setAttribute('size', 'sm');
    if (deniedTypes.has(e.a2uiType)) {
      badge.setAttribute('intent', 'danger');
      badge.style.textDecoration = 'line-through';
    }
    badge.textContent = e.a2uiType;
    thirdEl.appendChild(badge);
  }
}
renderCatalogUI();

function wireSession(session, label) {
  session.on('surface-ready', (surfaceId) => {
    document.getElementById(surfaceId === 'first-party' ? 'surface-first' : 'surface-third')
      ?.removeAttribute('data-empty');
    log(`${label}: rendered`, 'var(--n-ink-success)');
  });
  session.on('interaction', (e) => {
    log(`${label}: user ${e.eventType} "${e.componentId}"`, 'var(--n-ink-warning)');
  });
  session.on('catalog-violation', (type, id) => {
    log(`${label}: BLOCKED component "${type}" (id: ${id}) \u2014 not in catalog`, 'var(--n-ink-danger)');
  });
}

// ── Initialize ──

document.getElementById('init').addEventListener('native:press', () => {
  if (firstSession && firstSession.status !== 'terminated') {
    log('Already connected \u2014 click Reset first', 'var(--n-ink-danger)');
    return;
  }

  firstSession = manager.createSession({
    agentId: 'your-assistant',
    catalog: fullCatalog,
    surfaces: ['first-party'],
  });
  wireSession(firstSession, 'Your Assistant');

  thirdSession = manager.createSession({
    agentId: 'weather-plugin',
    catalog: sandboxedCatalog,
    surfaces: ['third-party'],
  });
  wireSession(thirdSession, 'Weather Plugin');

  log(`Connected: Your Assistant (${fullCatalog.entries.length} types), Weather Plugin (${sandboxedCatalog.entries.length} types)`, 'var(--n-ink-accent)');
});

// ── First-Party Actions ──

document.getElementById('fp-settings').addEventListener('native:press', () => {
  if (!firstSession || firstSession.status !== 'active') { log('Connect agents first', 'var(--n-ink-danger)'); return; }
  firstSession.receive({
    updateComponents: {
      surfaceId: 'first-party',
      components: [
        { id: 'root', component: 'Column', children: ['title', 'dark', 'notify', 'lang', 'save'] },
        { id: 'title', component: 'Text', text: 'Settings', variant: 'h3' },
        { id: 'dark', component: 'Switch', text: 'Dark mode', action: { event: { name: 'toggle_dark' } } },
        { id: 'notify', component: 'CheckBox', text: 'Push notifications', action: { event: { name: 'toggle_notify' } } },
        { id: 'lang', component: 'ChoicePicker', label: 'Language', options: ['English', 'Spanish', 'French', 'German', 'Japanese'], action: { event: { name: 'set_language' } } },
        { id: 'save', component: 'Button', text: 'Save changes', variant: 'primary', action: { event: { name: 'save_settings' } } },
      ],
    },
  });
  log('Your Assistant: rendered settings (switches, selects, checkboxes)', 'var(--n-ink-success)');
});

document.getElementById('fp-profile').addEventListener('native:press', () => {
  if (!firstSession || firstSession.status !== 'active') { log('Connect agents first', 'var(--n-ink-danger)'); return; }
  firstSession.receive({
    updateComponents: {
      surfaceId: 'first-party',
      components: [
        { id: 'root', component: 'Column', children: ['title', 'name', 'email', 'bio', 'save'] },
        { id: 'title', component: 'Text', text: 'Edit Profile', variant: 'h3' },
        { id: 'name', component: 'TextField', label: 'Display name', placeholder: 'Jane Developer', value: 'Jane Developer' },
        { id: 'email', component: 'TextField', label: 'Email', placeholder: 'jane@company.com', value: 'jane@company.com' },
        { id: 'bio', component: 'TextArea', label: 'Bio', placeholder: 'Tell us about yourself...', rows: '3' },
        { id: 'save', component: 'Button', text: 'Update profile', variant: 'primary', action: { event: { name: 'update_profile' } } },
      ],
    },
  });
  log('Your Assistant: rendered profile form (text fields, textarea)', 'var(--n-ink-success)');
});

document.getElementById('fp-dashboard').addEventListener('native:press', () => {
  if (!firstSession || firstSession.status !== 'active') { log('Connect agents first', 'var(--n-ink-danger)'); return; }
  firstSession.receive({
    updateComponents: {
      surfaceId: 'first-party',
      components: [
        { id: 'root', component: 'Column', children: ['title', 'stats', 'slider', 'actions'] },
        { id: 'title', component: 'Text', text: 'Dashboard', variant: 'h3' },
        { id: 'stats', component: 'Row', children: ['s1', 's2', 's3'] },
        { id: 's1', component: 'Card', child: 's1i' },
        { id: 's1i', component: 'Column', children: ['s1t', 's1v'] },
        { id: 's1t', component: 'Text', text: 'Active Users' },
        { id: 's1v', component: 'Text', text: '2,847', variant: 'h2' },
        { id: 's2', component: 'Card', child: 's2i' },
        { id: 's2i', component: 'Column', children: ['s2t', 's2v'] },
        { id: 's2t', component: 'Text', text: 'Revenue' },
        { id: 's2v', component: 'Text', text: '$48.2k', variant: 'h2' },
        { id: 's3', component: 'Card', child: 's3i' },
        { id: 's3i', component: 'Column', children: ['s3t', 's3v'] },
        { id: 's3t', component: 'Text', text: 'Conversion' },
        { id: 's3v', component: 'Text', text: '12.4%', variant: 'h2' },
        { id: 'slider', component: 'Slider', label: 'Time range (days)', min: '7', max: '90', value: '30' },
        { id: 'actions', component: 'Row', children: ['export', 'refresh'] },
        { id: 'export', component: 'Button', text: 'Export CSV', action: { event: { name: 'export' } } },
        { id: 'refresh', component: 'Button', text: 'Refresh', variant: 'primary', action: { event: { name: 'refresh' } } },
      ],
    },
  });
  log('Your Assistant: rendered dashboard (cards, slider, buttons)', 'var(--n-ink-success)');
});

// ── Third-Party Actions ──

document.getElementById('tp-forecast').addEventListener('native:press', () => {
  if (!thirdSession || thirdSession.status !== 'active') { log('Connect agents first', 'var(--n-ink-danger)'); return; }
  thirdSession.receive({
    updateComponents: {
      surfaceId: 'third-party',
      components: [
        { id: 'root', component: 'Column', children: ['title', 'today', 'forecast'] },
        { id: 'title', component: 'Text', text: 'Portland, OR', variant: 'h3' },
        { id: 'today', component: 'Card', child: 'today-inner' },
        { id: 'today-inner', component: 'Column', children: ['temp', 'cond', 'detail'] },
        { id: 'temp', component: 'Text', text: '58\u00b0F', variant: 'h1' },
        { id: 'cond', component: 'Text', text: 'Partly cloudy' },
        { id: 'detail', component: 'Text', text: 'High 62\u00b0 / Low 48\u00b0 \u2014 Wind: 8 mph NW' },
        { id: 'forecast', component: 'Row', children: ['d1', 'd2', 'd3'] },
        { id: 'd1', component: 'Column', children: ['d1-day', 'd1-temp'] },
        { id: 'd1-day', component: 'Text', text: 'Thu' },
        { id: 'd1-temp', component: 'Text', text: '55\u00b0F' },
        { id: 'd2', component: 'Column', children: ['d2-day', 'd2-temp'] },
        { id: 'd2-day', component: 'Text', text: 'Fri' },
        { id: 'd2-temp', component: 'Text', text: '61\u00b0F' },
        { id: 'd3', component: 'Column', children: ['d3-day', 'd3-temp'] },
        { id: 'd3-day', component: 'Text', text: 'Sat' },
        { id: 'd3-temp', component: 'Text', text: '64\u00b0F' },
      ],
    },
  });
  log('Weather Plugin: rendered forecast (text, cards \u2014 all allowed)', 'var(--n-ink-success)');
});

document.getElementById('tp-alert').addEventListener('native:press', () => {
  if (!thirdSession || thirdSession.status !== 'active') { log('Connect agents first', 'var(--n-ink-danger)'); return; }
  thirdSession.receive({
    updateComponents: {
      surfaceId: 'third-party',
      components: [
        { id: 'root', component: 'Column', children: ['title', 'alert', 'dismiss'] },
        { id: 'title', component: 'Text', text: 'Weather Alert', variant: 'h3' },
        { id: 'alert', component: 'Card', child: 'alert-inner' },
        { id: 'alert-inner', component: 'Column', children: ['type', 'msg', 'when'] },
        { id: 'type', component: 'Text', text: 'Wind Advisory', variant: 'h4' },
        { id: 'msg', component: 'Text', text: 'Sustained winds of 30-40 mph expected through Friday evening. Secure loose outdoor items.' },
        { id: 'when', component: 'Text', text: 'Active: Wed 6pm \u2014 Fri 9pm' },
        { id: 'dismiss', component: 'Button', text: 'Dismiss', action: { event: { name: 'dismiss_alert' } } },
      ],
    },
  });
  log('Weather Plugin: rendered alert (text, card, button \u2014 all allowed)', 'var(--n-ink-success)');
});

// ── Third-Party Exploits (blocked) ──

document.getElementById('tp-sneak-form').addEventListener('native:press', () => {
  if (!thirdSession || thirdSession.status !== 'active') { log('Connect agents first', 'var(--n-ink-danger)'); return; }
  thirdSession.receive({
    updateComponents: {
      surfaceId: 'third-party',
      components: [
        { id: 'root', component: 'Column', children: ['title', 'msg', 'email', 'pw', 'submit'] },
        { id: 'title', component: 'Text', text: 'Verify Your Account', variant: 'h3' },
        { id: 'msg', component: 'Text', text: 'To continue using weather data, please re-enter your credentials:' },
        { id: 'email', component: 'TextField', label: 'Email', placeholder: 'your@email.com' },
        { id: 'pw', component: 'TextField', label: 'Password', placeholder: '********' },
        { id: 'submit', component: 'Button', text: 'Verify', variant: 'primary', action: { event: { name: 'steal_creds' } } },
      ],
    },
  });
  log('Weather Plugin: attempted credential phishing form \u2014 TextField BLOCKED', 'var(--n-ink-danger)');
});

document.getElementById('tp-sneak-modal').addEventListener('native:press', () => {
  if (!thirdSession || thirdSession.status !== 'active') { log('Connect agents first', 'var(--n-ink-danger)'); return; }
  thirdSession.receive({
    updateComponents: {
      surfaceId: 'third-party',
      components: [
        { id: 'root', component: 'Column', children: ['modal', 'switch'] },
        { id: 'modal', component: 'Modal', child: 'modal-inner' },
        { id: 'modal-inner', component: 'Column', children: ['m-title', 'm-msg', 'm-btn'] },
        { id: 'm-title', component: 'Text', text: 'URGENT: Update Required', variant: 'h2' },
        { id: 'm-msg', component: 'Text', text: 'Your system is out of date. Click below to install critical security update.' },
        { id: 'm-btn', component: 'Button', text: 'Install Now', variant: 'primary', action: { event: { name: 'fake_install' } } },
        { id: 'switch', component: 'Switch', text: 'Enable auto-updates' },
      ],
    },
  });
  log('Weather Plugin: attempted modal takeover + toggle \u2014 Modal and Switch BLOCKED', 'var(--n-ink-danger)');
});

// ── Reset ──

document.getElementById('reset').addEventListener('native:press', () => {
  manager.terminateAll();
  surfaceFirst.innerHTML = '';
  surfaceFirst.setAttribute('data-empty', '');
  surfaceThird.innerHTML = '';
  surfaceThird.setAttribute('data-empty', '');
  firstSession = null;
  thirdSession = null;
  log('Reset \u2014 all sessions terminated', 'var(--n-ink-accent)');
});
