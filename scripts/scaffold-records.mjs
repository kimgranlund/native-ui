// scaffold-records.mjs — Auto-generates YAML records from CEM + CSS + TS sources.
// Usage: node scripts/scaffold-records.mjs
// Reuses extraction logic from generate-docs.mjs.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CEM_PATH = join(ROOT, 'dist/custom-elements.json');
const TRAITS_DIR = join(ROOT, 'packages/native-traits/src/traits');
const COMPONENTS_DIR = join(ROOT, 'src/components');
const CONTAINERS_DIR = join(ROOT, 'src/containers');
const CONTROLLERS_DIR = join(ROOT, 'src/controllers');
const RECORDS_DIR = join(ROOT, 'records');

// ── Extraction helpers (shared with generate-docs.mjs) ──

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
  const tokens = new Map(); // token → default value (if found)
  // Match both var(--n-*) usage and --n-*: value declarations
  const usageRe = /var\((--n-[^,)]+)\)/g;
  let m;
  while ((m = usageRe.exec(css)) !== null) {
    if (!tokens.has(m[1])) tokens.set(m[1], null);
  }
  // Extract declarations: --n-token: value
  const declRe = /(--n-[\w-]+)\s*:\s*([^;]+);/g;
  while ((m = declRe.exec(css)) !== null) {
    tokens.set(m[1], m[2].trim());
  }
  return [...tokens.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, defaultVal]) => ({ name, default: defaultVal }));
}

function extractCSSAttributes(cssPath) {
  if (!existsSync(cssPath)) return [];
  const css = readFileSync(cssPath, 'utf8');
  const attrs = new Map();
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
  const m = css.match(/display:\s*([^;]+)/);
  return m ? m[1].trim() : null;
}

function extractImportedControllers(dir) {
  const controllers = [];
  try {
    const elementFiles = readdirSync(dir).filter((f) => f.endsWith('-element.ts'));
    for (const file of elementFiles) {
      const src = readFileSync(join(dir, file), 'utf8');
      const re = /import\s*\{[^}]*?(\w+Controller)\b[^}]*\}\s*from\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        controllers.push(m[1]);
      }
    }
  } catch { /* ignore */ }
  return controllers;
}

function extractKeyboardInteractions(dir) {
  const keys = [];
  try {
    const elementFiles = readdirSync(dir).filter((f) => f.endsWith('-element.ts'));
    for (const file of elementFiles) {
      const src = readFileSync(join(dir, file), 'utf8');
      const re1 = /(?:e\.key\s*===?\s*|case\s+)['"](\w+)['"]/g;
      let m;
      const seen = new Set();
      while ((m = re1.exec(src)) !== null) {
        const key = m[1] === ' ' ? 'Space' : m[1];
        if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Space', 'Tab', 'Home', 'End', 'Delete', 'Backspace'].includes(key)) {
          if (!seen.has(key)) { seen.add(key); keys.push(key); }
        }
      }
    }
  } catch { /* ignore */ }
  return keys;
}

function extractFormAssociation(dir) {
  try {
    const elementFiles = readdirSync(dir).filter((f) => f.endsWith('-element.ts'));
    for (const file of elementFiles) {
      const src = readFileSync(join(dir, file), 'utf8');
      if (src.includes('FormAssociable')) return true;
    }
  } catch { /* ignore */ }
  return false;
}

function extractAriaRole(dir) {
  try {
    const elementFiles = readdirSync(dir).filter((f) => f.endsWith('-element.ts'));
    for (const file of elementFiles) {
      const src = readFileSync(join(dir, file), 'utf8');
      const m = src.match(/(?:this\.#internals\.role|this\.setAttribute\('role')\s*=?\s*['"](\w+)['"]/);
      if (m) return m[1];
    }
  } catch { /* ignore */ }
  return null;
}

function inferTokenPurpose(token) {
  const t = token.replace('--n-', '');
  if (t.includes('background') && t.includes('hover')) return 'Background on hover';
  if (t.includes('background') && t.includes('active')) return 'Background on press';
  if (t.includes('background') && t.includes('disabled')) return 'Background when disabled';
  if (t.includes('background')) return 'Background color';
  if (t.includes('border-color') && t.includes('hover')) return 'Border on hover';
  if (t.includes('border-color') && t.includes('active')) return 'Border on press';
  if (t.includes('border-color') && t.includes('disabled')) return 'Border when disabled';
  if (t.includes('border-color')) return 'Border color';
  if (t.includes('border') && t.includes('muted')) return 'Muted border color';
  if (t.includes('color') && t.includes('hover')) return 'Text on hover';
  if (t.includes('color') && t.includes('disabled')) return 'Text when disabled';
  if (t.includes('color')) return 'Text/foreground color';
  if (t.includes('ink') && t.includes('hover')) return 'Ink on hover';
  if (t.includes('ink') && t.includes('disabled')) return 'Ink when disabled';
  if (t.includes('ink')) return 'Ink (text) color';
  if (t.includes('font-size')) return 'Font size';
  if (t.includes('font-weight')) return 'Font weight';
  if (t.includes('letter-spacing')) return 'Letter spacing';
  if (t.includes('line-height')) return 'Line height';
  if (t.includes('radius')) return 'Border radius';
  if (t.includes('size')) return 'Component height';
  if (t.includes('space-k')) return 'Inline padding multiplier';
  if (t.includes('space')) return 'Block/gap spacing';
  if (t.includes('duration')) return 'Transition duration';
  if (t.includes('easing')) return 'Transition easing';
  if (t.includes('focus-ring')) return 'Focus ring style';
  if (t.includes('button')) return 'Button surface color';
  if (t.includes('ground')) return 'Elevation/surface context';
  if (t.includes('min-height')) return 'Minimum height';
  if (t.includes('gap')) return 'Gap between items';
  return '';
}

// ── Controller parsing (for traits) ──

function parseController(filePath) {
  if (!existsSync(filePath)) return null;
  const src = readFileSync(filePath, 'utf8');

  let description = '';
  let className = '';
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/^export class (\w+)/);
    if (!classMatch) continue;
    className = classMatch[1];
    let jEnd = i - 1;
    while (jEnd >= 0 && !lines[jEnd].trim()) jEnd--;
    if (jEnd >= 0 && lines[jEnd].trim().endsWith('*/')) {
      let jStart = jEnd;
      while (jStart > 0 && !lines[jStart].includes('/**')) jStart--;
      const block = lines.slice(jStart, jEnd + 1).join('\n');
      const cleaned = block.replace(/^\/\*\*/, '').replace(/\*\/$/, '');
      const jsdocLines = [];
      for (const l of cleaned.split('\n')) {
        const trimmed = l.replace(/^\s*\*\s?/, '').trim();
        if (!trimmed || trimmed === '/') continue;
        if (trimmed.startsWith('@')) continue;
        jsdocLines.push(trimmed);
      }
      description = jsdocLines.join(' ').trim();
    }
    break;
  }

  // Options interface
  const optionsFields = [];
  const optionsInterfaceRe = /export interface (\w+Options)\s*\{([\s\S]*?)^\}/m;
  const optionsMatch = src.match(optionsInterfaceRe);
  if (optionsMatch) {
    const body = optionsMatch[2];
    const fieldRe = /(?:\/\*\*\s*([\s\S]*?)\s*\*\/\s*)?(\w+)(\?)?:\s*([^;]+);/g;
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

  // Events
  const events = [];
  const seenEvents = new Set();
  const eventWithDetailRe = /new CustomEvent\(['"]([^'"]+)['"]\s*,\s*\{[^}]*detail:\s*\{([^}]*)\}/g;
  let em;
  while ((em = eventWithDetailRe.exec(src)) !== null) {
    if (seenEvents.has(em[1])) continue;
    seenEvents.add(em[1]);
    const raw = em[2].replace(/\s+/g, ' ').trim();
    const fields = {};
    for (const f of raw.split(',').map(s => s.trim()).filter(Boolean)) {
      const [key] = f.split(':').map(s => s.trim());
      if (key) fields[key] = { type: 'string' };
    }
    events.push({ name: em[1], detail: Object.keys(fields).length > 0 ? fields : null });
  }
  const eventRe = /new CustomEvent\(['"]([^'"]+)['"]/g;
  while ((em = eventRe.exec(src)) !== null) {
    if (seenEvents.has(em[1])) continue;
    seenEvents.add(em[1]);
    events.push({ name: em[1], detail: null });
  }

  // Methods
  const methods = [];
  const SKIP = new Set(['constructor', 'if', 'for', 'while', 'switch', 'return', 'const', 'let', 'var', 'new', 'else', 'try', 'catch', 'typeof']);
  const methodRe = /^\s+(?:readonly\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*([^\s{]+))?\s*\{/gm;
  let mm;
  while ((mm = methodRe.exec(src)) !== null) {
    if (mm[1].startsWith('#') || SKIP.has(mm[1])) continue;
    if (!methods.find(m => m.name === mm[1])) {
      methods.push({ name: mm[1], params: mm[2].trim() || null, returns: mm[3] || 'void' });
    }
  }
  if (src.includes('destroy()') && !methods.find(m => m.name === 'destroy')) {
    methods.push({ name: 'destroy', params: null, returns: 'void' });
  }

  return { className, description, optionsFields, events, methods, filePath };
}

// ── YAML helpers ──

function toYaml(obj) {
  return YAML.stringify(obj, { lineWidth: 120, defaultStringType: 'PLAIN', nullStr: '' });
}

function writeRecord(path, obj) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, toYaml(obj));
}

// ── Component record builder ──

function buildComponentRecord(decl, mod, dir) {
  const dirName = basename(dir);
  const tagName = decl.tagName;
  const cssFile = join(dir, `${tagName}.css`);
  const altCssFile = join(dir, `${dirName}.css`);
  const cssPath = existsSync(cssFile) ? cssFile : existsSync(altCssFile) ? altCssFile : null;

  const record = {
    component: decl.name,
    tag: tagName,
    category: dir.includes('/containers/') ? 'container' : 'component',
    description: decl.description || '',
  };

  // Source files — use CEM module path for the element file
  const srcBase = `src/${dir.includes('/containers/') ? 'containers' : 'components'}/${dirName}`;
  record.source = {};
  // Use the actual module path from CEM (accurate per-element)
  if (mod.path) record.source.element = mod.path;
  if (cssPath) record.source.css = `${srcBase}/${basename(cssPath)}`;
  const regFile = readdirSync(dir).find(f => f === `n-${dirName}.ts` || f === `${dirName}.ts`);
  if (regFile) record.source.registration = `${srcBase}/${regFile}`;
  const demoFile = readdirSync(dir).find(f => f.endsWith('.html'));
  if (demoFile) record.source.demo = `${srcBase}/${demoFile}`;

  // JS attributes (observedAttributes)
  const cemAttrs = decl.attributes || [];
  if (cemAttrs.length > 0) {
    record.attributes = {};
    for (const attr of cemAttrs) {
      const entry = { type: attr.type?.text || 'string' };
      if (attr.default) entry.default = attr.default;
      if (attr.description) entry.description = attr.description;
      record.attributes[attr.name] = entry;
    }
  }

  // CSS-only attributes
  if (cssPath) {
    const cssAttrs = extractCSSAttributes(cssPath);
    if (cssAttrs.length > 0) {
      record.css_attributes = {};
      // Filter out attrs already in JS attributes
      const jsAttrNames = new Set(cemAttrs.map(a => a.name));
      for (const attr of cssAttrs) {
        if (jsAttrNames.has(attr.name)) continue;
        const entry = {};
        if (attr.values.length > 0) {
          entry.type = 'enum';
          entry.values = attr.values;
        } else {
          entry.type = 'boolean';
        }
        entry.description = '';
        record.css_attributes[attr.name] = entry;
      }
      if (Object.keys(record.css_attributes).length === 0) delete record.css_attributes;
    }
  }

  // Events
  const cemEvents = decl.events || [];
  // Also extract events from TS source
  const tsEvents = [];
  const elementSrcPath = mod.path ? join(ROOT, mod.path) : null;
  if (elementSrcPath && existsSync(elementSrcPath)) {
    const src = readFileSync(elementSrcPath, 'utf8');
    const seenEvents = new Set(cemEvents.map(e => e.name));
    const eventRe = /new CustomEvent\(['"]([^'"]+)['"]/g;
    let em;
    while ((em = eventRe.exec(src)) !== null) {
      if (!seenEvents.has(em[1])) {
        seenEvents.add(em[1]);
        tsEvents.push({ name: em[1] });
      }
    }
  }
  const allEvents = [...cemEvents, ...tsEvents];
  if (allEvents.length > 0) {
    record.events = {};
    for (const evt of allEvents) {
      const entry = {};
      if (evt.description) entry.description = evt.description;
      record.events[evt.name] = entry;
    }
  }

  // Slots
  if (cssPath) {
    const slots = extractSlots(cssPath);
    if (slots.length > 0) {
      record.slots = {};
      for (const slot of slots) {
        record.slots[slot] = { description: '' };
      }
    }
  }

  // CSS tokens
  if (cssPath) {
    const tokens = extractCSSTokens(cssPath);
    if (tokens.length > 0) {
      record.css_tokens = {};
      for (const t of tokens) {
        record.css_tokens[t.name] = {
          description: inferTokenPurpose(t.name),
          ...(t.default ? { default: t.default } : {}),
        };
      }
    }
  }

  // Controllers
  const controllers = extractImportedControllers(dir);
  if (controllers.length > 0) {
    record.controllers = controllers;
  }

  // Traits compatibility (empty — needs manual fill)
  record.traits = { compatible: [], incompatible: [] };

  // A11y
  const role = extractAriaRole(dir);
  const formAssociated = extractFormAssociation(dir);
  const keyboard = extractKeyboardInteractions(dir);
  record.a11y = {};
  if (role) record.a11y.role = role;
  if (formAssociated) record.a11y.form_associated = true;
  if (keyboard.length > 0) {
    record.a11y.keyboard = keyboard.map(k => ({ key: k, action: '' }));
  }
  if (Object.keys(record.a11y).length === 0) delete record.a11y;

  // Behavior (empty — needs manual fill)
  record.behavior = [];

  // Compose (empty — needs manual fill)
  record.compose = { children: [], parents: [] };

  return record;
}

// ── CSS-only container record builder ──

function buildCSSOnlyRecord(tagName, cssPath, dir) {
  const dirName = basename(dir);
  const display = extractCSSDisplay(cssPath);
  const cssAttrs = extractCSSAttributes(cssPath);
  const slots = extractSlots(cssPath);
  const tokens = extractCSSTokens(cssPath);

  const srcBase = `src/${dir.includes('/containers/') ? 'containers' : 'components'}/${dirName}`;
  const record = {
    component: null,
    tag: tagName,
    category: dir.includes('/containers/') ? 'container' : 'component',
    css_only: true,
    description: '',
    source: {
      css: `${srcBase}/${basename(cssPath)}`,
    },
  };

  const demoFile = readdirSync(dir).find(f => f.endsWith('.html'));
  if (demoFile) record.source.demo = `${srcBase}/${demoFile}`;

  if (display) record.display = display;

  if (cssAttrs.length > 0) {
    record.css_attributes = {};
    for (const attr of cssAttrs) {
      if (attr.values.length > 0) {
        record.css_attributes[attr.name] = { type: 'enum', values: attr.values, description: '' };
      } else {
        record.css_attributes[attr.name] = { type: 'boolean', description: '' };
      }
    }
  }

  if (slots.length > 0) {
    record.slots = {};
    for (const slot of slots) {
      record.slots[slot] = { description: '' };
    }
  }

  if (tokens.length > 0) {
    record.css_tokens = {};
    for (const t of tokens) {
      record.css_tokens[t.name] = {
        description: inferTokenPurpose(t.name),
        ...(t.default ? { default: t.default } : {}),
      };
    }
  }

  return record;
}

// ── Trait record builder ──

function buildTraitRecord(info, traitDir) {
  const traitName = basename(traitDir);
  const srcBase = `packages/native-traits/src/traits/${traitName}`;

  const record = {
    trait: traitName,
    controller: info.className,
    description: info.description || '',
    source: {
      controller: `${srcBase}/${basename(info.filePath)}`,
    },
  };

  // Find adapter
  const adapterFile = readdirSync(traitDir).find(f => f.endsWith('-adapter.ts'));
  if (adapterFile) record.source.adapter = `${srcBase}/${adapterFile}`;
  const demoFile = readdirSync(traitDir).find(f => f.endsWith('.html'));
  if (demoFile) record.source.demo = `${srcBase}/${demoFile}`;
  const testFile = readdirSync(traitDir).find(f => f.endsWith('.test.ts'));
  if (testFile) record.source.test = `${srcBase}/${testFile}`;

  // Options
  if (info.optionsFields.length > 0) {
    record.options = {};
    for (const f of info.optionsFields) {
      const entry = { type: f.type };
      if (!f.optional) entry.required = true;
      if (f.description) entry.description = f.description;
      record.options[f.name] = entry;
    }
  }

  // Injected events
  if (info.events.length > 0) {
    record.injected_events = {};
    for (const e of info.events) {
      record.injected_events[e.name] = { detail: e.detail };
    }
  }

  // Methods
  if (info.methods.length > 0) {
    record.methods = {};
    for (const m of info.methods) {
      record.methods[m.name] = { returns: m.returns };
      if (m.params) record.methods[m.name].params = m.params;
    }
  }

  // Consumption patterns
  const adapterName = traitName.replace(/-(\w)/g, (_, c) => c.toUpperCase()) + 'able';
  record.consumption = {
    imperative: `new ${info.className}(element, options)`,
    provider: `<n-controller traits="${traitName}">`,
    self_trait: `<n-button traits="${traitName}">`,
  };

  // Behavior (empty — needs manual fill)
  record.behavior = [];

  // A11y (empty — needs manual fill)
  record.a11y = { keyboard: [] };

  return record;
}

// ── Main ──

function main() {
  console.log('Loading CEM...');
  const cem = JSON.parse(readFileSync(CEM_PATH, 'utf8'));

  let componentCount = 0;
  let cssOnlyCount = 0;
  let traitCount = 0;
  let controllerCount = 0;

  // 1. Group CEM elements by directory
  const dirGroups = new Map();
  for (const mod of cem.modules) {
    for (const decl of mod.declarations || []) {
      if (!decl.tagName) continue;
      const srcPath = join(ROOT, mod.path);
      const dir = dirname(srcPath);
      if (!dirGroups.has(dir)) dirGroups.set(dir, []);
      dirGroups.get(dir).push({ decl, mod });
    }
  }

  // 2. Component/container records from CEM
  for (const [dir, entries] of dirGroups) {
    const dirName = basename(dir);
    for (const { decl, mod } of entries) {
      const record = buildComponentRecord(decl, mod, dir);
      const outDir = dir.includes('/containers/') ? 'containers' : 'components';
      // Use tag name for filename when multiple elements share a directory
      const fileName = entries.length > 1 ? decl.tagName.replace(/^n-/, '') : dirName;
      writeRecord(join(RECORDS_DIR, outDir, `${fileName}.yaml`), record);
      componentCount++;
    }
  }

  // 3. CSS-only elements (containers/components without CEM entries)
  const isContainersDir = (d) => d === CONTAINERS_DIR;
  for (const containerDir of [COMPONENTS_DIR, CONTAINERS_DIR]) {
    if (!existsSync(containerDir)) continue;
    for (const name of readdirSync(containerDir)) {
      const dir = join(containerDir, name);
      if (dirGroups.has(dir)) continue;
      if (!statSync(dir).isDirectory()) continue;
      if (name === '__tests__') continue;

      // Look for CSS file
      const cssFile = join(dir, `${name}.css`);
      if (!existsSync(cssFile)) {
        // Check for shared CSS — still create a minimal record
        const hasDemo = readdirSync(dir).some(f => f.endsWith('.html'));
        if (hasDemo) {
          const srcBase = `src/${isContainersDir(containerDir) ? 'containers' : 'components'}/${name}`;
          const record = {
            component: null,
            tag: `n-${name}`,
            category: containerDir.includes('/containers/') ? 'container' : 'component',
            css_only: true,
            description: '',
            source: {
              demo: `${srcBase}/${readdirSync(dir).find(f => f.endsWith('.html'))}`,
            },
          };
          const outDir = isContainersDir(containerDir) ? 'containers' : 'components';
          writeRecord(join(RECORDS_DIR, outDir, `${name}.yaml`), record);
          cssOnlyCount++;
        }
        continue;
      }

      const cssContent = readFileSync(cssFile, 'utf8');
      const tagMatch = cssContent.match(/:where\((n-[\w-]+)\)/);
      const tagName = tagMatch ? tagMatch[1] : `n-${name}`;

      const record = buildCSSOnlyRecord(tagName, cssFile, dir);
      const outDir = isContainersDir(containerDir) ? 'containers' : 'components';
      writeRecord(join(RECORDS_DIR, outDir, `${name}.yaml`), record);
      cssOnlyCount++;
    }
  }

  // 4. Trait records
  for (const entry of readdirSync(TRAITS_DIR)) {
    const traitDir = join(TRAITS_DIR, entry);
    if (!statSync(traitDir).isDirectory()) continue;
    if (['__tests__', 'adapters', 'docs'].includes(entry)) continue;

    const controllerFile = readdirSync(traitDir).find(
      f => f.endsWith('-controller.ts') && !f.endsWith('.test.ts'),
    );
    if (!controllerFile) continue;

    const info = parseController(join(traitDir, controllerFile));
    if (!info) continue;

    const record = buildTraitRecord(info, traitDir);
    writeRecord(join(RECORDS_DIR, 'traits', `${entry}.yaml`), record);
    traitCount++;
  }

  // 5. Standalone controller records (src/controllers/*)
  if (existsSync(CONTROLLERS_DIR)) {
    for (const entry of readdirSync(CONTROLLERS_DIR)) {
      const ctrlDir = join(CONTROLLERS_DIR, entry);
      if (!statSync(ctrlDir).isDirectory()) continue;

      const controllerFile = readdirSync(ctrlDir).find(
        f => f.endsWith('-controller.ts') && !f.endsWith('.test.ts'),
      );
      if (!controllerFile) continue;

      const info = parseController(join(ctrlDir, controllerFile));
      if (!info) continue;

      const record = {
        controller: info.className,
        description: info.description || '',
        source: {
          controller: `src/controllers/${entry}/${controllerFile}`,
        },
      };

      if (info.optionsFields.length > 0) {
        record.options = {};
        for (const f of info.optionsFields) {
          record.options[f.name] = { type: f.type, description: f.description || '' };
        }
      }

      if (info.events.length > 0) {
        record.injected_events = {};
        for (const e of info.events) {
          record.injected_events[e.name] = { detail: e.detail };
        }
      }

      if (info.methods.length > 0) {
        record.methods = {};
        for (const m of info.methods) {
          record.methods[m.name] = { returns: m.returns };
        }
      }

      writeRecord(join(RECORDS_DIR, 'controllers', `${entry}.yaml`), record);
      controllerCount++;
    }
  }

  console.log(`Scaffolded: ${componentCount} components, ${cssOnlyCount} CSS-only, ${traitCount} traits, ${controllerCount} controllers`);
  console.log(`Total: ${componentCount + cssOnlyCount + traitCount + controllerCount} records in ${RECORDS_DIR}`);
}

main();
