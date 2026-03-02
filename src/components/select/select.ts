import { define } from '../../core/define.ts';
import { NSelect } from './select-element.ts';
// WHY: data-driven mode stamps <n-icon> for caret, so ensure it's defined
import '../../icons/icon.ts';

define('n-select', NSelect);

export { NSelect };
