// nui-tokens entry point — all registrations inline to survive tree-shaking.
// Keeping define() calls here guarantees they appear in dist/nui-tokens.js.

import { define, UIRange, UISelect, UIButton, UIIcon, UIListbox, UIOption } from '@nonoun/native-ui';

// nui-tokens-* sub-elements
import { NuiTokensVariable } from './nui-tokens-variable-element.ts';
import { NuiTokensColors } from './nui-tokens-colors-element.ts';
import { NuiTokensColorSwatch } from './nui-tokens-color-swatch-element.ts';
import { NuiTokensThemes } from './nui-tokens-themes-element.ts';
import { NuiTokens } from './nui-tokens-element.ts';

import { buildTokens } from './build-tokens.ts';

// ── Register all elements ──
// define() is a no-op if the tag is already registered, so these are safe
// even when the consumer also imports @nonoun/native-ui/register.

define('nui-tokens', NuiTokens);
define('nui-tokens-variable', NuiTokensVariable);
define('nui-tokens-colors', NuiTokensColors);
define('nui-tokens-color-swatch', NuiTokensColorSwatch);
define('nui-tokens-themes', NuiTokensThemes);

// Dogfooded ui-* components created via document.createElement
define('ui-range', UIRange);
define('ui-select', UISelect);
define('ui-button', UIButton);
define('ui-icon', UIIcon);
define('ui-listbox', UIListbox);
define('ui-option', UIOption);

// ── Public API ──

export {
  NuiTokens,
  NuiTokensVariable,
  NuiTokensColors,
  NuiTokensColorSwatch,
  NuiTokensThemes,
  buildTokens,
};
export type { NuiTokensVariableData } from './nui-tokens-variable-element.ts';
export type { NuiTokensColorEntry } from './nui-tokens-colors-element.ts';
export type { NuiTokensThemeEntry } from './nui-tokens-themes-element.ts';
