import { define } from '../../core/define.ts';
import { UIPagination } from './ui-pagination-element.ts';
// WHY: pagination stamps <ui-button> + <ui-icon> children, so ensure they're defined
import '../ui-button/ui-button.ts';
import '../../icons/ui-icon.ts';

define('ui-pagination', UIPagination);

export { UIPagination };
