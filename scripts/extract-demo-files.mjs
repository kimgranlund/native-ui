// extract-demo-files.mjs — Extracts inline <style> and <script> blocks from demo HTML pages
// into external .demo.css and .demo.ts files. Run once.
// Usage: node scripts/extract-demo-files.mjs [--dry-run]

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, basename, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const DRY_RUN = process.argv.includes('--dry-run');

// ── Find all demo HTML files ──

function findHtmlFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== '__tests__') {
      results.push(...findHtmlFiles(full));
    } else if (entry.endsWith('.html') && !entry.startsWith('index')) {
      results.push(full);
    }
  }
  return results;
}

const DEMO_DIRS = [
  join(SRC, 'components'),
  join(SRC, 'traits'),
  join(SRC, 'containers'),
  join(SRC, 'icons'),
];

const htmlFiles = DEMO_DIRS.flatMap((d) => (existsSync(d) ? findHtmlFiles(d) : []));

// ── Copy-button handler removal ──
// Instead of fragile regex, find the block by markers and structure

function removeCopyHandler(code) {
  const lines = code.split('\n');
  const result = [];
  let inCopyBlock = false;
  let braceDepth = 0;
  let blockStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect start: comment header "Copy buttons" or `for (const btn of document.querySelectorAll('.copy-btn'))`
    if (!inCopyBlock) {
      if (trimmed.match(/^\/\/\s*──\s*Copy\s*buttons?\s*──/)) {
        // Check if next non-empty line is the for loop
        let nextIdx = i + 1;
        while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx++;
        if (nextIdx < lines.length && lines[nextIdx].includes('.copy-btn')) {
          inCopyBlock = true;
          braceDepth = 0;
          blockStartIndex = i;
          continue;
        }
      }
      if (!inCopyBlock && trimmed.includes('.copy-btn') && trimmed.startsWith('for')) {
        inCopyBlock = true;
        braceDepth = 0;
        blockStartIndex = i;
      }
    }

    if (inCopyBlock) {
      // Count braces to find end of block
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth <= 0 && blockStartIndex !== i) {
        inCopyBlock = false;
        continue; // Skip this closing line too
      }
      continue; // Skip lines inside the block
    }

    result.push(line);
  }
  return result.join('\n');
}

// ── Dedent: remove common leading whitespace from extracted code ──

function dedent(code) {
  const lines = code.split('\n');
  // Find minimum indentation (ignoring empty lines)
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const indent = line.match(/^(\s*)/)[1].length;
    if (indent < minIndent) minIndent = indent;
  }
  if (minIndent === 0 || minIndent === Infinity) return code;
  return lines.map((line) => line.slice(minIndent)).join('\n');
}

// ── Compute relative path from demo file to nav/demo-copy.ts ──

function relativeCopyImport(htmlPath) {
  const dir = dirname(htmlPath);
  const navDir = join(SRC, 'nav');
  let rel = relative(dir, navDir).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return `${rel}/demo-copy.ts`;
}

// ── Extract ──

let stats = { processed: 0, cssExtracted: 0, jsExtracted: 0, skipped: 0 };

for (const htmlPath of htmlFiles) {
  const html = readFileSync(htmlPath, 'utf-8');
  const dir = dirname(htmlPath);
  const htmlName = basename(htmlPath, '.html');
  const relPath = relative(ROOT, htmlPath);

  let modified = html;
  let cssWritten = false;
  let jsWritten = false;

  // ── 1. Extract <style> blocks ──

  const styleRegex = /<style>([\s\S]*?)<\/style>/g;
  const styleMatches = [...html.matchAll(styleRegex)];

  if (styleMatches.length > 0) {
    let allCSS = styleMatches.map((m) => dedent(m[1]).trim()).join('\n\n');

    if (allCSS.length > 0) {
      const cssFile = `${htmlName}.demo.css`;
      const cssPath = join(dir, cssFile);

      if (!DRY_RUN) {
        writeFileSync(cssPath, allCSS + '\n');
      }

      // Replace all <style> blocks with a single <link>
      let firstReplaced = false;
      modified = modified.replace(styleRegex, () => {
        if (!firstReplaced) {
          firstReplaced = true;
          return `<link rel="stylesheet" href="./${cssFile}" />`;
        }
        return ''; // Remove additional <style> blocks
      });

      cssWritten = true;
      stats.cssExtracted++;
    }
  }

  // ── 2. Extract <script type="module"> blocks ──

  const scriptRegex = /<script type="module">([\s\S]*?)<\/script>/g;
  const scriptMatches = [...html.matchAll(scriptRegex)];

  if (scriptMatches.length === 0) {
    stats.skipped++;
    continue;
  }

  // Determine if this is a trait page (has registerAllTraits in first script)
  const isTraitPage = scriptMatches.length >= 2 &&
    scriptMatches[0][1].includes('registerAllTraits');

  // For trait pages: keep first script inline, extract last script
  // For regular pages: extract the last (usually only) script
  const scriptToExtract = scriptMatches[scriptMatches.length - 1];
  let scriptContent = scriptToExtract[1];

  // Remove copy handler and add import
  const hasCopyHandler = scriptContent.includes('.copy-btn');
  scriptContent = removeCopyHandler(scriptContent);

  // Build the .demo.ts content
  const copyImportPath = relativeCopyImport(htmlPath);
  let tsContent = dedent(scriptContent).trim();

  // Add copy handler import at the end (after all other code)
  if (hasCopyHandler) {
    tsContent += `\n\nimport { initCopyButtons } from '${copyImportPath}';\ninitCopyButtons();\n`;
  } else {
    tsContent += '\n';
  }

  // Clean up excessive blank lines
  tsContent = tsContent.replace(/\n{3,}/g, '\n\n').trim() + '\n';

  const tsFile = `${htmlName}.demo.ts`;
  const tsPath = join(dir, tsFile);

  if (!DRY_RUN) {
    writeFileSync(tsPath, tsContent);
  }

  // Replace the extracted script in HTML
  if (isTraitPage) {
    // Keep first script, replace last script with src reference
    let scriptIndex = 0;
    modified = modified.replace(scriptRegex, (match, content) => {
      scriptIndex++;
      if (scriptIndex === scriptMatches.length) {
        // Last script — replace with external reference
        return `<script type="module" src="./${tsFile}"></script>`;
      }
      return match; // Keep other scripts (including first registerAllTraits)
    });
  } else {
    // Single script page — replace all scripts with one external reference
    let firstReplaced = false;
    modified = modified.replace(scriptRegex, () => {
      if (!firstReplaced) {
        firstReplaced = true;
        return `<script type="module" src="./${tsFile}"></script>`;
      }
      return '';
    });
  }

  // Clean up blank lines left by removals
  modified = modified.replace(/\n{3,}/g, '\n\n');

  if (!DRY_RUN) {
    writeFileSync(htmlPath, modified);
  }

  jsWritten = true;
  stats.jsExtracted++;
  stats.processed++;

  const label = [
    jsWritten ? 'JS' : '',
    cssWritten ? 'CSS' : '',
  ].filter(Boolean).join('+');

  if (DRY_RUN) {
    console.log(`[dry-run] ${relPath} → ${label}`);
  }
}

console.log(`\nExtraction complete${DRY_RUN ? ' (dry run)' : ''}:`);
console.log(`  Processed: ${stats.processed} pages`);
console.log(`  JS extracted: ${stats.jsExtracted} .demo.ts files`);
console.log(`  CSS extracted: ${stats.cssExtracted} .demo.css files`);
console.log(`  Skipped: ${stats.skipped} (no scripts)`);
