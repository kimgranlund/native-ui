#!/usr/bin/env node

// Concatenates CSS source files into dist bundles:
//   dist/foundation.css  — colors, tokens, themes, base, primitives
//   dist/components.css   — all component styles
//   dist/native-ui.css    — foundation + components (convenience)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf-8');
}

// Foundation CSS — ORDER MATTERS (cascade: colors → tokens → themes → base → primitives)
const foundationFiles = [
  'src/styles/colors.primitives.css',
  'src/styles/colors.tokens.css',
  'src/styles/themes.css',
  'src/styles/ui.base.css',
  'src/styles/ui.primitives.css',
];

const foundationCSS =
  '@layer colors, tokens, ui;\n\n' +
  foundationFiles.map(read).join('\n');

// Component CSS — auto-discovered via directory scan
// WHY: All component/container CSS uses :where() (zero specificity), so order between
// files doesn't affect cascade. Auto-discovery prevents new components from being
// silently excluded from the build.
function discoverCSS(dirs) {
  const results = [];
  for (const dir of dirs) {
    const abs = resolve(root, dir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs)) {
      const sub = resolve(abs, entry);
      if (!statSync(sub).isDirectory()) continue;
      for (const file of readdirSync(sub)) {
        if (file.endsWith('.css') && file.startsWith('ui-')) {
          results.push(`${dir}/${entry}/${file}`);
        }
      }
    }
  }
  return results.sort();
}

const componentFiles = [
  ...discoverCSS(['src/components', 'src/containers']),
  // These live outside the standard ui-*/ui-*.css pattern
  ...(existsSync(resolve(root, 'src/icons/ui-icon.css')) ? ['src/icons/ui-icon.css'] : []),
  ...(existsSync(resolve(root, 'src/a2ui/a2ui.css')) ? ['src/a2ui/a2ui.css'] : []),
];

const componentsCSS = componentFiles.map(read).join('\n');

// Strip force-* debug selector lines from CSS to produce lean output.
// WHY: force-hover, force-active, force-focus, force-focus-visible are dev-only
// attribute selectors for state debugging. They always appear as comma-separated
// alternatives (e.g. `:where(ui-button):hover,\n:where(ui-button)[force-hover]`).
// Stripping the force-* line and its trailing/leading comma produces valid CSS.
function stripDebugSelectors(css) {
  // Match lines containing [force-*] that are selector alternatives.
  // Pattern: optional leading comma + line with [force-...] + optional trailing comma
  // Handles both "selector,\n  force-line {" and "selector,\n  force-line," patterns.
  return css.replace(/,\s*\n\s*[^\n]*\[force-[^\]]*\][^\n{]*/g, '');
}

const leanComponentsCSS = stripDebugSelectors(componentsCSS);
const debugSaved = componentsCSS.length - leanComponentsCSS.length;

// Write output
mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, 'foundation.css'), foundationCSS);
writeFileSync(resolve(dist, 'components.css'), componentsCSS);
writeFileSync(resolve(dist, 'native-ui.css'), foundationCSS + '\n' + componentsCSS);
writeFileSync(resolve(dist, 'components-lean.css'), leanComponentsCSS);
writeFileSync(resolve(dist, 'native-ui-lean.css'), foundationCSS + '\n' + leanComponentsCSS);

// Inspector CSS — separate opt-in bundle
const inspectorFile = 'src/nav/inspector/ds-inspector.css';
if (existsSync(resolve(root, inspectorFile))) {
  writeFileSync(resolve(dist, 'inspector.css'), read(inspectorFile));
}

console.log('CSS build complete:');
console.log(`  dist/foundation.css (${foundationFiles.length} files)`);
console.log(`  dist/components.css (${componentFiles.length} files)`);
console.log('  dist/native-ui.css');
console.log(`  dist/components-lean.css (${debugSaved} bytes of force-* selectors stripped)`);
console.log('  dist/native-ui-lean.css');
console.log('  dist/inspector.css');
