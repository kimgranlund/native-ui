#!/usr/bin/env node

// Concatenates CSS source files into dist bundles:
//   dist/colors.css       — OKLCH primitives, semantic tokens, themes
//   dist/layout.css       — reset, utilities, containers
//   dist/components.css   — component tokens, utilities, icons, all components
//   dist/foundation.css   — colors + layout + components (everything)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf-8');
}

// Resolve @import directives in a CSS file (one level deep).
// WHY: Layout/container CSS files use @import for Vite dev mode.
// The build script concatenates raw files, so we expand imports inline.
function readWithImports(rel) {
  const filePath = resolve(root, rel);
  const dir = dirname(filePath);
  let css = readFileSync(filePath, 'utf-8');
  css = css.replace(/@import\s+['"]([^'"]+)['"]\s*;/g, (_match, importPath) => {
    const absImport = resolve(dir, importPath);
    return readFileSync(absImport, 'utf-8');
  });
  return css;
}

// Colors CSS — OKLCH primitives, semantic tokens, themes
const colorFiles = [
  'src/styles/css/colors.computed.css',
  'src/styles/css/colors.semantic.css',
  'src/styles/css/colors.themes.css',
];

// Layout CSS — reset, utilities, containers
const layoutBaseFiles = [
  'src/styles/css/layout.reset.css',
];

// Component tokens & utilities — shared geometry, size scales, attribute selectors
const componentTokenFiles = [
  'src/styles/css/components.computed.css',
  'src/styles/css/components.tokens.css',
  'src/styles/css/components.utilities.css',
];

// Component CSS — auto-discovered via directory scan
// WHY: Auto-discovery prevents new components from being silently excluded from the
// build. All CSS uses :where() (zero specificity), so order only matters when two
// rules target the same element — icon primitives load first so component container
// query overrides win the source-order tiebreak.
function discoverCSS(dirs) {
  const results = [];
  for (const dir of dirs) {
    const abs = resolve(root, dir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs)) {
      const sub = resolve(abs, entry);
      if (!statSync(sub).isDirectory()) continue;
      for (const file of readdirSync(sub)) {
        if (file.endsWith('.css')) {
          results.push(`${dir}/${entry}/${file}`);
        }
      }
    }
  }
  return results.sort();
}

// Layout & container CSS — loads before individual component CSS so that
// component container-query overrides win the source-order tiebreak.
const layoutFiles = [
  'src/styles/css/layout.utilities.css',
  'src/styles/css/layout.containers.css',
];

const componentFiles = [
  // WHY: Icon CSS first — it's a primitive used by all components. Later component
  // container query rules (e.g. sidebar collapsed) need to override icon display,
  // and at equal :where() specificity source order is the tiebreaker.
  ...(existsSync(resolve(root, 'src/icons/icon.css')) ? ['src/icons/icon.css'] : []),
  ...discoverCSS(['src/components']),
  ...(existsSync(resolve(root, 'src/a2ui/a2ui.css')) ? ['src/a2ui/a2ui.css'] : []),
];

// WHY: Layout files use readWithImports because they @import container CSS files.
// Component files use plain read (no nested imports).
const componentsCSS = [
  ...componentTokenFiles.map(read),
  ...layoutFiles.map(readWithImports),
  ...componentFiles.map(read),
].join('\n');

// --- Assemble dist bundles ---

const layerDecl = '@layer colors, tokens, ui;\n\n';

const colorsCSS = layerDecl + colorFiles.map(read).join('\n');

const layoutCSS = [
  ...layoutBaseFiles.map(read),
  ...layoutFiles.map(readWithImports),
].join('\n');

const foundationCSS = colorsCSS + '\n' + layoutCSS + '\n' + componentsCSS;

// Write output
mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, 'colors.css'), colorsCSS);
writeFileSync(resolve(dist, 'layout.css'), layoutCSS);
writeFileSync(resolve(dist, 'components.css'), componentsCSS);
writeFileSync(resolve(dist, 'foundation.css'), foundationCSS);

const colorCount = colorFiles.length;
const layoutCount = layoutBaseFiles.length + layoutFiles.length;
const componentCount = componentTokenFiles.length + layoutFiles.length + componentFiles.length;

console.log('CSS build complete:');
console.log(`  dist/colors.css (${colorCount} files)`);
console.log(`  dist/layout.css (${layoutCount} files)`);
console.log(`  dist/components.css (${componentCount} files)`);
console.log('  dist/foundation.css (colors + layout + components)');
