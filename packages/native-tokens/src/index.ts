// native-tokens entry point — all registrations inline to survive tree-shaking.
// Keeping define() calls here guarantees they appear in dist/native-tokens.js.

import { define, NRange, NSelect, NButton, NIcon, NListbox, NOption, registerIcon } from '@nonoun/native-ui';

// native-tokens-* sub-elements
import { NTokensVariable } from './tokens-variable-element.ts';
import { NTokensColors } from './tokens-colors-element.ts';
import { NTokensColorSwatch } from './tokens-color-swatch-element.ts';
import { NTokensThemes } from './tokens-themes-element.ts';
import { NTokens } from './tokens-element.ts';
import { NTokensPanel } from './tokens-panel-element.ts';

import { buildTokens, createDefaultSchema, themes, families, familyFilterOptions } from './build-tokens.ts';

// ── Register all elements ──
// define() is a no-op if the tag is already registered, so these are safe
// even when the consumer also imports @nonoun/native-ui/register.

define('native-tokens', NTokens);
define('native-tokens-variable', NTokensVariable);
define('native-tokens-colors', NTokensColors);
define('native-tokens-color-swatch', NTokensColorSwatch);
define('native-tokens-themes', NTokensThemes);
define('native-tokens-panel', NTokensPanel);

// Dogfooded n-* components created via document.createElement
define('n-range', NRange);
define('n-select', NSelect);
define('n-button', NButton);
define('n-icon', NIcon);
define('n-listbox', NListbox);
define('n-option', NOption);

// Icons used in the inspector header
registerIcon('palette', '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M200.77,53.89A103.27,103.27,0,0,0,128,24h-1.07A104,104,0,0,0,24,128c0,43,26.58,79.06,69.36,94.17A32,32,0,0,0,136,192a16,16,0,0,1,16-16h46.21a31.81,31.81,0,0,0,31.2-24.88,104.43,104.43,0,0,0,2.59-24A103.28,103.28,0,0,0,200.77,53.89Zm13,93.71A15.89,15.89,0,0,1,198.21,160H152a32,32,0,0,0-32,32,16,16,0,0,1-21.31,15.07C62.49,194.3,40,164,40,128a88,88,0,0,1,87.09-88h.9a88.35,88.35,0,0,1,88,87.25A88.86,88.86,0,0,1,213.81,147.6ZM140,76a12,12,0,1,1-12-12A12,12,0,0,1,140,76ZM96,100A12,12,0,1,1,84,88,12,12,0,0,1,96,100Zm0,56a12,12,0,1,1-12-12A12,12,0,0,1,96,156Zm88-56a12,12,0,1,1-12-12A12,12,0,0,1,184,100Z"/></svg>');

// ── Public API ──

export {
  NTokens,
  NTokensPanel,
  NTokensVariable,
  NTokensColors,
  NTokensColorSwatch,
  NTokensThemes,
  buildTokens,
  createDefaultSchema,
  themes,
  families,
  familyFilterOptions,
};
export type { TokenSchema, TokenSection, TokenSectionItem, TokenVariable, TokenStrip } from './build-tokens.ts';
export type { NTokensVariableData } from './tokens-variable-element.ts';
export type { NTokensColorEntry } from './tokens-colors-element.ts';
export type { NTokensThemeEntry } from './tokens-themes-element.ts';
