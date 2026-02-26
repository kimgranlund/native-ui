import { define } from '../../core/define.ts';
import { UIListbox } from './ui-listbox-element.ts';
import { UIOption } from './ui-option-element.ts';
import { UIOptionGroup } from './ui-option-group-element.ts';

// WHY: Children registered FIRST so they upgrade before the parent's
// setup() queries them (e.g. querySelectorAll('ui-option'))
define('ui-option', UIOption);
define('ui-option-group', UIOptionGroup);
define('ui-listbox', UIListbox);

export { UIListbox, UIOption, UIOptionGroup };
