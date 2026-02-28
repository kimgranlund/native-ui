// Inspector entry point — all registrations inline to survive tree-shaking.
// Rolldown strips bare side-effect imports when the module graph provides
// the same bindings through other paths.  Keeping define() calls here
// guarantees they appear in dist/inspector.js.

import { define } from './core/define.ts';

// native-tokens-* sub-elements
import { NativeTokensVariable } from './inspector/native-tokens-variable-element.ts';
import { NativeTokensColors } from './inspector/native-tokens-colors-element.ts';
import { NativeTokensColorSwatch } from './inspector/native-tokens-color-swatch-element.ts';
import { NativeTokensThemes } from './inspector/native-tokens-themes-element.ts';
import { NativeTokensInspector } from './inspector/native-tokens-inspector-element.ts';

// Dogfooded ui-* components created via document.createElement by the
// inspector sub-elements (native-tokens-variable → ui-range, native-tokens-themes → ui-select,
// ui-select → ui-button + ui-icon + ui-listbox + ui-option).
import { UIRange } from './components/ui-range/ui-range-element.ts';
import { UISelect } from './components/ui-select/ui-select-element.ts';
import { UIButton } from './components/ui-button/ui-button-element.ts';
import { UIIcon } from './icons/ui-icon-element.ts';
import { UIListbox } from './components/ui-listbox/ui-listbox-element.ts';
import { UIOption } from './components/ui-listbox/ui-option-element.ts';

// Layout container for the inspector panel
import { UILayoutInspector } from './containers/ui-layout-inspector/ui-layout-inspector-element.ts';

import { buildInspector } from './inspector/build-inspector.ts';

// ── Register all elements ──
// define() is a no-op if the tag is already registered, so these are safe
// even when the consumer also imports @nonoun/native-ui/register.

define('native-tokens-variable', NativeTokensVariable);
define('native-tokens-colors', NativeTokensColors);
define('native-tokens-color-swatch', NativeTokensColorSwatch);
define('native-tokens-themes', NativeTokensThemes);
define('native-tokens-inspector', NativeTokensInspector);
define('ui-range', UIRange);
define('ui-select', UISelect);
define('ui-button', UIButton);
define('ui-icon', UIIcon);
define('ui-listbox', UIListbox);
define('ui-option', UIOption);
define('ui-layout-inspector', UILayoutInspector);

// ── Public API ──

export {
  NativeTokensVariable,
  NativeTokensColors,
  NativeTokensColorSwatch,
  NativeTokensThemes,
  NativeTokensInspector,
  UILayoutInspector,
  buildInspector,
};
export type { NativeTokensVariableData } from './inspector/native-tokens-variable-element.ts';
export type { NativeTokensColorEntry } from './inspector/native-tokens-colors-element.ts';
export type { NativeTokensThemeEntry } from './inspector/native-tokens-themes-element.ts';
