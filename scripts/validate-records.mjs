// validate-records.mjs — Conformance checker: YAML records vs implementation.
// Usage: node scripts/validate-records.mjs

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RECORDS_DIR = join(ROOT, 'records');

let errors = 0;
let warnings = 0;

function error(msg) { console.error(`  ERROR: ${msg}`); errors++; }
function warn(msg) { console.warn(`  WARN:  ${msg}`); warnings++; }

function loadRecord(path) {
  return YAML.parse(readFileSync(path, 'utf8'));
}

function validateComponentRecord(recordPath) {
  const record = loadRecord(recordPath);
  const name = basename(recordPath, '.yaml');
  console.log(`Validating component: ${name}`);

  // 1. Check source files exist
  if (record.source) {
    for (const [key, path] of Object.entries(record.source)) {
      if (path && !existsSync(join(ROOT, path))) {
        error(`Source file not found: ${path} (${key})`);
      }
    }
  }

  // 2. If not CSS-only, check observedAttributes match YAML attributes
  if (!record.css_only && record.source?.element) {
    const elementPath = join(ROOT, record.source.element);
    if (existsSync(elementPath)) {
      const src = readFileSync(elementPath, 'utf8');
      const observedMatch = src.match(/static\s+(?:get\s+)?observedAttributes[^[]*\[([^\]]*)\]/);
      if (observedMatch) {
        const observed = observedMatch[1].match(/['"]([^'"]+)['"]/g)?.map(s => s.replace(/['"]/g, '')) || [];
        const yamlAttrs = Object.keys(record.attributes || {});
        for (const attr of observed) {
          if (!yamlAttrs.includes(attr)) {
            error(`observedAttribute "${attr}" in TS but missing from YAML attributes`);
          }
        }
      }
    }
  }

  // 3. Check CSS attributes match
  if (record.source?.css) {
    const cssPath = join(ROOT, record.source.css);
    if (existsSync(cssPath)) {
      const css = readFileSync(cssPath, 'utf8');
      const cssAttrs = new Set();
      const re = /\[([a-z][\w-]*)(?:=["']([^"']+)["'])?\]/g;
      const skip = new Set(['slot', 'popover', 'hidden', 'open', 'role', 'tabindex', 'contenteditable', 'draggable']);
      let m;
      while ((m = re.exec(css)) !== null) {
        if (!skip.has(m[1]) && !m[1].startsWith('aria-') && !m[1].startsWith('data-') && !m[1].startsWith('force-')) {
          cssAttrs.add(m[1]);
        }
      }
      const yamlCssAttrs = new Set(Object.keys(record.css_attributes || {}));
      const yamlJsAttrs = new Set(Object.keys(record.attributes || {}));
      for (const attr of cssAttrs) {
        if (!yamlCssAttrs.has(attr) && !yamlJsAttrs.has(attr)) {
          warn(`CSS attribute "${attr}" found in CSS but missing from YAML`);
        }
      }
    }
  }

  // 4. Check events
  if (record.source?.element) {
    const elementPath = join(ROOT, record.source.element);
    if (existsSync(elementPath)) {
      const src = readFileSync(elementPath, 'utf8');
      const eventRe = /new CustomEvent\(['"]([^'"]+)['"]/g;
      let m;
      const yamlEvents = new Set(Object.keys(record.events || {}));
      while ((m = eventRe.exec(src)) !== null) {
        if (!yamlEvents.has(m[1])) {
          warn(`Event "${m[1]}" dispatched in TS but missing from YAML events`);
        }
      }
    }
  }

  // 5. Warn on empty descriptions
  if (!record.description) warn('Empty component description');
  for (const [name, attr] of Object.entries(record.attributes || {})) {
    if (!attr.description) warn(`Empty description for attribute "${name}"`);
  }
  for (const [name, attr] of Object.entries(record.css_attributes || {})) {
    if (!attr.description) warn(`Empty description for CSS attribute "${name}"`);
  }
  for (const [name, slot] of Object.entries(record.slots || {})) {
    if (!slot.description) warn(`Empty description for slot "${name}"`);
  }
}

function validateTraitRecord(recordPath) {
  const record = loadRecord(recordPath);
  const name = basename(recordPath, '.yaml');
  console.log(`Validating trait: ${name}`);

  // Check source files
  if (record.source) {
    for (const [key, path] of Object.entries(record.source)) {
      if (path && !existsSync(join(ROOT, path))) {
        error(`Source file not found: ${path} (${key})`);
      }
    }
  }

  // Check events match
  if (record.source?.controller) {
    const ctrlPath = join(ROOT, record.source.controller);
    if (existsSync(ctrlPath)) {
      const src = readFileSync(ctrlPath, 'utf8');
      const eventRe = /new CustomEvent\(['"]([^'"]+)['"]/g;
      let m;
      const yamlEvents = new Set(Object.keys(record.injected_events || {}));
      while ((m = eventRe.exec(src)) !== null) {
        if (!yamlEvents.has(m[1])) {
          warn(`Event "${m[1]}" dispatched in controller but missing from YAML injected_events`);
        }
      }
    }
  }

  // Empty descriptions
  if (!record.description) warn('Empty trait description');
}

function validateControllerRecord(recordPath) {
  const record = loadRecord(recordPath);
  const name = basename(recordPath, '.yaml');
  console.log(`Validating controller: ${name}`);

  if (record.source?.controller && !existsSync(join(ROOT, record.source.controller))) {
    error(`Source file not found: ${record.source.controller}`);
  }
  if (!record.description) warn('Empty controller description');
}

// ── Main ──

function main() {
  console.log('Validating YAML records against implementation...\n');

  // Components
  const compDir = join(RECORDS_DIR, 'components');
  if (existsSync(compDir)) {
    for (const f of readdirSync(compDir).filter(f => f.endsWith('.yaml'))) {
      validateComponentRecord(join(compDir, f));
    }
  }

  // Containers
  const contDir = join(RECORDS_DIR, 'containers');
  if (existsSync(contDir)) {
    for (const f of readdirSync(contDir).filter(f => f.endsWith('.yaml'))) {
      validateComponentRecord(join(contDir, f));
    }
  }

  // Traits
  const traitDir = join(RECORDS_DIR, 'traits');
  if (existsSync(traitDir)) {
    for (const f of readdirSync(traitDir).filter(f => f.endsWith('.yaml'))) {
      validateTraitRecord(join(traitDir, f));
    }
  }

  // Controllers
  const ctrlDir = join(RECORDS_DIR, 'controllers');
  if (existsSync(ctrlDir)) {
    for (const f of readdirSync(ctrlDir).filter(f => f.endsWith('.yaml'))) {
      validateControllerRecord(join(ctrlDir, f));
    }
  }

  console.log(`\nResults: ${errors} errors, ${warnings} warnings`);
  process.exit(errors > 0 ? 1 : 0);
}

main();
