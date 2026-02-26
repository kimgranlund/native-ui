import { define } from '../../core/define.ts';
import { UIRadio } from './ui-radio-element.ts';
import { UIRadioGroup } from './ui-radio-group-element.ts';

// WHY: Children registered FIRST so they upgrade before parent's setup() queries them
define('ui-radio', UIRadio);
define('ui-radio-group', UIRadioGroup);

export { UIRadio, UIRadioGroup };
