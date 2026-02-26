// Side-effect module: registers all traits when imported.
// Must be imported BEFORE any component registration modules.
import { registerAllTraits } from './traits/register-all.ts';
registerAllTraits();
