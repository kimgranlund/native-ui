// ── Demo: Stamped Panel ──

const panelModels = document.getElementById('demo-panel-models');
if (panelModels) {
  const claudeApiKey = import.meta.env?.VITE_ANTHROPIC_API_KEY
    || import.meta.env?.VITE_CLAUDE_API_KEY
    || null;
  const openAiApiKey = import.meta.env?.VITE_OPENAI_API_KEY || null;

  (panelModels as any).models = [
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'gpt-5.2', label: 'GPT-5.2' },
    { value: 'gpt-5.3-codex', label: 'GPT-5.3 Codex' },
    { value: 'gpt-5.2-codex', label: 'GPT-5.2 Codex' },
  ];

  const applyGatewayForModel = (model: string) => {
    const isOpenAiModel = model.startsWith('gpt-') || model.startsWith('chatgpt-');
    if (isOpenAiModel) {
      if (!openAiApiKey) {
        (panelModels as any).gateway = 'mock';
        (panelModels as any).gatewayUrl = 'mock';
        console.warn('[native-chat demo] Missing OpenAI API key. Set VITE_OPENAI_API_KEY in .env and restart Vite.');
        return;
      }
      (panelModels as any).gateway = 'openai';
      (panelModels as any).gatewayUrl = '/api/openai';
      (panelModels as any).gatewayConfig = {
        apiKey: openAiApiKey,
        model,
        maxTokens: 1024,
      };
      return;
    }

    if (!claudeApiKey) {
      (panelModels as any).gateway = 'mock';
      (panelModels as any).gatewayUrl = 'mock';
      console.warn('[native-chat demo] Missing Claude API key. Set VITE_ANTHROPIC_API_KEY or VITE_CLAUDE_API_KEY in .env and restart Vite.');
      return;
    }
    (panelModels as any).gateway = 'claude';
    (panelModels as any).gatewayUrl = '/api/anthropic';
    (panelModels as any).gatewayConfig = {
      apiKey: claudeApiKey,
      model,
      maxTokens: 1024,
    };
  };

  const initialModel = claudeApiKey ? 'claude-haiku-4-5' : (openAiApiKey ? 'gpt-5.2' : 'claude-haiku-4-5');
  (panelModels as any).model = initialModel;
  applyGatewayForModel(initialModel);

  panelModels.addEventListener('native:model-change', (e) => {
    const selected = (e as CustomEvent).detail?.value;
    if (typeof selected !== 'string' || selected.length === 0) return;
    applyGatewayForModel(selected);
  });
}

// ── Demo: Feed Messages ──

const feedMsg1 = document.getElementById('demo-feed-msg1');
if (feedMsg1) (feedMsg1 as any).content = "Hello! I'm your AI assistant. How can I help you today?";

const feedMsg2 = document.getElementById('demo-feed-msg2');
if (feedMsg2) (feedMsg2 as any).content = 'Can you explain how web components work?';

const feedMsg3 = document.getElementById('demo-feed-msg3');
if (feedMsg3) (feedMsg3 as any).content = `Web components are a set of **browser APIs** that let you create reusable custom elements. The main specs are:

1. **Custom Elements** — define new HTML tags with \`customElements.define()\`
2. **Shadow DOM** — encapsulated DOM and styling
3. **HTML Templates** — reusable markup fragments

Here's a simple example:

\`\`\`js
class MyButton extends HTMLElement {
  connectedCallback() {
    this.textContent = 'Click me';
  }
}
customElements.define('my-button', MyButton);
\`\`\`

They work in **all modern browsers** without a framework.`;

const feedMsgA1 = document.getElementById('demo-feed-msg-a1');
if (feedMsgA1) (feedMsgA1 as any).content = 'Hey, quick question';

const feedMsgA2 = document.getElementById('demo-feed-msg-a2');
if (feedMsgA2) (feedMsgA2 as any).content = "What's the difference between shadow DOM and light DOM?";

const feedMsgA3 = document.getElementById('demo-feed-msg-a3');
if (feedMsgA3) (feedMsgA3 as any).content = `**Light DOM** is the regular DOM tree — children you write in HTML. **Shadow DOM** is an encapsulated tree attached via \`attachShadow()\`.

Key differences:

- Shadow DOM styles don't leak out
- External styles don't reach in (unless using CSS custom properties or \`::part()\`)
- Shadow DOM creates a _flat tree_ for rendering`;

const feedMsgA4 = document.getElementById('demo-feed-msg-a4');
if (feedMsgA4) (feedMsgA4 as any).content = 'This library (`native-ui`) deliberately avoids Shadow DOM — all components use **light DOM** so CSS custom properties cascade naturally.';

// ── Demo: Message Text ──

const mdFull = document.getElementById('demo-md-full');
if (mdFull) {
  (mdFull as any).content = `## Web Components

Here's what you need to know about **web components**:

- **Custom Elements** — define new HTML tags
- **Shadow DOM** — encapsulated styling
- **HTML Templates** — declarative structure

Inline \`code\` works too. And here's a fenced block:

\`\`\`js
class MyEl extends HTMLElement {
  connectedCallback() {
    this.textContent = 'Hello';
  }
}
\`\`\`

> Web components work in all modern browsers without a framework.

Visit [MDN](https://developer.mozilla.org) for more.`;
}

const mdPlain = document.getElementById('demo-md-plain');
if (mdPlain) {
  (mdPlain as any).content = 'This is plain text. No **bold** or *italic* formatting is applied. Links like https://example.com stay as text.';
}

// ── Demo: Seed Chips ──

const seeds = document.getElementById('demo-seeds');
if (seeds) {
  (seeds as any).options = [
    { value: 'explain', label: 'Explain this code' },
    { value: 'refactor', label: 'Suggest refactoring' },
    { value: 'test', label: 'Write tests' },
    { value: 'docs', label: 'Generate docs' },
  ];
}

const seedsDisabled = document.getElementById('demo-seeds-disabled');
if (seedsDisabled) {
  (seedsDisabled as any).options = [
    { value: 'explain', label: 'Explain this code' },
    { value: 'refactor', label: 'Suggest refactoring' },
  ];
}

// ── Demo: Structured Input ──

const structSingle = document.getElementById('demo-structured-single');
if (structSingle) {
  (structSingle as any).options = [
    { value: 'ts', label: 'TypeScript' },
    { value: 'js', label: 'JavaScript' },
    { value: 'py', label: 'Python' },
    { value: 'rs', label: 'Rust' },
  ];
}

const structMulti = document.getElementById('demo-structured-multi');
if (structMulti) {
  (structMulti as any).options = [
    { value: 'signals', label: 'Reactive signals' },
    { value: 'traits', label: 'Composable traits' },
    { value: 'tokens', label: 'CSS token system' },
    { value: 'a11y', label: 'Accessibility' },
  ];
}

// ── Demo: Starter Surface ──

const starterSeeds = document.getElementById('starter-seeds');
if (starterSeeds) {
  (starterSeeds as any).options = [
    { value: 'summarize', label: 'Summarize this page' },
    { value: 'draft', label: 'Draft a reply' },
    { value: 'explain', label: "Explain like I'm 5" },
  ];
}

const starterStructured = document.getElementById('starter-structured');
if (starterStructured) {
  (starterStructured as any).options = [
    { value: 'code', label: 'Code review' },
    { value: 'writing', label: 'Writing help' },
    { value: 'research', label: 'Research' },
  ];
}

const starterSeedsCompact = document.getElementById('starter-seeds-compact');
if (starterSeedsCompact) {
  (starterSeedsCompact as any).options = [
    { value: 'summarize', label: 'Summarize' },
    { value: 'draft', label: 'Draft reply' },
  ];
}

const starterStructuredCompact = document.getElementById('starter-structured-compact');
if (starterStructuredCompact) {
  (starterStructuredCompact as any).options = [
    { value: 'code', label: 'Code review' },
    { value: 'writing', label: 'Writing' },
  ];
}

// ── Demo: GenUI ──

const genuiInline = document.getElementById('demo-genui-inline');
if (genuiInline) {
  (genuiInline as any).schema = {
    tag: 'article',
    children: [
      { tag: 'header', children: [
        { tag: 'span', text: 'Generated Card' },
      ]},
      { tag: 'section', children: [
        { tag: 'p', text: 'This UI was rendered from a schema object.' },
      ]},
      { tag: 'footer', children: [
        { tag: 'n-button', text: 'Confirm', attributes: { variant: 'primary', intent: 'accent' } },
        { tag: 'n-button', text: 'Cancel', attributes: { variant: 'ghost' } },
      ]},
    ],
  };
}

const genuiLightbox = document.getElementById('demo-genui-lightbox');
if (genuiLightbox) {
  (genuiLightbox as any).schema = {
    tag: 'article',
    children: [
      { tag: 'header', children: [
        { tag: 'span', text: 'Interactive Form' },
      ]},
      { tag: 'section', children: [
        { tag: 'p', text: 'Click "Open" to view in a dialog overlay.' },
        { tag: 'n-button', text: 'Submit', attributes: { variant: 'primary', intent: 'accent' } },
      ]},
    ],
  };
}

// ── Event logging ──

document.addEventListener('native:seed-select', (e) => {
  console.log('seed-select:', (e as CustomEvent).detail);
});
document.addEventListener('native:structured-submit', (e) => {
  console.log('structured-submit:', (e as CustomEvent).detail);
});
document.addEventListener('native:message-action', (e) => {
  console.log('message-action:', (e as CustomEvent).detail);
});
document.addEventListener('native:activity-toggle', (e) => {
  console.log('activity-toggle:', (e as CustomEvent).detail);
});

// ── Copy buttons ──

for (const btn of document.querySelectorAll('.copy-btn')) {
  btn.addEventListener('click', async () => {
    const code = btn.closest('.demo-code')?.querySelector('code');
    if (!code) return;
    await navigator.clipboard.writeText(code.textContent!);
    const icon = btn.querySelector('n-icon');
    if (icon) {
      icon.setAttribute('name', 'check');
      setTimeout(() => { icon.setAttribute('name', 'copy'); }, 1500);
    }
  });
}
