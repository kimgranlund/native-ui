// Inspector entry point — all registrations inline to survive tree-shaking.
// Rolldown strips bare side-effect imports when the module graph provides
// the same bindings through other paths.  Keeping define() calls here
// guarantees they appear in dist/inspector.js.

import { define } from './core/define.ts';

// ds-* sub-elements
import { DSVariable } from './inspector/ds-variable-element.ts';
import { DSColors } from './inspector/ds-colors-element.ts';
import { DSColorSwatch } from './inspector/ds-color-swatch-element.ts';
import { DSThemes } from './inspector/ds-themes-element.ts';
import { DSInspector } from './inspector/ds-inspector-element.ts';

// Dogfooded ui-* components created via document.createElement by the
// inspector sub-elements (ds-variable → ui-range, ds-themes → ui-select,
// ui-select → ui-button + ui-icon + ui-listbox + ui-option).
import { UIRange } from './components/ui-range/ui-range-element.ts';
import { UISelect } from './components/ui-select/ui-select-element.ts';
import { UIButton } from './components/ui-button/ui-button-element.ts';
import { UIIcon } from './icons/ui-icon-element.ts';
import { UIListbox } from './components/ui-listbox/ui-listbox-element.ts';
import { UIOption } from './components/ui-listbox/ui-option-element.ts';

import { buildInspector } from './inspector/build-inspector.ts';

// ── Register all elements ──
// define() is a no-op if the tag is already registered, so these are safe
// even when the consumer also imports @nonoun/native-ui/register.

define('ds-variable', DSVariable);
define('ds-colors', DSColors);
define('ds-color-swatch', DSColorSwatch);
define('ds-themes', DSThemes);
define('ds-inspector', DSInspector);
define('ui-range', UIRange);
define('ui-select', UISelect);
define('ui-button', UIButton);
define('ui-icon', UIIcon);
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
export type { DSVariableData } from './inspector/ds-variable-element.ts';
export type { DSColorEntry } from './inspector/ds-colors-element.ts';
export type { DSThemeEntry } from './inspector/ds-themes-element.ts';
