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

// Dogfooded ui-* components created via document.createElement by the
// inspector sub-elements (ds-variable → ui-range, ds-themes → ui-combobox,
// ui-combobox → ui-input + ui-listbox + ui-option).
import { UIRange } from './components/ui-range/ui-range-element.ts';
import { UICombobox } from './components/ui-combobox/ui-combobox-element.ts';
import { UIInput } from './components/ui-input/ui-input-element.ts';
import { UIListbox } from './components/ui-listbox/ui-listbox-element.ts';
import { UIOption } from './components/ui-listbox/ui-option-element.ts';

import { buildInspector } from './nav/inspector/build-inspector.ts';

// ── Register all elements ──
// define() is a no-op if the tag is already registered, so these are safe
// even when the consumer also imports @nonoun/native-ui/register.

define('ds-variable', DSVariable);
define('ds-colors', DSColors);
define('ds-color-swatch', DSColorSwatch);
define('ds-themes', DSThemes);
define('ds-inspector', DSInspector);
define('ui-range', UIRange);
define('ui-combobox', UICombobox);
define('ui-input', UIInput);
define('ui-listbox', UIListbox);
define('ui-option', UIOption);

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
