// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');
const dist = resolve(root, 'dist');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));

describe('CSS dist bundles', () => {
  const expectedFiles = ['colors.css', 'layout.css', 'components.css', 'foundation.css'];

  for (const file of expectedFiles) {
    it(`dist/${file} exists`, () => {
      expect(existsSync(resolve(dist, file))).toBe(true);
    });
  }

  it('no stale CSS bundles in dist', () => {
    const stale = [
      'native-ui.css', 'native-ui-lean.css',
      'foundation-lean.css', 'components-lean.css',
    ];
    for (const file of stale) {
      expect(existsSync(resolve(dist, file)), `stale file: dist/${file}`).toBe(false);
    }
  });

  it('colors.css starts with @layer declaration', () => {
    const css = readFileSync(resolve(dist, 'colors.css'), 'utf-8');
    expect(css.startsWith('@layer colors, tokens, ui;')).toBe(true);
  });

  it('foundation.css contains colors + layout + components', () => {
    const foundation = readFileSync(resolve(dist, 'foundation.css'), 'utf-8');
    const colors = readFileSync(resolve(dist, 'colors.css'), 'utf-8');
    const layout = readFileSync(resolve(dist, 'layout.css'), 'utf-8');
    const components = readFileSync(resolve(dist, 'components.css'), 'utf-8');

    expect(foundation).toContain(colors);
    expect(foundation).toContain(layout);
    expect(foundation).toContain(components);
  });

  it('components.css includes auto-discovered component CSS', () => {
    const css = readFileSync(resolve(dist, 'components.css'), 'utf-8');
    expect(css).toContain(':where(n-button)');
    expect(css).toContain(':where(n-input)');
    expect(css).toContain(':where(n-select)');
  });
});

describe('package.json CSS exports', () => {
  const cssExports: Record<string, string> = {
    './css': './dist/foundation.css',
    './css/colors': './dist/colors.css',
    './css/layout': './dist/layout.css',
    './css/components': './dist/components.css',
    './css/foundation': './dist/foundation.css',
  };

  for (const [specifier, target] of Object.entries(cssExports)) {
    it(`"${specifier}" → ${target} exists`, () => {
      expect(pkg.exports[specifier]).toBe(target);
      expect(existsSync(resolve(root, target)), `${target} missing on disk`).toBe(true);
    });
  }

  it('no stale CSS exports', () => {
    const stale = ['./css/lean', './css/components-lean', './css/foundation-lean'];
    for (const key of stale) {
      expect(pkg.exports[key], `stale export: ${key}`).toBeUndefined();
    }
  });
});
