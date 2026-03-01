// WHY: The CEM analyzer doesn't understand our custom define() function in separate files.
// This plugin derives tag names from class names (NuiSidebar → nui-sidebar) and marks them
// as custom elements so Storybook, VS Code, and other tools can consume the manifest.
function nuiAppPlugin() {
  return {
    name: 'nui-app-tag-names',
    packageLinkPhase({ customElementsManifest }) {
      for (const mod of customElementsManifest.modules) {
        for (const decl of mod.declarations ?? []) {
          if (decl.kind !== 'class') continue;
          // Skip UIElement base class — it's abstract, not a registered custom element
          if (decl.name === 'UIElement') {
            decl.customElement = false;
            continue;
          }

          // Derive tag name: NuiSidebar → nui-sidebar, NuiAppPanel → nui-app-panel
          const tag = decl.name
            .replace(/^Nui/, '')
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
            .toLowerCase();
          const tagName = `nui-${tag}`;

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
    'src/**/*-element.ts',
  ],
  exclude: [
    'src/**/*.test.ts',
    'src/**/__tests__/**',
  ],
  outdir: 'dist',
  plugins: [nuiAppPlugin()],
};
