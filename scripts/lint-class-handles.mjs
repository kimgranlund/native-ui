#!/usr/bin/env node

/**
 * lint-class-handles.mjs
 *
 * Detects redundant CSS class handles on custom elements (n-* / native-*).
 *
 * The rule: custom elements should be targeted by tag name in CSS, not by class.
 * Adding a CSS class to a custom element is redundant when the tag-name selector
 * already provides the hook. Use semantic attributes (data-role, etc.) or
 * structural position instead.
 *
 * Patterns detected:
 *   A) createElement('n-*') / createElement('native-*') → .className = '...'
 *   B) createElement('n-*') / createElement('native-*') → .classList.add('...')
 *   C) Template literals with <n-* class="..."> or <native-* class="...">
 *
 * Excluded:
 *   - Test files (*.test.ts)
 *   - HTML demo pages (*.html)
 *   - node_modules/, dist/
 *   - CodeMirror decoration classes (cm-*)
 *   - Dev navigation layout (src/nav/)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

// Directories to scan
const SCAN_DIRS = [
  join(ROOT, 'src'),
  ...getPackageSrcDirs(),
];

// Paths to skip entirely
const SKIP_PATTERNS = [
  /node_modules/,
  /\/dist\//,
  /\.test\.ts$/,
  /\.html$/,
  // Dev-only navigation layout — not production code
  /src\/nav\//,
];

// Class names that are allowed (not redundant handles).
const ALLOWED_CLASS_PATTERNS = [
  /^cm-/,  // CodeMirror decoration classes
];

/** Discover packages sub-directories (each package's src/ folder) */
function getPackageSrcDirs() {
  const packagesDir = join(ROOT, 'packages');
  try {
    return readdirSync(packagesDir)
      .map(name => join(packagesDir, name, 'src'))
      .filter(dir => {
        try { return statSync(dir).isDirectory(); }
        catch { return false; }
      });
  } catch {
    return [];
  }
}

/** Recursively collect .ts files */
function collectFiles(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return files; }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (entry.isFile() && extname(entry.name) === '.ts') {
      files.push(fullPath);
    }
  }
  return files;
}

/** Check if a path should be skipped */
function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

/** Check if a class name is in the allowed list */
function isAllowedClass(className) {
  return ALLOWED_CLASS_PATTERNS.some(pattern => pattern.test(className));
}

/** Custom element tag pattern */
const CE_TAG_RE = /^(?:n-|native-)[a-z0-9-]+$/;

/**
 * Scan a file for violations.
 *
 * Strategy:
 * 1. Track createElement('n-*'/'native-*') assignments → variable name + tag
 * 2. Within 10 lines, check for .className or .classList.add on that variable
 * 3. Also scan for <n-* class="..."> in template literals
 */
function scanFile(filePath, lines) {
  const violations = [];

  // ── Pattern A/B: createElement + className/classList ──

  // Match: const/let/var name = document.createElement('n-tag') or ('native-tag')
  const createRe = /(?:const|let|var)\s+(\w+)\s*=\s*document\.createElement\(\s*['"`]((?:n-|native-)[a-z0-9-]+)['"`]\s*\)/;

  // Match: varName.className = '...'
  const classNameRe = (varName) =>
    new RegExp(`\\b${escapeRegExp(varName)}\\.className\\s*=\\s*['"\`]([^'"\`]+)['"\`]`);

  // Match: varName.classList.add('...')
  const classListRe = (varName) =>
    new RegExp(`\\b${escapeRegExp(varName)}\\.classList\\.add\\(\\s*['"\`]([^'"\`]+)['"\`]`);

  for (let i = 0; i < lines.length; i++) {
    const match = createRe.exec(lines[i]);
    if (!match) continue;

    const varName = match[1];
    const tagName = match[2];
    const lookAhead = Math.min(i + 11, lines.length); // next 10 lines

    for (let j = i + 1; j < lookAhead; j++) {
      const line = lines[j];

      // Check className assignment
      const cnMatch = classNameRe(varName).exec(line);
      if (cnMatch) {
        const cls = cnMatch[1];
        if (!isAllowedClass(cls)) {
          violations.push({
            file: filePath,
            line: j + 1,
            tag: tagName,
            className: cls,
            type: 'className',
          });
        }
      }

      // Check classList.add
      const clMatch = classListRe(varName).exec(line);
      if (clMatch) {
        const cls = clMatch[1];
        if (!isAllowedClass(cls)) {
          violations.push({
            file: filePath,
            line: j + 1,
            tag: tagName,
            className: cls,
            type: 'classList.add',
          });
        }
      }
    }
  }

  // ── Pattern C: <n-* class="..."> in template literals ──

  const templateClassRe = /<((?:n-|native-)[a-z0-9-]+)\b[^>]*?\sclass\s*=\s*["']([^"']+)["']/g;

  for (let i = 0; i < lines.length; i++) {
    let m;
    while ((m = templateClassRe.exec(lines[i])) !== null) {
      const tagName = m[1];
      const cls = m[2];
      if (!isAllowedClass(cls)) {
        violations.push({
          file: filePath,
          line: i + 1,
          tag: tagName,
          className: cls,
          type: 'template class attribute',
        });
      }
    }
  }

  return violations;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Main ──

const allFiles = [];
for (const dir of SCAN_DIRS) {
  collectFiles(dir, allFiles);
}

const filesToScan = allFiles.filter(f => !shouldSkip(f));
const allViolations = [];

for (const filePath of filesToScan) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = scanFile(filePath, lines);
  allViolations.push(...violations);
}

if (allViolations.length === 0) {
  console.log('No redundant class handles found.');
  process.exit(0);
} else {
  for (const v of allViolations) {
    const rel = relative(ROOT, v.file);
    console.log(
      `VIOLATION: ${rel}:${v.line} — ${v.type} on custom element '${v.tag}' (class="${v.className}")`
    );
  }
  console.log(`\n${allViolations.length} violation(s) found.`);
  process.exit(1);
}
