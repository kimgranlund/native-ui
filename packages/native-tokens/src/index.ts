// native-tokens entry point — all registrations inline to survive tree-shaking.
// Keeping define() calls here guarantees they appear in dist/native-tokens.js.

import { define, NRange, NSelect, NButton, NIcon, NListbox, NOption } from '@nonoun/native-ui';

// native-tokens-* sub-elements
import { NTokensVariable } from './tokens-variable-element.ts';
import { NTokensColors } from './tokens-colors-element.ts';
import { NTokensColorSwatch } from './tokens-color-swatch-element.ts';
import { NTokensThemes } from './tokens-themes-element.ts';
import { NTokens } from './tokens-element.ts';

import { buildTokens } from './build-tokens.ts';

// ── Register all elements ──
// define() is a no-op if the tag is already registered, so these are safe
// even when the consumer also imports @nonoun/native-ui/register.

define('native-tokens', NTokens);
define('native-tokens-variable', NTokensVariable);
define('native-tokens-colors', NTokensColors);
define('native-tokens-color-swatch', NTokensColorSwatch);
define('native-tokens-themes', NTokensThemes);

// Dogfooded n-* components created via document.createElement
define('n-range', NRange);
define('n-select', NSelect);
define('n-button', NButton);
define('n-icon', NIcon);
define('n-listbox', NListbox);
define('n-option', NOption);

// ── Public API ──

export {
  NTokens,
  NTokensVariable,
  NTokensColors,
  NTokensColorSwatch,
  NTokensThemes,
  buildTokens,
};
export type { NTokensVariableData } from './tokens-variable-element.ts';
export type { NTokensColorEntry } from './tokens-colors-element.ts';
export type { NTokensThemeEntry } from './tokens-themes-element.ts';
