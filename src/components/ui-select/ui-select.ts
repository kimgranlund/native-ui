import { define } from '../../core/define.ts';
import { UISelect } from './ui-select-element.ts';
// WHY: data-driven mode stamps <ui-icon> for caret, so ensure it's defined
import '../../icons/ui-icon.ts';

define('ui-select', UISelect);

export { UISelect };
