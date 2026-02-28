// Inspector entry point — all registrations inline to survive tree-shaking.
// Rolldown strips bare side-effect imports when the module graph provides
// the same bindings through other paths.  Keeping define() calls here
// guarantees they appear in dist/inspector.js.

import { define } from './core/define.ts';

// ds-* sub-elements
import { DSVariable } from './nav/inspector/ds-variable-element.ts';
import { DSColors } from './nav/inspector/ds-colors-element.ts';
import { DSColorSwatch } from './nav/inspector/ds-color-swatch-element.ts';
import { DSThemes } from './nav/inspector/ds-themes-element.ts';
import { DSInspector } from './nav/inspector/ds-inspector-element.ts';

import { buildInspector } from './nav/inspector/build-inspector.ts';

// ── Register ds-* elements ──
// Dogfooded ui-* components (ui-range, ui-combobox, ui-input, ui-listbox,
// ui-option) are expected to be registered by the consumer via the main
// library import.  Only ds-* elements live here.

define('ds-variable', DSVariable);
define('ds-colors', DSColors);
define('ds-color-swatch', DSColorSwatch);
define('ds-themes', DSThemes);
define('ds-inspector', DSInspector);

// ── Public API ──

export {
  DSVariable,
  DSColors,
  DSColorSwatch,
  DSThemes,
  DSInspector,
  buildInspector,
};
export type { DSVariableData } from './nav/inspector/ds-variable-element.ts';
export type { DSColorEntry } from './nav/inspector/ds-colors-element.ts';
export type { DSThemeEntry } from './nav/inspector/ds-themes-element.ts';
