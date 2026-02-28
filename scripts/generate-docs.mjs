// AUTO-GENERATED docs script — reads CEM + source files to produce per-component/controller .md files.
// Usage: node scripts/generate-docs.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CEM_PATH = join(ROOT, 'dist/custom-elements.json');
const TRAITS_DIR = join(ROOT, 'src/traits');
const COMPONENTS_DIR = join(ROOT, 'src/components');
const CONTAINERS_DIR = join(ROOT, 'src/containers');

// ── CEM parsing ──

function loadCEM() {
  const raw = readFileSync(CEM_PATH, 'utf8');
  return JSON.parse(raw);
}

// ── CSS extraction ──

function extractSlots(cssPath) {
  if (!existsSync(cssPath)) return [];
  const css = readFileSync(cssPath, 'utf8');
  const slots = new Set();
  const re = /\[slot=["']([^"']+)["']\]/g;
  let m;
  while ((m = re.exec(css)) !== null) slots.add(m[1]);
  return [...slots].sort();
}

function extractCSSTokens(cssPath) {
  if (!existsSync(cssPath)) return [];
  const css = readFileSync(cssPath, 'utf8');
  const tokens = new Set();
  const re = /var\((--ui-[^,)]+)\)/g;
  let m;
  while ((m = re.exec(css)) !== null) tokens.add(m[1]);
  return [...tokens].sort();
}

function extractCSSAttributes(cssPath) {
  if (!existsSync(cssPath)) return [];
  const css = readFileSync(cssPath, 'utf8');
  const attrs = new Map(); // name → Set<values>
  // Match [attr] and [attr="value"] selectors, excluding slot/popover/hidden/aria/data/role
  const re = /\[([a-z][\w-]*)(?:=["']([^"']+)["'])?\]/g;
  const skip = new Set(['slot', 'popover', 'hidden', 'open', 'role', 'tabindex', 'contenteditable', 'draggable']);
  let m;
  while ((m = re.exec(css)) !== null) {
    const name = m[1];
    if (skip.has(name) || name.startsWith('aria-') || name.startsWith('data-') || name.startsWith('force-')) continue;
    if (!attrs.has(name)) attrs.set(name, new Set());
    if (m[2]) attrs.get(name).add(m[2]);
  }
  return [...attrs.entries()].map(([name, values]) => ({
    name,
    values: [...values].sort(),
  }));
}

function extractCSSDisplay(cssPath) {
  if (!existsSync(cssPath)) return null;
  const css = readFileSync(cssPath, 'utf8');
  // Match the base rule display value (first display: ... in the file)
  const m = css.match(/display:\s*([^;]+)/);
  return m ? m[1].trim() : null;
}

// ── Controller parsing ──

function parseController(filePath) {
  if (!existsSync(filePath)) return null;
  const src = readFileSync(filePath, 'utf8');

  // Extract class JSDoc
  const classDocMatch = src.match(/\/\*\*\s*([^*](?:[^*]|\*(?!\/))*?)\*\/\s*export class (\w+)/);
  const description = classDocMatch ? classDocMatch[1].replace(/\s*\*\s*/g, ' ').trim() : '';
  const className = classDocMatch
    ? classDocMatch[2]
    : basename(filePath, '.ts')
        .replace(/-(\w)/g, (_, c) => c.toUpperCase())
        .replace(/^\w/, (c) => c.toUpperCase());

  // Extract options interface
  const optionsMatch = src.match(/export interface (\w+Options)\s*\{([^}]+)\}/s);
  const optionsName = optionsMatch ? optionsMatch[1] : null;
  const optionsFields = [];
  if (optionsMatch) {
    const body = optionsMatch[2];
    const fieldRe = /(?:\/\*\*\s*(.*?)\s*\*\/\s*)?(\w+)(\?)?:\s*([^;]+);/g;
    let fm;
    while ((fm = fieldRe.exec(body)) !== null) {
      optionsFields.push({
        name: fm[2],
        optional: !!fm[3],
        type: fm[4].trim(),
        description: fm[1] ? fm[1].replace(/\s*\*\s*/g, ' ').trim() : '',
      });
    }
  }

  // Extract ALL events dispatched (with or without detail)
  const events = [];
  const seenEvents = new Set();

  // Pass 1: events WITH detail
  const eventWithDetailRe = /new CustomEvent\(['"]([^'"]+)['"]\s*,\s*\{[^}]*detail:\s*\{([^}]*)\}/g;
  let em;
  while ((em = eventWithDetailRe.exec(src)) !== null) {
    if (seenEvents.has(em[1])) continue;
    seenEvents.add(em[1]);
    const raw = em[2].replace(/\s+/g, ' ').trim();
    const fields = raw
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
      .map((f) => {
        const [key] = f.split(':').map((s) => s.trim());
        return key;
      })
      .join(', ');
    events.push({ name: em[1], detail: fields });
  }

  // Pass 2: events WITHOUT detail
  const eventRe = /new CustomEvent\(['"]([^'"]+)['"]/g;
  while ((em = eventRe.exec(src)) !== null) {
    if (seenEvents.has(em[1])) continue;
    seenEvents.add(em[1]);
    events.push({ name: em[1], detail: '' });
  }

  // Extract public methods (not starting with #, not constructor, not keywords)
  const SKIP_METHODS = new Set([
    'constructor', 'if', 'for', 'while', 'switch', 'return',
    'const', 'let', 'var', 'new', 'else', 'try', 'catch', 'typeof',
  ]);
  const methods = [];
  const methodRe = /^\s+(?:readonly\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*([^\s{]+))?\s*\{/gm;
  let mm;
  while ((mm = methodRe.exec(src)) !== null) {
    const name = mm[1];
    if (name.startsWith('#') || SKIP_METHODS.has(name)) continue;
    const params = mm[2].trim();
    const returnType = mm[3] || 'void';
    if (!methods.find((m) => m.name === name)) {
      methods.push({ name, params, returnType });
    }
  }

  // Extract getters
  const properties = [];
  const getterRe = /^\s+get\s+(\w+)\s*\(\s*\)\s*(?::\s*(\S+))?\s*\{/gm;
  let gm;
  while ((gm = getterRe.exec(src)) !== null) {
    if (gm[1].startsWith('#')) continue;
    // Check if there's a matching setter
    const hasSetter = new RegExp(`^\\s+set\\s+${gm[1]}\\s*\\(`, 'm').test(src);
    properties.push({
      name: gm[1],
      type: gm[2] || 'unknown',
      readonly: !hasSetter,
    });
  }

  // Always include destroy if present and not already captured
  if (src.includes('destroy()') && !methods.find((m) => m.name === 'destroy')) {
    methods.push({ name: 'destroy', params: '', returnType: 'void' });
  }

  return { className, description, optionsName, optionsFields, events, methods, properties };
}

// ── CEM member extraction for components ──

const SKIP_MEMBERS = new Set([
  'onFormDisabled', 'onFormReset', 'onFormStateRestore', 'role',
  'setup', 'teardown', 'addEffect', 'deferChildren', 'getTraitController',
  'connectedCallback', 'disconnectedCallback', 'attributeChangedCallback',
  'formAssociatedCallback', 'formDisabledCallback', 'formResetCallback', 'formStateRestoreCallback',
]);

function extractPublicMembers(decl) {
  const members = decl.members || [];
  const publicMethods = [];
  const publicFields = [];

  for (const m of members) {
    if (m.privacy === 'private' || m.privacy === 'protected') continue;
    if (m.inheritedFrom) continue;
    if (m.name.startsWith('#') || m.name.startsWith('_')) continue;
    if (SKIP_MEMBERS.has(m.name)) continue;

    if (m.kind === 'method') {
      const params = (m.parameters || [])
        .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type?.text || 'unknown'}`)
        .join(', ');
      publicMethods.push({
        name: m.name,
        params,
        returnType: m.return?.type?.text || 'void',
      });
    } else if (m.kind === 'field') {
      // Skip fields that duplicate attributes
      const isAttr = (decl.attributes || []).some((a) => a.name === m.name);
      if (isAttr) continue;
      publicFields.push({
        name: m.name,
        type: m.type?.text || 'unknown',
        readonly: !!m.readonly,
        default: m.default || '',
      });
    }
  }

  return { publicMethods, publicFields };
}

// ── Markdown generation: Components ──

function generateComponentMd(elements, dir) {
  const lines = [`<!-- AUTO-GENERATED by scripts/generate-docs.mjs — DO NOT EDIT -->`, ``];

  // Primary element first (shortest tag name or the directory name)
  const dirName = basename(dir);
  elements.sort((a, b) => {
    if (a.tagName === dirName) return -1;
    if (b.tagName === dirName) return 1;
    return a.tagName.length - b.tagName.length;
  });

  for (let i = 0; i < elements.length; i++) {
    const { tagName, cls, attrs, events, slots, cssTokens, publicMethods, publicFields } = elements[i];
    const level = i === 0 ? '#' : '##';

    lines.push(`${level} ${tagName}`, ``);

    if (cls.description) {
      lines.push(`> ${cls.description}`, ``);
    }

    lines.push(`**Class:** \`${cls.name}\``, ``);

    // Attributes
    if (attrs.length > 0) {
      lines.push(`${level}# Attributes`, ``);
      lines.push(`| Attribute | Type | Description |`);
      lines.push(`|-----------|------|-------------|`);
      for (const attr of attrs) {
        const type = attr.type?.text || 'string';
        const desc = attr.description || '';
        lines.push(`| \`${attr.name}\` | \`${type}\` | ${desc} |`);
      }
      lines.push(``);
    }

    // Public fields (from CEM, not duplicating attributes)
    if (publicFields.length > 0) {
      lines.push(`${level}# Properties`, ``);
      lines.push(`| Property | Type | Readonly | Description |`);
      lines.push(`|----------|------|----------|-------------|`);
      for (const f of publicFields) {
        lines.push(`| \`${f.name}\` | \`${f.type}\` | ${f.readonly ? 'yes' : 'no'} | ${f.default ? `Default: \`${f.default}\`` : ''} |`);
      }
      lines.push(``);
    }

    // Public methods (from CEM)
    if (publicMethods.length > 0) {
      lines.push(`${level}# Methods`, ``);
      lines.push(`| Method | Parameters | Returns |`);
      lines.push(`|--------|------------|---------|`);
      for (const m of publicMethods) {
        lines.push(`| \`${m.name}()\` | \`${m.params || '—'}\` | \`${m.returnType}\` |`);
      }
      lines.push(``);
    }

    // Events
    if (events.length > 0) {
      lines.push(`${level}# Events`, ``);
      lines.push(`| Event | Description |`);
      lines.push(`|-------|-------------|`);
      for (const event of events) {
        lines.push(`| \`${event.name}\` | ${event.description || ''} |`);
      }
      lines.push(``);
    }

    // Slots
    if (slots.length > 0) {
      lines.push(`${level}# Slots`, ``);
      lines.push(`| Slot |`);
      lines.push(`|------|`);
      for (const slot of slots) {
        lines.push(`| \`${slot}\` |`);
      }
      lines.push(``);
    }

    // CSS tokens (only on primary element)
    if (i === 0 && cssTokens.length > 0) {
      lines.push(`${level}# CSS Tokens`, ``);
      lines.push(`Public \`--ui-*\` custom properties consumed by this component:`, ``);
      for (const token of cssTokens) {
        lines.push(`- \`${token}\``);
      }
      lines.push(``);
    }

    // Separator between elements
    if (i < elements.length - 1) {
      lines.push(`---`, ``);
    }
  }

  // Usage (after all elements)
  const primary = elements[0];
  lines.push(`## Usage`, ``);
  lines.push('```html');
  lines.push(`<${primary.tagName}></${primary.tagName}>`);
  lines.push('```');
  lines.push(``);

  return lines.join('\n');
}

// ── Markdown generation: CSS-only containers ──

function generateCSSOnlyMd(tagName, cssPath) {
  const display = extractCSSDisplay(cssPath);
  const attrs = extractCSSAttributes(cssPath);
  const slots = extractSlots(cssPath);
  const tokens = extractCSSTokens(cssPath);

  const lines = [`<!-- AUTO-GENERATED by scripts/generate-docs.mjs — DO NOT EDIT -->`, ``, `# ${tagName}`, ``];
  lines.push(`**CSS-only container** — no JavaScript class.`, ``);

  if (display) lines.push(`**Display:** \`${display}\``, ``);

  if (attrs.length > 0) {
    lines.push(`## Attributes`, ``);
    lines.push(`| Attribute | Values |`);
    lines.push(`|-----------|--------|`);
    for (const attr of attrs) {
      const vals = attr.values.length > 0 ? attr.values.map((v) => `\`${v}\``).join(', ') : '_(boolean)_';
      lines.push(`| \`${attr.name}\` | ${vals} |`);
    }
    lines.push(``);
  }

  if (slots.length > 0) {
    lines.push(`## Slots`, ``);
    lines.push(`| Slot |`);
    lines.push(`|------|`);
    for (const slot of slots) {
      lines.push(`| \`${slot}\` |`);
    }
    lines.push(``);
  }

  if (tokens.length > 0) {
    lines.push(`## CSS Tokens`, ``);
    for (const token of tokens) {
      lines.push(`- \`${token}\``);
    }
    lines.push(``);
  }

  lines.push(`## Usage`, ``);
  lines.push('```html');
  lines.push(`<${tagName}></${tagName}>`);
  lines.push('```');
  lines.push(``);

  return lines.join('\n');
}

// ── Markdown generation: Controllers ──

function generateControllerMd(info) {
  const lines = [`<!-- AUTO-GENERATED by scripts/generate-docs.mjs — DO NOT EDIT -->`, ``, `# ${info.className}`, ``];

  if (info.description) {
    lines.push(`> ${info.description}`, ``);
  }

  // Constructor
  if (info.optionsName) {
    lines.push(`## Constructor`, ``);
    lines.push('```ts');
    lines.push(`new ${info.className}(host: HTMLElement, options?: ${info.optionsName})`);
    lines.push('```');
    lines.push(``);
  } else {
    lines.push(`## Constructor`, ``);
    lines.push('```ts');
    lines.push(`new ${info.className}(host: HTMLElement)`);
    lines.push('```');
    lines.push(``);
  }

  // Options
  if (info.optionsFields.length > 0) {
    lines.push(`## Options`, ``);
    lines.push(`| Option | Type | Required | Description |`);
    lines.push(`|--------|------|----------|-------------|`);
    for (const f of info.optionsFields) {
      lines.push(`| \`${f.name}\` | \`${f.type}\` | ${f.optional ? 'no' : 'yes'} | ${f.description} |`);
    }
    lines.push(``);
  }

  // Properties (getters/setters)
  if (info.properties.length > 0) {
    lines.push(`## Properties`, ``);
    lines.push(`| Property | Type | Readonly |`);
    lines.push(`|----------|------|----------|`);
    for (const p of info.properties) {
      lines.push(`| \`${p.name}\` | \`${p.type}\` | ${p.readonly ? 'yes' : 'no'} |`);
    }
    lines.push(``);
  }

  // Events
  if (info.events.length > 0) {
    lines.push(`## Events Dispatched`, ``);
    lines.push(`| Event | Detail |`);
    lines.push(`|-------|--------|`);
    for (const e of info.events) {
      const detail = e.detail ? `\`{ ${e.detail} }\`` : '_(none)_';
      lines.push(`| \`${e.name}\` | ${detail} |`);
    }
    lines.push(``);
  }

  // Methods
  if (info.methods.length > 0) {
    lines.push(`## Methods`, ``);
    lines.push(`| Method | Parameters | Returns |`);
    lines.push(`|--------|------------|---------|`);
    for (const m of info.methods) {
      lines.push(`| \`${m.name}()\` | \`${m.params || '—'}\` | \`${m.returnType}\` |`);
    }
    lines.push(``);
  }

  // Usage
  lines.push(`## Usage`, ``);
  lines.push('```ts');
  lines.push(`import { ${info.className} } from '@nonoun/native-ui';`);
  if (info.optionsName) {
    lines.push(`const ctrl = new ${info.className}(element, { /* options */ });`);
  } else {
    lines.push(`const ctrl = new ${info.className}(element);`);
  }
  lines.push(`// In teardown: ctrl.destroy();`);
  lines.push('```');
  lines.push(``);

  return lines.join('\n');
}

// ── Main ──

function main() {
  const cem = loadCEM();
  let componentCount = 0;
  let controllerCount = 0;
  let cssOnlyCount = 0;

  // 1. Group CEM elements by directory
  const dirGroups = new Map(); // dir → [{tagName, cls, mod}]
  for (const mod of cem.modules) {
    for (const decl of mod.declarations || []) {
      if (!decl.tagName) continue;
      const srcPath = join(ROOT, mod.path);
      const dir = dirname(srcPath);
      if (!dirGroups.has(dir)) dirGroups.set(dir, []);
      dirGroups.get(dir).push({ decl, mod });
    }
  }

  // 2. Generate combined README per directory
  for (const [dir, entries] of dirGroups) {
    const elements = [];

    // Find CSS file for this directory (for slots + tokens)
    const dirName = basename(dir);
    const cssFile = join(dir, `${dirName}.css`);

    for (const { decl, mod } of entries) {
      const tagCssFile = join(dir, `${decl.tagName}.css`);
      const cssPath = existsSync(tagCssFile) ? tagCssFile : existsSync(cssFile) ? cssFile : null;

      const slots = cssPath ? extractSlots(cssPath) : [];
      const cssTokens = cssPath ? extractCSSTokens(cssPath) : [];
      const { publicMethods, publicFields } = extractPublicMembers(decl);

      elements.push({
        tagName: decl.tagName,
        cls: decl,
        attrs: decl.attributes || [],
        events: decl.events || [],
        slots,
        cssTokens,
        publicMethods,
        publicFields,
      });
    }

    const md = generateComponentMd(elements, dir);
    writeFileSync(join(dir, 'README.md'), md);
    componentCount += elements.length;
  }

  // 3. Generate CSS-only container docs
  for (const containerDir of [COMPONENTS_DIR, CONTAINERS_DIR]) {
    if (!existsSync(containerDir)) continue;
    for (const name of readdirSync(containerDir)) {
      const dir = join(containerDir, name);
      // Skip directories that already got a CEM-based README
      if (dirGroups.has(dir)) continue;
      // Look for a CSS file
      const cssFile = join(dir, `${name}.css`);
      if (!existsSync(cssFile)) continue;
      // This is a CSS-only component/container
      const md = generateCSSOnlyMd(name, cssFile);
      writeFileSync(join(dir, 'README.md'), md);
      cssOnlyCount++;
    }
  }

  // 4. Generate controller docs
  const docsDir = join(TRAITS_DIR, 'docs');
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });

  const controllerFiles = readdirSync(TRAITS_DIR).filter(
    (f) => f.endsWith('-controller.ts') && !f.endsWith('.test.ts'),
  );

  for (const file of controllerFiles) {
    const filePath = join(TRAITS_DIR, file);
    const info = parseController(filePath);
    if (!info) continue;

    const md = generateControllerMd(info);
    const outName = file.replace('.ts', '.md');
    writeFileSync(join(docsDir, outName), md);
    controllerCount++;
  }

  console.log(
    `Docs generated: ${componentCount} elements (${dirGroups.size} directories), ${cssOnlyCount} CSS-only, ${controllerCount} controllers`,
  );
}

main();
