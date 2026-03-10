import { createEditorView, EditorView } from './index.ts';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';

// ── Factory demo ──

createEditorView(document.getElementById('factory-demo'), {
  doc: `import { createEditorView } from '@nonoun/native-code';

const view = createEditorView(document.getElementById('editor'), {
  doc: 'console.log("hello");',
  readonly: true,
});

// Add a language extension for syntax highlighting:
import { javascript } from '@codemirror/lang-javascript';

const view2 = createEditorView(container, {
  doc: source,
  extensions: [javascript()],
});`,
  extensions: [javascript()],
});

// ── JavaScript demo ──

createEditorView(document.getElementById('js-demo'), {
  doc: `/**
 * Fibonacci sequence generator using memoization.
 */
function fibonacci(n, memo = new Map()) {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n);

  const result = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
  memo.set(n, result);
  return result;
}

// Generate first 20 numbers
const sequence = Array.from({ length: 20 }, (_, i) => fibonacci(i));
console.log(sequence); // [0, 1, 1, 2, 3, 5, 8, 13, 21, ...]

// ES2025 pattern matching (proposal)
const classify = (n) => {
  if (n === 0) return 'zero';
  if (n > 0) return 'positive';
  return 'negative';
};

export { fibonacci, classify };`,
  extensions: [javascript()],
});

// ── HTML demo ──

createEditorView(document.getElementById('html-demo'), {
  doc: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Hello NativeUI</title>
  <link rel="stylesheet" href="native-ui.css" />
</head>
<body>
  <native-dashboard-spa>
    <main>
      <h1>Welcome</h1>
      <p>A zero-specificity web component library.</p>

      <n-button variant="primary" size="md">
        <span slot="label">Get Started</span>
      </n-button>

      <n-input placeholder="Search..." size="md">
        <n-icon name="magnifying-glass" slot="leading"></n-icon>
      </n-input>

      <n-select placeholder="Pick a country">
        <n-listbox popover>
          <n-option value="us">United States</n-option>
          <n-option value="se">Sweden</n-option>
          <n-option value="jp">Japan</n-option>
        </n-listbox>
      </n-select>
    </main>
  </native-dashboard-spa>
</body>
</html>`,
  extensions: [html()],
});

// ── CSS demo ──

createEditorView(document.getElementById('css-demo'), {
  doc: `@layer ui {
  /* Button component — zero-specificity attribute selectors */

  :where(n-button) {
    display: inline-grid;
    grid-template-columns: auto auto auto;
    align-items: center;
    gap: calc(var(--_space) * 2);
    min-height: var(--_min-height);
    padding-block: var(--_space);
    padding-inline: calc(var(--_space-k) * var(--_space));
    border-radius: var(--_radius);
    background: var(--_background, var(--_panel));
    color: var(--_color, var(--_ink));
    border: 1px solid var(--_border-color, var(--_border-muted));
    font-size: var(--_font-size);
    font-weight: var(--n-font-weight-button, 500);
    cursor: pointer;
    user-select: none;
    transition:
      background 150ms ease,
      color 150ms ease,
      border-color 150ms ease,
      opacity 150ms ease,
      transform 150ms ease;
  }

  :where(n-button):hover,
  :where(n-button)[force-hover] {
    background: var(--_background-hover, var(--_panel-hover));
    color: var(--_color-hover, var(--_ink-hover));
  }

  :where(n-button):active,
  :where(n-button)[force-active] {
    transform: scale(0.97);
  }
}`,
  extensions: [css()],
});

// ── Markdown demo ──

createEditorView(document.getElementById('md-demo'), {
  doc: `# NativeUI Components

A **zero-specificity** web component library built on OKLCH color science.

## Getting Started

\`\`\`bash
npm install @nonoun/native-ui
\`\`\`

### Usage

Import the CSS foundation and register components:

\`\`\`html
<link rel="stylesheet" href="native-ui.css" />
\`\`\`

Then use components in your markup:

- \`<n-button>\` — pressable button with variant/size/intent
- \`<n-input>\` — text input with leading/trailing slots
- \`<n-select>\` — dropdown selector with popover

> All components use \`:where()\` selectors for **zero specificity**.

### Three-Tier Token Model

| Tier | Prefix | Purpose |
|------|--------|---------|
| Public | \`--ui-*\` | Themeable scale on \`:root\` |
| Local | \`--_*\` | Resolved by attribute selectors |
| Component | — | Reads locals directly |

---

See the [documentation](https://native-ui.dev) for the full API.`,
  extensions: [markdown()],
});

// ── Read-only demo ──

createEditorView(document.getElementById('readonly-demo'), {
  doc: `// This editor is read-only — you can select text but cannot edit.
const greeting = 'Hello from native-codemirror!';
console.log(greeting);`,
  extensions: [javascript()],
  readonly: true,
});

// ── Custom extensions demo ──

const log = document.getElementById('change-log');
let count = 0;

createEditorView(document.getElementById('custom-demo'), {
  doc: `// Type here to see change events in the log below\nconst x = 42;`,
  extensions: [
    javascript(),
    EditorView.updateListener.of(update => {
      if (update.docChanged) {
        count++;
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `#${count} change — ${update.state.doc.length} chars`;
        log.prepend(entry);
        if (log.children.length > 20) log.lastChild.remove();
      }
    }),
  ],
});

// ── <native-codemirror> element demos ──

// Add JS language to the basic demo
const elBasic = document.getElementById('el-basic');
await customElements.whenDefined('native-codemirror');
await elBasic.ready;
elBasic.extensions = [javascript()];

// Events demo
const elEvents = document.getElementById('el-events');
const elLog = document.getElementById('el-event-log');
let elCount = 0;

elEvents.addEventListener('native:input', () => {
  elCount++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${elCount} native:input — ${elEvents.value.length} chars`;
  elLog.prepend(entry);
  if (elLog.children.length > 30) elLog.lastChild.remove();
});

elEvents.addEventListener('native:change', (e) => {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.style.fontWeight = 'bold';
  entry.textContent = `native:change — committed (${e.detail.value.length} chars)`;
  elLog.prepend(entry);
});
