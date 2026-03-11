import { define } from '@nonoun/native-core';
import { NListbox } from './listbox-element.ts';
import { NOption } from './option-element.ts';
import { NOptionGroup } from './option-group-element.ts';

// WHY: Children registered FIRST so they upgrade before the parent's
// setup() queries them (e.g. querySelectorAll('n-option'))
define('n-option', NOption);
define('n-option-group', NOptionGroup);
define('n-listbox', NListbox);

export { NListbox, NOption, NOptionGroup };
