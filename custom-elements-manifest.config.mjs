// WHY: The CEM analyzer doesn't understand our custom define() function in separate files.
// This plugin derives tag names from class names (UIButton → ui-button) and marks them
// as custom elements so Storybook, VS Code, and other tools can consume the manifest.
function nativeUIPlugin() {
  return {
    name: 'native-ui-tag-names',
    packageLinkPhase({ customElementsManifest }) {
      for (const mod of customElementsManifest.modules) {
        for (const decl of mod.declarations ?? []) {
          if (decl.kind !== 'class') continue;
          // Skip UIElement base class — it's abstract, not a registered custom element
          if (decl.name === 'UIElement') {
            decl.customElement = false;
            continue;
          }

          // Derive tag name: UIButton → ui-button, UIInputOtp → ui-input-otp
          const tag = decl.name
            .replace(/^UI/, '')
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
            .toLowerCase();
          const tagName = `ui-${tag}`;

          decl.customElement = true;
          decl.tagName = tagName;

          // Also add to module exports
          if (!mod.exports) mod.exports = [];
          const hasExport = mod.exports.some(e => e.name === 'custom-element-definition' && e.declaration?.name === decl.name);
          if (!hasExport) {
            mod.exports.push({
              kind: 'custom-element-definition',
              name: tagName,
              declaration: { name: decl.name, module: mod.path },
            });
          }
        }
      }
    },
  };
}

export default {
  globs: [
    'src/components/**/ui-*-element.ts',
    'src/containers/**/ui-*-element.ts',
    'src/icons/ui-icon-element.ts',
    'src/core/ui-element.ts',
  ],
  exclude: [
    'src/**/*.test.ts',
    'src/**/__tests__/**',
    'src/nav/**',
  ],
  outdir: 'dist',
  plugins: [nativeUIPlugin()],
};
