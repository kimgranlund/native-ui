// Registration side effects
import './nav/inspector/ds-variable.ts';
import './nav/inspector/ds-colors.ts';
import './nav/inspector/ds-color-swatch.ts';
import './nav/inspector/ds-themes.ts';

// Re-export public API
export {
  DSColorSwatch,
  DSColors,
  DSVariable,
  DSThemes,
  buildInspector,
} from './nav/inspector/index.ts';
export type { DSColorEntry, DSVariableData, DSThemeEntry } from './nav/inspector/index.ts';
