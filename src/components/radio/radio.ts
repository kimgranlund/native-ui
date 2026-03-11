import { define } from '@nonoun/native-core';
import { NRadio } from './radio-element.ts';
import { NRadioGroup } from './radio-group-element.ts';

// WHY: Children registered FIRST so they upgrade before parent's setup() queries them
define('n-radio', NRadio);
define('n-radio-group', NRadioGroup);

export { NRadio, NRadioGroup };
